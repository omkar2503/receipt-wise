"use client"

import type React from "react"

import { useState, useEffect, useCallback, Suspense } from "react"
import {
  Upload,
  Loader2,
  AlertCircle,
  Save,
  Users,
  Info,
  CheckCircle2,
  UserPlus,
  SplitSquareVertical,
  HelpCircle,
  X,
  ImageIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import Image from "next/image"
import { ThemeToggle } from "../components/theme-toggle"
import { ImagePreviewModal } from "../components/image-preview-modal"
import { EmptyState } from "../components/empty-state"
import { ErrorBoundary } from "../components/error-boundary"
import { ProductCard } from "../components/product-card"
import { BillSummary } from "../components/bill-summary"
import { EditableTotal } from "../components/editable-total"
import { AssignmentSummary } from "../components/assignment-summary"

// Updated interface for user assignments with share percentages
interface UserShare {
  userId: string
  percentage: number
}

// Type for our product items
interface Product {
  id: string
  name: string
  price: string
  image: string
  shares: UserShare[] // Array of user shares instead of just IDs
}

interface User {
  id: string
  name: string
  color: string
}

interface TaxInfo {
  rate: number
  amount: string
}

// Revert the interface definitions back to original
interface UserSplit {
  id: string | number
  name: string
  paid: number
  owed: number
}

interface ExpenseRequest {
  description: string
  payer: string | number
  totalAmount: number
  tax: number
  userSplits: UserSplit[]
  groupId: string
  receiptPath: string
  details: string
}

interface Group {
  id: number | string
  name: string
}

// Interface for uploaded image
interface UploadedImage {
  file: File
  previewUrl: string
}

// Loading fallback component
function LoadingFallback() {
  return (
    <div className="flex flex-col items-center justify-center h-40 bg-muted/10 rounded-lg">
      <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
      <p className="text-muted-foreground">Loading...</p>
    </div>
  )
}

// Default groups to use as fallback (excluding Non-group expenses)
const DEFAULT_GROUPS: Record<string, Group> = {
  "35": { id: "35", name: "Group #35" },
  "47": { id: "47", name: "Group #47" },
  "59664013": { id: "59664013", name: "9535K UT" },
  "76698661": { id: "76698661", name: "9547 M" },
}

function ImageUploadSearch() {
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [error, setError] = useState<string | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [selectedGroup, setSelectedGroup] = useState<string>("35")
  const [editingShares, setEditingShares] = useState<string | null>(null)
  const [payer, setPayer] = useState<string | null>(null)
  const [taxInfo, setTaxInfo] = useState<TaxInfo | null>(null)
  const [subtotal, setSubtotal] = useState<string | null>(null)
  const [total, setTotal] = useState<string | null>(null)
  const [expenseDescription, setExpenseDescription] = useState<string>("")
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null)
  const [primaryReceiptPath, setPrimaryReceiptPath] = useState<string | null>(null)
  const [allReceiptPaths, setAllReceiptPaths] = useState<string[]>([])
  const [showImagePreview, setShowImagePreview] = useState(false)
  const [previewImageIndex, setPreviewImageIndex] = useState(0)
  const [showHelp, setShowHelp] = useState(false)
  const [groups, setGroups] = useState<Record<string, Group>>(DEFAULT_GROUPS)
  const [isLoadingGroups, setIsLoadingGroups] = useState(false)
  const [isLoadingMembers, setIsLoadingMembers] = useState(false)

  // Function to filter out "Non-group expenses" from groups
  const filterGroups = useCallback((groupsData: Record<string, Group>) => {
    const filtered: Record<string, Group> = {}

    Object.values(groupsData).forEach((group) => {
      // Exclude groups with "Non-group expenses" name or id "0"
      if (group.name.toLowerCase() !== "non-group expenses" && group.id !== 0 && group.id !== "0") {
        filtered[group.id.toString()] = group
      }
    })

    return filtered
  }, [])

  // Check if all products are fully assigned and all shares total 100%
  const isFullyAssigned = useCallback(() => {
    try {
      // If there are no products, return false
      if (!products || products.length === 0) return false

      // Check if any product has no shares assigned
      const hasUnassignedProducts = products.some((product) => !product.shares || product.shares.length === 0)
      if (hasUnassignedProducts) return false

      // Check if all products have shares totaling 100%
      const allSharesComplete = products.every((product) => {
        if (!product.shares) return false
        const totalPercentage = getTotalPercentage(product)
        return Math.abs(totalPercentage - 100) < 0.01 // Allow for small floating point errors
      })

      return allSharesComplete
    } catch (error) {
      console.error("Error checking if fully assigned:", error)
      return false
    }
  }, [products])

  // Calculate the overall assignment progress
  const getAssignmentProgress = useCallback(() => {
    try {
      if (!products || products.length === 0) return 0

      // Count products with 100% assignment
      const fullyAssignedCount = products.filter((product) => {
        if (!product.shares) return false
        const totalPercentage = getTotalPercentage(product)
        return Math.abs(totalPercentage - 100) < 0.01 && product.shares.length > 0
      }).length

      return (fullyAssignedCount / products.length) * 100
    } catch (error) {
      console.error("Error calculating assignment progress:", error)
      return 0
    }
  }, [products])

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const files = e.target.files
      if (!files || files.length === 0) return

      // Check if files are images and create preview URLs
      const newImages: UploadedImage[] = []

      for (let i = 0; i < files.length; i++) {
        const file = files[i]

        // Check if file is an image
        if (!file.type.startsWith("image/")) {
          setError("Please select only image files")
          return
        }

        // Create a preview URL
        const previewUrl = URL.createObjectURL(file)
        newImages.push({ file, previewUrl })
      }

      // Reset states if this is a new upload
      if (newImages.length > 0) {
        setError(null)
        setSaveSuccess(null)
      }

      // Add new images to existing ones
      setUploadedImages((prev) => [...prev, ...newImages])

      // Reset the file input to allow selecting the same files again
      e.target.value = ""
    } catch (error) {
      console.error("Error handling file change:", error)
      setError("An error occurred while processing the selected files")
    }
  }

  // Remove an image from the uploaded images
  const removeImage = (index: number) => {
    setUploadedImages((prev) => {
      const newImages = [...prev]
      // Revoke the object URL to avoid memory leaks
      URL.revokeObjectURL(newImages[index].previewUrl)
      newImages.splice(index, 1)
      return newImages
    })
  }

  // Open image preview modal
  const openImagePreview = (index: number) => {
    setPreviewImageIndex(index)
    setShowImagePreview(true)
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (uploadedImages.length === 0) {
      setError("Please select at least one image first")
      return
    }

    setIsLoading(true)
    setError(null)
    setSaveSuccess(null) // Reset success message when starting a new search
    setProducts([])

    try {
      // Create FormData with all images
      const formData = new FormData()

      // Add all files to the FormData
      uploadedImages.forEach((img, index) => {
        formData.append(`files`, img.file)
      })

      // Add group ID
      formData.append("groupId", selectedGroup)

      const response = await fetch("/api/search-products", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch products: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()

      if (data.success) {
        // Don't override users from the group members API
        // The users should already be set from the group selection
        // Only update if no users are currently set
        if (!users || users.length === 0) {
          setUsers(data.users || [])
          
          // Set default payer to the first user if not already set
          if (!payer && data.users && data.users.length > 0) {
            setPayer(data.users[0].id)
          }
        }

        // Update products with empty shares
        setProducts(
          (data.products || []).map((product: any) => ({
            ...product,
            shares: [], // Initialize as empty array
          })),
        )

        // Set tax information
        if (data.tax) {
          setTaxInfo(data.tax)
        }

        // Set subtotal and total
        setSubtotal(data.subtotal)
        setTotal(data.total)

        // Store receipt paths
        setPrimaryReceiptPath(data.primaryReceiptPath || "")
        setAllReceiptPaths(data.allReceiptPaths || [])
      } else {
        throw new Error(data.error || "Unknown error")
      }
    } catch (err) {
      console.error("Error processing images:", err)
      setError(`An error occurred while processing your images: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Reset the form
  const resetForm = useCallback(() => {
    // Revoke all object URLs to avoid memory leaks
    uploadedImages.forEach((img) => URL.revokeObjectURL(img.previewUrl))

    // Reset all state variables
    setUploadedImages([])
    setProducts([])
    setError(null)
    // Don't reset saveSuccess here
    // setSaveSuccess(null)
    setEditingShares(null)
    setPrimaryReceiptPath(null)
    setAllReceiptPaths([])
    setSubtotal(null)
    setTotal(null)
    setTaxInfo(null)
    setExpenseDescription("")
    // Keep users and payer for convenience
  }, [uploadedImages])

  // Recalculate subtotal from assigned items
  const recalculateSubtotalFromItems = useCallback(() => {
    try {
      const assignedTotal = products.reduce((total, product) => {
        const price = Number.parseFloat(product.price.replace("$", "")) || 0

        // Only count items that are assigned (have shares)
        if (product.shares.length > 0) {
          return total + price
        }

        return total
      }, 0)

      // Update subtotal
      setSubtotal(assignedTotal.toFixed(2))

      // Recalculate tax and total
      if (taxInfo) {
        const newTaxAmount = assignedTotal * taxInfo.rate
        const newTotal = assignedTotal + newTaxAmount

        setTaxInfo({
          ...taxInfo,
          amount: newTaxAmount.toFixed(2),
        })
        setTotal(newTotal.toFixed(2))
      }
    } catch (error) {
      console.error("Error recalculating subtotal from items:", error)
      setError("An error occurred while recalculating the subtotal")
    }
  }, [products, taxInfo])

  // Create expense
  const createExpense = async () => {
    // Check for required information with specific error messages
    if (!payer) {
      setError("Missing required information: No payer selected")
      return
    }

    if (!taxInfo) {
      setError("Missing required information: Tax information not available")
      return
    }

    if (!subtotal || !total) {
      setError("Missing required information: Subtotal or total amount not available")
      return
    }

    if (!expenseDescription.trim()) {
      setError("Please enter an expense description")
      return
    }

    if (!isFullyAssigned()) {
      setError("All items must be fully assigned with shares totaling 100%")
      return
    }

    setIsSaving(true)
    setError(null)
    setSaveSuccess(null)

    try {
      // Create userSplits array
      const userSplits: UserSplit[] = []

      // Add all users to the userSplits array
      users.forEach((user) => {
        try {
          const userTotal = getUserTotal(user.id)

          // Format the user split - payer can have owed amount too
          userSplits.push({
            id: user.id,
            name: user.name,
            // Payer paid the total amount
            paid: user.id === payer ? Number(Number.parseFloat(total || "0").toFixed(2)) : 0,
            // Everyone has their calculated owed amount, including the payer
            owed: Number(userTotal.toFixed(2)),
          })
        } catch (error) {
          console.error(`Error calculating split for user ${user.id}:`, error)
        }
      })

      // Generate split details for all items
      const splitDetails = products
        .map((product) => {
          if (product.shares.length === 0) {
            return `'${product.name}' - "unassigned"`
          }

          // Get user names for this product's shares
          const assignedUsers = product.shares
            .map((share) => {
              const user = users.find((u) => u.id === share.userId)
              return user ? user.name : "Unknown User"
            })
            .join(", ")

          return `${product.name} -${assignedUsers}`
        })
        .join("\n")

      // Add split details to the expense request
      const expenseRequest: ExpenseRequest = {
        description: expenseDescription,
        payer: payer,
        totalAmount: Number(Number.parseFloat(total || "0").toFixed(2)),
        tax: Number(Number.parseFloat(taxInfo.amount || "0").toFixed(2)),
        userSplits,
        groupId: selectedGroup,
        receiptPath: primaryReceiptPath || "", // Use the primary receipt path from the API
        details: splitDetails, // Add the split details
      }

      console.log("Creating expense with receipt path:", primaryReceiptPath)

      // Send request to API
      const response = await fetch("/api/create-expense", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(expenseRequest),
      })

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()

      if (data.success) {
        setSaveSuccess(`Expense created successfully with ID: ${data.expenseId}`)
        window.scrollTo({ top: 0, behavior: "smooth" })
        // Reset form after successful submission
        resetForm()
      } else {
        throw new Error(data.error || "Failed to create expense")
      }
    } catch (err) {
      console.error("Error creating expense:", err)
      setError(`An error occurred while creating the expense: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setIsSaving(false)
    }
  }

  const toggleUserAssignment = useCallback(
    (productId: string, userId: string) => {
      try {
        setProducts(
          products.map((product) => {
            if (product.id === productId) {
              // Check if user is already assigned
              const isAssigned = product.shares.some((share) => share.userId === userId)

              if (isAssigned) {
                // Remove user from shares and recalculate remaining shares
                const remainingShares = product.shares.filter((share) => share.userId !== userId)

                if (remainingShares.length === 0) {
                  return {
                    ...product,
                    shares: [],
                  }
                }

                // Redistribute percentages equally among remaining users
                const equalPercentage = 100 / remainingShares.length
                return {
                  ...product,
                  shares: remainingShares.map((share, index) => ({
                    ...share,
                    percentage: Math.floor(equalPercentage) + (index < 100 % remainingShares.length ? 1 : 0),
                  })),
                }
              } else {
                // Add user with equal share
                const newShares = [...product.shares, { userId, percentage: 0 }]

                // Recalculate percentages to distribute equally
                const equalPercentage = 100 / newShares.length
                return {
                  ...product,
                  shares: newShares.map((share, index) => ({
                    ...share,
                    percentage: Math.floor(equalPercentage) + (index < 100 % newShares.length ? 1 : 0),
                  })),
                }
              }
            }
            return product
          }),
        )
      } catch (error) {
        console.error("Error toggling user assignment:", error)
        setError("An error occurred while assigning users")
      }
    },
    [products],
  )

  // Assign all items to one user
  const assignAllToUser = useCallback(
    (userId: string) => {
      try {
        setProducts(
          products.map((product) => ({
            ...product,
            shares: [{ userId, percentage: 100 }],
          })),
        )
      } catch (error) {
        console.error("Error assigning all to user:", error)
        setError("An error occurred while assigning items")
      }
    },
    [products],
  )

  // Split all items equally among all users
  const splitAllEqually = useCallback(() => {
    try {
      if (users.length === 0) return

      const equalPercentage = 100 / users.length

      setProducts(
        products.map((product) => ({
          ...product,
          shares: users.map((user, index) => ({
            userId: user.id,
            // Distribute remainder one by one to the first few users
            percentage: Math.floor(equalPercentage) + (index < 100 % users.length ? 1 : 0),
          })),
        })),
      )
    } catch (error) {
      console.error("Error splitting all equally:", error)
      setError("An error occurred while splitting items")
    }
  }, [products, users])

  // Update share percentage for a user without affecting others
  const updateSharePercentage = useCallback(
    (productId: string, userId: string, percentage: number) => {
      try {
        // Round the percentage to a whole number
        const roundedPercentage = Math.round(percentage)

        setProducts(
          products.map((product) => {
            if (product.id === productId) {
              // Find the user's current share
              const userShareIndex = product.shares.findIndex((share) => share.userId === userId)

              if (userShareIndex === -1) return product

              // Create a copy of shares
              const newShares = [...product.shares]

              // Ensure percentage doesn't exceed 100
              const maxAllowed =
                100 -
                newShares.reduce(
                  (sum, share, index) => (index !== userShareIndex ? sum + (share.percentage || 0) : sum),
                  0,
                )

              // Update this user's percentage (capped at maxAllowed)
              newShares[userShareIndex] = {
                ...newShares[userShareIndex],
                percentage: Math.min(roundedPercentage, Math.round(maxAllowed)),
              }

              return { ...product, shares: newShares }
            }
            return product
          }),
        )
      } catch (error) {
        console.error("Error updating share percentage:", error)
      }
    },
    [products],
  )

  // Calculate total percentage for a product
  const getTotalPercentage = useCallback((product: Product) => {
    try {
      return product.shares.reduce((sum, share) => sum + (share.percentage || 0), 0)
    } catch (error) {
      console.error("Error calculating total percentage:", error)
      return 0
    }
  }, [])

  // Balance remaining percentage among users
  const balanceRemainingPercentage = useCallback(
    (productId: string) => {
      try {
        setProducts(
          products.map((product) => {
            if (product.id === productId) {
              const totalPercentage = getTotalPercentage(product)

              if (totalPercentage === 100 || product.shares.length === 0) {
                return product
              }

              const remaining = 100 - totalPercentage
              const shareCount = product.shares.length

              // Calculate how much to add to each share
              const baseAdd = Math.floor(remaining / shareCount)
              const remainder = remaining - baseAdd * shareCount

              return {
                ...product,
                shares: product.shares.map((share, index) => ({
                  ...share,
                  // Add base amount to all shares, and distribute remainder one by one
                  percentage: Math.round(share.percentage || 0) + baseAdd + (index < remainder ? 1 : 0),
                })),
              }
            }
            return product
          }),
        )
      } catch (error) {
        console.error("Error balancing remaining percentage:", error)
      }
    },
    [products, getTotalPercentage],
  )

  // Distribute percentages equally
  const distributeEqually = useCallback(
    (productId: string) => {
      try {
        setProducts(
          products.map((product) => {
            if (product.id === productId && product.shares.length > 0) {
              const equalShare = Math.floor(100 / product.shares.length)
              const remainder = 100 - equalShare * product.shares.length

              return {
                ...product,
                shares: product.shares.map((share, index) => ({
                  ...share,
                  // Distribute remainder one by one to the first few shares
                  percentage: equalShare + (index < remainder ? 1 : 0),
                })),
              }
            }
            return product
          }),
        )
      } catch (error) {
        console.error("Error distributing equally:", error)
      }
    },
    [products],
  )

  // Update product price
  const updateProductPrice = useCallback(
    (productId: string, newPrice: string) => {
      try {
        setProducts(
          products.map((product) => {
            if (product.id === productId) {
              return {
                ...product,
                price: `$${newPrice}`,
              }
            }
            return product
          }),
        )
      } catch (error) {
        console.error("Error updating product price:", error)
        setError("An error occurred while updating the price")
      }
    },
    [products],
  )

  // Recalculate totals based on current product prices
  const recalculateTotals = useCallback(() => {
    try {
      const newSubtotal = products.reduce((sum, product) => {
        return sum + (Number.parseFloat(product.price.replace("$", "")) || 0)
      }, 0)

      const newTaxAmount = taxInfo ? newSubtotal * taxInfo.rate : 0
      const newTotal = newSubtotal + newTaxAmount

      setSubtotal(newSubtotal.toFixed(2))
      if (taxInfo) {
        setTaxInfo({
          ...taxInfo,
          amount: newTaxAmount.toFixed(2),
        })
      }
      setTotal(newTotal.toFixed(2))
    } catch (error) {
      console.error("Error recalculating totals:", error)
    }
  }, [products, taxInfo])

  // Get user's subtotal (without tax)
  const getUserSubtotal = useCallback(
    (userId: string) => {
      try {
        return Number(
          products
            .reduce((total, product) => {
              // Find user's share for this product
              const userShare = product.shares.find((share) => share.userId === userId)

              // Skip if user is not assigned to this product
              if (!userShare) return total

              // Remove $ and convert to number
              const price = Number.parseFloat(product.price.replace("$", "")) || 0

              // Calculate user's portion based on percentage
              const userPortion = price * ((userShare.percentage || 0) / 100)

              return total + userPortion
            }, 0)
            .toFixed(2),
        )
      } catch (error) {
        console.error("Error calculating user subtotal:", error)
        return 0
      }
    },
    [products],
  )

  // Calculate user's share of tax based on their proportion of the subtotal
  const getUserTaxShare = useCallback(
    (userId: string) => {
      try {
        if (!taxInfo) return 0

        const userSubtotal = getUserSubtotal(userId)
        const totalSubtotal = Number(
          products
            .reduce((sum, product) => {
              return sum + (Number.parseFloat(product.price.replace("$", "")) || 0)
            }, 0)
            .toFixed(2),
        )

        // If no items are assigned, return 0
        if (totalSubtotal === 0) return 0

        // Calculate user's proportion of the total bill
        const proportion = userSubtotal / totalSubtotal

        // Calculate user's share of the tax
        return Number((proportion * (Number.parseFloat(taxInfo.amount) || 0)).toFixed(2))
      } catch (error) {
        console.error("Error calculating user tax share:", error)
        return 0
      }
    },
    [getUserSubtotal, products, taxInfo],
  )

  // Get user's total including their share of tax
  const getUserTotal = useCallback(
    (userId: string) => {
      try {
        const subtotal = getUserSubtotal(userId)
        const taxShare = getUserTaxShare(userId)
        return Number((subtotal + taxShare).toFixed(2))
      } catch (error) {
        console.error("Error calculating user total:", error)
        return 0
      }
    },
    [getUserSubtotal, getUserTaxShare],
  )

  // Toggle share editing for a product
  const toggleShareEditing = useCallback((productId: string) => {
    setEditingShares((current) => (current === productId ? null : productId))
  }, [])

  // Close share editing when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (editingShares && !document.getElementById(`share-editor-${editingShares}`)?.contains(event.target as Node)) {
        setEditingShares(null)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [editingShares])

  // Update the useEffect to set the payer to the first user in the list when users are loaded
  useEffect(() => {
    // When users are loaded, set the payer to the first user if not already set
    if (users.length > 0 && (!payer || !users.find((u) => u.id === payer))) {
      setPayer(users[0].id)
    }
  }, [users, payer])

  // Fetch groups on initial load
  useEffect(() => {
    const fetchGroups = async () => {
      setIsLoadingGroups(true)
      try {
        // Use the correct API endpoint with proper error handling
        const response = await fetch("/api/groups")

        // Check if response is OK
        if (!response.ok) {
          console.warn(`Groups API returned status: ${response.status}`)
          // Use default groups instead of throwing an error
          return
        }

        // Check content type to ensure we're getting JSON
        const contentType = response.headers.get("content-type")
        if (!contentType || !contentType.includes("application/json")) {
          console.warn("Groups API did not return JSON, using default groups")
          return
        }

        const data = await response.json()

        if (data.status === "success" && data.groups) {
          // Filter out "Non-group expenses" from the API response
          const filteredGroups = filterGroups(data.groups)
          console.log("[DEBUG] Filtered Groups:", filteredGroups)
          setGroups(filteredGroups)

          // Set default selected group to the first one if available
          const groupIds = Object.keys(filteredGroups)
          if (groupIds.length > 0 && !selectedGroup) {
            setSelectedGroup(groupIds[0])
          }
        }
      } catch (err) {
        console.error("Error fetching groups:", err)
        // Don't set error state to avoid showing error to user
        // Just use default groups instead
      } finally {
        setIsLoadingGroups(false)
      }
    }

    fetchGroups()
  }, [selectedGroup, filterGroups])

  // Get user by ID
  const getUserById = useCallback(
    (userId: string) => {
      return users.find((user) => user.id === userId)
    },
    [users],
  )

  // Clean up object URLs when component unmounts
  useEffect(() => {
    return () => {
      uploadedImages.forEach((img) => URL.revokeObjectURL(img.previewUrl))
    }
  }, [uploadedImages])

  // Fetch group members when selectedGroup changes
  useEffect(() => {
    if (!selectedGroup) return;
    
    const fetchMembers = async () => {
      try {
        setIsLoadingMembers(true);
        console.log(`Fetching members for group: ${selectedGroup}`);
        const response = await fetch(`/api/group-members?group_id=${selectedGroup}`);
        
        if (!response.ok) {
          console.error(`Failed to fetch members: ${response.status} ${response.statusText}`);
          setUsers([]);
          return;
        }
        
        const data = await response.json();
        
        if (!data.success) {
          console.error("API returned error:", data.error);
          setUsers([]);
          return;
        }
        
        // Map members to the expected user format for the dropdown
        const mappedUsers = (data.members || []).map((member: any, index: number) => ({
          id: member.id.toString(),
          name: member.name || "Unknown User",
          color: getColorForIndex(index), // Use consistent color assignment
        }));
        
        console.log(`Fetched ${mappedUsers.length} members:`, mappedUsers);
        setUsers(mappedUsers);
        
        // Set default payer if not already set or if current payer is not in the new group
        if (!payer || !mappedUsers.find((u: User) => u.id === payer)) {
          if (mappedUsers.length > 0) {
            setPayer(mappedUsers[0].id);
          }
        }
      } catch (err) {
        console.error("Error fetching group members:", err);
        setUsers([]);
      } finally {
        setIsLoadingMembers(false);
      }
    };
    
    fetchMembers();
  }, [selectedGroup, payer]);

  return (
    <ErrorBoundary>
      <TooltipProvider>
        <div className="container mx-auto py-2 px-3 sm:py-4 max-w-7xl">
          {/* Header - Mobile optimized */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold">ReceiptWise</h1>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full"
                    onClick={() => setShowHelp(!showHelp)}
                  >
                    <HelpCircle className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Help & Information</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <ThemeToggle />
          </div>

          {showHelp && (
            <Card className="mb-4 bg-muted/20">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Info className="h-4 w-4 sm:h-5 sm:w-5" />
                  How to use this app
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs sm:text-sm space-y-2">
                <p>1. Upload one or more receipt images and select your group number</p>
                <p>2. Enter an expense description and select who paid</p>
                <p>3. Assign each item to people by clicking their names</p>
                <p>4. Adjust shares if needed using the "Adjust Shares" button</p>
                <p>5. Create the expense when all items are fully assigned</p>
              </CardContent>
              <CardFooter className="pt-2">
                <Button variant="outline" size="sm" onClick={() => setShowHelp(false)}>
                  Close
                </Button>
              </CardFooter>
            </Card>
          )}

          {/* Image Upload Section - Mobile optimized */}
          <Card className="mb-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-base sm:text-lg">Upload Receipts</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Mobile-first layout */}
                <div className="flex flex-col gap-4">
                  {/* Upload area - full width on mobile */}
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 flex items-center justify-center bg-muted/20 w-full min-h-[80px]">
                    <label htmlFor="image-upload" className="cursor-pointer flex items-center">
                      <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-primary/10 flex items-center justify-center mr-3">
                        <Upload className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Upload images</p>
                        <p className="text-xs text-muted-foreground">Click to browse</p>
                      </div>
                    </label>
                    <input
                      id="image-upload"
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </div>

                  {/* Group selection and buttons row */}
                  <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
                    {/* Group Selection */}
                    <div className="flex flex-col gap-1 flex-1">
                      <Label htmlFor="group-select" className="text-sm font-medium">
                        Group
                      </Label>
                      <Select
                        value={selectedGroup}
                        onValueChange={setSelectedGroup}
                        disabled={isLoadingGroups}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={isLoadingGroups ? "Loading..." : "Select Group"} />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(groups).map(([id, group]) => (
                            <SelectItem key={id} value={id.toString()}>
                              {group.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2">
                      <Button
                        type="submit"
                        disabled={uploadedImages.length === 0 || isLoading}
                        className="flex-1 sm:flex-none"
                        size="sm"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            <span className="hidden sm:inline">Processing...</span>
                            <span className="sm:hidden">Processing</span>
                          </>
                        ) : (
                          <>
                            <span className="hidden sm:inline">Search Products</span>
                            <span className="sm:hidden">Search</span>
                          </>
                        )}
                      </Button>
                      {uploadedImages.length > 0 && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button type="button" variant="outline" onClick={resetForm} size="sm">
                              Reset
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Clear form and start over</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                </div>

                {/* Image Previews - Mobile optimized grid */}
                {uploadedImages.length > 0 && (
                  <div className="mt-4">
                    <Label className="text-sm font-medium mb-2 block">Selected Images ({uploadedImages.length})</Label>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 sm:gap-3">
                      {uploadedImages.map((img, index) => (
                        <div key={index} className="relative group">
                          <div
                            className="aspect-square relative rounded-md overflow-hidden border cursor-pointer"
                            onClick={() => openImagePreview(index)}
                          >
                            <Image
                              src={img.previewUrl || "/placeholder.svg"}
                              alt={`Receipt ${index + 1}`}
                              fill
                              className="object-cover"
                            />
                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <ImageIcon className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="h-4 w-4 sm:h-5 sm:w-5 absolute -top-1 -right-1 sm:-top-2 sm:-right-2 rounded-full p-0"
                            onClick={(e) => {
                              e.stopPropagation()
                              removeImage(index)
                            }}
                          >
                            <X className="h-2 w-2 sm:h-3 sm:w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>

          {/* Error and Success Messages */}
          {error && (
            <div className="p-3 text-sm bg-destructive/10 text-destructive rounded-md mb-4 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span className="break-words">{error}</span>
            </div>
          )}

          {saveSuccess && (
            <div className="p-3 text-sm bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-md mb-4 flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span className="break-words">{saveSuccess}</span>
            </div>
          )}

          {/* Expense Details - Mobile optimized */}
          {products.length > 0 && (
            <div className="mb-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base sm:text-lg">Expense Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Left column - Form inputs */}
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="expense-description" className="text-sm font-medium">
                          Expense Description
                        </Label>
                        <div className="flex gap-2 mt-1">
                          <Input
                            id="expense-description"
                            placeholder="Enter expense description..."
                            value={expenseDescription}
                            onChange={(e) => setExpenseDescription(e.target.value)}
                            className="flex-1"
                            maxLength={100}
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="payer-select" className="text-sm font-medium">
                          Payer
                        </Label>
                        <Select value={payer || ""} onValueChange={setPayer}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select Payer" />
                          </SelectTrigger>
                          <SelectContent>
                            {users.map((user) => (
                              <SelectItem key={user.id} value={user.id}>
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: user.color }} />
                                  <span>{user.name}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Right column - Members List */}
                    <div className="border rounded-lg p-3 bg-muted/10">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-2">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <h2 className="text-sm font-semibold">
                            People in {groups[selectedGroup]?.name || `Group #${selectedGroup}`} ({users.length})
                          </h2>
                        </div>

                        {/* Quick assign button */}
                        <div className="flex gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 px-2 text-xs"
                                onClick={() => splitAllEqually()}
                                disabled={users.length === 0 || products.length === 0}
                              >
                                <SplitSquareVertical className="h-3 w-3 mr-1" />
                                <span className="hidden sm:inline">Split All</span>
                                <span className="sm:hidden">Split</span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Split all items equally among everyone</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>

                      {/* Loading state for users */}
                      {isLoadingMembers && (
                        <div className="flex items-center justify-center py-4 text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          <span className="text-sm">Loading group members...</span>
                        </div>
                      )}

                      {/* Error state for users */}
                      {users.length === 0 && !isLoadingMembers && !selectedGroup && (
                        <div className="flex items-center justify-center py-4 text-muted-foreground">
                          <AlertCircle className="h-4 w-4 mr-2" />
                          <span className="text-sm">Please select a group to see members</span>
                        </div>
                      )}

                      {/* No members found state */}
                      {users.length === 0 && !isLoadingMembers && selectedGroup && (
                        <div className="flex items-center justify-center py-4 text-muted-foreground">
                          <AlertCircle className="h-4 w-4 mr-2" />
                          <span className="text-sm">No members found in this group</span>
                        </div>
                      )}

                      {/* User chips - responsive grid */}
                      {users.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {users.map((user) => (
                          <div key={user.id} className="relative group">
                            <div
                              className={`flex items-center gap-1 px-2 py-1 rounded-full text-sm ${
                                payer === user.id ? "bg-primary/20 border border-primary/50" : "bg-muted"
                              }`}
                            >
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: user.color }} />
                              <span className="truncate">{user.name}</span>
                              {payer === user.id && <span className="text-xs ml-1">(Payer)</span>}
                            </div>

                            {/* Quick assign button */}
                            <div className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="default"
                                    size="icon"
                                    className="h-5 w-5 rounded-full p-0"
                                    onClick={() => assignAllToUser(user.id)}
                                  >
                                    <UserPlus className="h-3 w-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Assign all items to {user.name}</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </div>
                        ))}
                      </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Assignment Progress */}
          {products.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-medium">Assignment Progress</h3>
                <span className="text-sm">{Math.round(getAssignmentProgress())}%</span>
              </div>
              <Progress value={getAssignmentProgress()} className="h-2" />
            </div>
          )}

          {/* Assignment Summary - NEW COMPONENT */}
          {products.length > 0 && subtotal && (
            <AssignmentSummary
              products={products}
              subtotal={subtotal}
              onRecalculateSubtotal={recalculateSubtotalFromItems}
            />
          )}

          {/* Products Section - Responsive grid */}
          {products.length > 0 ? (
            <ErrorBoundary>
              <div className="mb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-2">
                  <h2 className="text-base sm:text-lg font-semibold">Found Products</h2>
                  <Badge variant={isFullyAssigned() ? "default" : "destructive"} className="self-start sm:self-auto">
                    {isFullyAssigned() ? "All Assigned" : "Needs Assignment"}
                  </Badge>
                </div>

                {/* Responsive product grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {products.map((product) => (
                    <ErrorBoundary key={product.id}>
                      <ProductCard
                        product={product}
                        users={users}
                        editingShares={editingShares}
                        toggleShareEditing={toggleShareEditing}
                        toggleUserAssignment={toggleUserAssignment}
                        updateSharePercentage={updateSharePercentage}
                        distributeEqually={distributeEqually}
                        balanceRemainingPercentage={balanceRemainingPercentage}
                        updateProductPrice={updateProductPrice}
                      />
                    </ErrorBoundary>
                  ))}
                </div>
              </div>
            </ErrorBoundary>
          ) : isLoading ? (
            <div className="flex flex-col items-center justify-center h-40 bg-muted/10 rounded-lg">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground text-center px-4">Identifying items in your images...</p>
            </div>
          ) : uploadedImages.length === 0 ? (
            <EmptyState
              type="upload"
              message="No receipts uploaded yet"
              subMessage="Upload one or more receipt images to get started"
            />
          ) : null}

          {/* Summary Section */}
          {products.length > 0 && taxInfo && (
            <ErrorBoundary>
              <Suspense fallback={<LoadingFallback />}>
                <BillSummary
                  products={products}
                  users={users}
                  taxInfo={taxInfo}
                  subtotal={subtotal || "0.00"}
                  total={total || "0.00"}
                  payer={payer}
                />
              </Suspense>
            </ErrorBoundary>
          )}

          {/* Editable Total Section */}
          {products.length > 0 && taxInfo && (
            <Card className="mb-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-base sm:text-lg">Total Amount</CardTitle>
              </CardHeader>
              <CardContent>
                <EditableTotal
                  subtotal={subtotal || "0.00"}
                  taxInfo={taxInfo}
                  total={total || "0.00"}
                  onUpdateTotal={(newSubtotal, newTax, newTotal) => {
                    setSubtotal(newSubtotal)
                    setTaxInfo({ ...taxInfo, amount: newTax })
                    setTotal(newTotal)
                  }}
                />
              </CardContent>
            </Card>
          )}

          {/* Create Expense Button - Mobile optimized */}
          {products.length > 0 && (
            <div className="sticky bottom-2 sm:bottom-3 flex justify-center px-4 sm:px-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={createExpense}
                    disabled={isSaving || !expenseDescription.trim() || !payer || !isFullyAssigned()}
                    className="bg-green-600 hover:bg-green-700 px-4 sm:px-6 py-3 sm:py-5 text-base sm:text-lg shadow-lg w-full sm:w-auto max-w-sm"
                    size="lg"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        <span className="hidden sm:inline">Saving...</span>
                        <span className="sm:hidden">Saving</span>
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        <span className="hidden sm:inline">Create Expense</span>
                        <span className="sm:hidden">Create</span>
                      </>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {!expenseDescription.trim() ? (
                    <p>Please enter an expense description</p>
                  ) : !payer ? (
                    <p>Please select a payer</p>
                  ) : !isFullyAssigned() ? (
                    <p>All items must be fully assigned before creating the expense</p>
                  ) : (
                    <p>Create and save this expense</p>
                  )}
                </TooltipContent>
              </Tooltip>
            </div>
          )}

          {/* Image Preview Modal */}
          {showImagePreview && uploadedImages.length > 0 && (
            <ImagePreviewModal
              imageUrl={uploadedImages[previewImageIndex].previewUrl}
              onClose={() => setShowImagePreview(false)}
            />
          )}
        </div>
      </TooltipProvider>
    </ErrorBoundary>
  )
}

// Helper function to generate colors for users
function getColorForIndex(index: number): string {
  const colors = [
    "#ef4444", // red
    "#10b981", // green
    "#8b5cf6", // purple
    "#f97316", // orange
    "#ec4899", // pink
    "#6366f1", // indigo
    "#14b8a6", // teal
    "#f59e0b", // amber
    "#06b6d4", // cyan
    "#d946ef", // fuchsia
  ]
  return colors[index % colors.length]
}

export default function ImageUploadSearchWithErrorBoundary() {
  return (
    <ErrorBoundary>
      <ImageUploadSearch />
    </ErrorBoundary>
  )
}
