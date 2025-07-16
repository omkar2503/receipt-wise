"use client"

import type React from "react"

import { useCallback, useState } from "react"
import { Percent, AlertCircle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { withErrorBoundary } from "./error-boundary"

interface UserShare {
  userId: string
  percentage: number
}

interface Product {
  id: string
  name: string
  price: string
  image: string
  shares: UserShare[]
}

interface User {
  id: string
  name: string
  color: string
}

interface ProductCardProps {
  product: Product
  users: User[]
  editingShares: string | null
  toggleShareEditing: (productId: string) => void
  toggleUserAssignment: (productId: string, userId: string) => void
  updateSharePercentage: (productId: string, userId: string, percentage: number) => void
  distributeEqually: (productId: string) => void
  balanceRemainingPercentage: (productId: string) => void
  updateProductPrice: (productId: string, newPrice: string) => void
}

function ProductCardComponent({
  product,
  users,
  editingShares,
  toggleShareEditing,
  toggleUserAssignment,
  updateSharePercentage,
  distributeEqually,
  balanceRemainingPercentage,
  updateProductPrice,
}: ProductCardProps) {
  const [isEditingPrice, setIsEditingPrice] = useState(false)
  const [tempPrice, setTempPrice] = useState(product.price.replace("$", ""))

  const handlePriceUpdate = (newPrice: string) => {
    const numericPrice = Number.parseFloat(newPrice)
    if (!isNaN(numericPrice) && numericPrice >= 0) {
      // Update the product price through a callback prop
      updateProductPrice(product.id, numericPrice.toFixed(2))
      setIsEditingPrice(false)
    }
  }

  // Safely get total percentage with error handling
  const getTotalPercentage = useCallback(() => {
    try {
      return product.shares.reduce((sum, share) => sum + (share.percentage || 0), 0)
    } catch (error) {
      console.error("Error calculating total percentage:", error)
      return 0
    }
  }, [product.shares])

  const totalPercentage = getTotalPercentage()
  const isBalanced = Math.abs(totalPercentage - 100) < 0.01 || product.shares.length === 0

  // Format percentage for display
  const formatPercentage = (percentage: number) => {
    return `${Math.round(percentage)}%`
  }

  // Safely get user by ID
  const getUserById = useCallback(
    (userId: string) => {
      return users.find((user) => user.id === userId)
    },
    [users],
  )

  // Handle manual input of dollar amount
  const handleManualDollarInput = (e: React.ChangeEvent<HTMLInputElement>, userId: string) => {
    try {
      // Get the input value
      const inputValue = e.target.value.trim()

      // Handle empty input
      if (inputValue === "") {
        return
      }

      // Parse the input as a float
      let rupeeValue = Number.parseFloat(inputValue)

      // Validate the input
      if (isNaN(rupeeValue)) {
        return
      }

      // Get the product price
      const price = Number.parseFloat(product.price.replace("₹", ""))

      // Ensure the rupee value doesn't exceed the product price
      rupeeValue = Math.max(0, Math.min(price, rupeeValue))

      // Convert rupee value to percentage
      const percentage = (rupeeValue / price) * 100

      // Update the share percentage
      updateSharePercentage(product.id, userId, percentage)
    } catch (error) {
      console.error("Error handling rupee input:", error)
    }
  }

  return (
    <Card
      className={
        !isBalanced || product.shares.length === 0
          ? "border-amber-300 dark:border-amber-700"
          : "border-green-300 dark:border-green-700"
      }
    >
      <CardContent className="p-3">
        <div className="flex-1">
          {/* Header with product info */}
          <div className="flex justify-between items-start mb-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-sm sm:text-base truncate" title={product.name || "Unnamed Product"}>
                {product.name || "Unnamed Product"}
              </h3>
              {isEditingPrice ? (
                <div className="flex items-center gap-1">
                  <span className="text-sm">₹</span>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={tempPrice}
                    onChange={(e) => setTempPrice(e.target.value)}
                    onBlur={() => handlePriceUpdate(tempPrice)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handlePriceUpdate(tempPrice)
                      } else if (e.key === "Escape") {
                        setTempPrice(product.price.replace("$", ""))
                        setIsEditingPrice(false)
                      }
                    }}
                    className="w-16 sm:w-20 h-6 text-sm"
                    autoFocus
                  />
                </div>
              ) : (
                <p
                  className="text-primary font-bold text-sm sm:text-base cursor-pointer hover:bg-primary/10 rounded px-1 -mx-1"
                  onClick={() => {
                    setTempPrice(product.price.replace("$", ""))
                    setIsEditingPrice(true)
                  }}
                  title="Click to edit price"
                >
                  {product.price || "₹0.00"}
                </p>
              )}
            </div>

            {product.shares.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 ml-2 flex-shrink-0"
                onClick={() => toggleShareEditing(product.id)}
              >
                <Percent className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                <span className="text-xs hidden sm:inline">{editingShares === product.id ? "Hide" : "Adjust"}</span>
                <span className="text-xs sm:hidden">%</span>
              </Button>
            )}
          </div>

          {/* User share indicators - horizontal bar */}
          <div className="mb-2">
            <div className="flex justify-between items-center text-xs text-muted-foreground mb-1">
              <span>
                {product.shares.length === 0 ? (
                  <Badge variant="default" className="text-xs">
                    Unassigned
                  </Badge>
                ) : (
                  <>
                    {product.shares.length} {product.shares.length === 1 ? "person" : "people"}
                  </>
                )}
              </span>
              {!isBalanced && product.shares.length > 0 && (
                <Badge variant="default" className="text-xs">
                  {formatPercentage(totalPercentage)}
                </Badge>
              )}
              {isBalanced && product.shares.length > 0 && (
                <Badge variant="default" className="text-xs">
                  100%
                </Badge>
              )}
            </div>
            <div className="h-2 w-full flex rounded-full overflow-hidden">
              {product.shares.map((share) => {
                const user = getUserById(share.userId)
                return (
                  <div
                    key={share.userId}
                    className="h-full"
                    style={{
                      backgroundColor: user?.color || "#888",
                      width: `${share.percentage || 0}%`,
                    }}
                  />
                )
              })}
              {totalPercentage < 100 && (
                <div className="h-full bg-gray-200 dark:bg-gray-700" style={{ width: `${100 - totalPercentage}%` }} />
              )}
            </div>
          </div>

          {/* Share percentage editor - Mobile optimized */}
          {editingShares === product.id && product.shares.length > 0 && (
            <div id={`share-editor-${product.id}`} className="mt-2 p-2 border rounded-md bg-muted/10">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-3 gap-2">
                <p className="text-sm font-medium">Adjust shares:</p>
                <div className="flex gap-1 sm:gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs px-2"
                    onClick={() => distributeEqually(product.id)}
                  >
                    Equal
                  </Button>
                  {totalPercentage !== 100 && product.shares.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs px-2"
                      onClick={() => balanceRemainingPercentage(product.id)}
                    >
                      Balance
                    </Button>
                  )}
                </div>
              </div>

              {/* Total percentage indicator */}
              <div
                className={`text-xs sm:text-sm mb-4 p-2 rounded flex items-center justify-between ${
                  isBalanced
                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                    : "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                }`}
              >
                <span className="flex items-center">
                  {!isBalanced && <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />}
                  Total: {formatPercentage(totalPercentage)}
                </span>
                <span className="text-xs">{!isBalanced && `${formatPercentage(100 - totalPercentage)} left`}</span>
              </div>

              {/* Individual user shares */}
              {product.shares.map((share) => {
                const user = getUserById(share.userId)
                if (!user) return null

                try {
                  // Calculate dollar amount for this user's share
                  const price = Number.parseFloat(product.price.replace("₹", ""))
                  const userAmount = price * ((share.percentage || 0) / 100)

                  return (
                    <div key={share.userId} className="mb-4">
                      <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: user.color }} />
                          <span className="text-sm truncate">{user.name}</span>
                        </div>
                        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                          <span className="text-xs sm:text-sm">₹</span>
                          <Input
                            type="number"
                            min="0"
                            max={price}
                            step="0.01"
                            value={userAmount.toFixed(2)}
                            onChange={(e) => handleManualDollarInput(e, share.userId)}
                            className="w-12 sm:w-16 h-6 sm:h-7 text-right text-xs sm:text-sm"
                          />
                          <span className="text-xs text-muted-foreground">({Math.round(share.percentage || 0)}%)</span>
                        </div>
                      </div>
                      <Slider
                        value={[Math.round(share.percentage || 0)]}
                        min={0}
                        max={100}
                        step={1}
                        onValueChange={(values) => {
                          const wholeNumberPercentage = Math.round(values[0])
                          updateSharePercentage(product.id, share.userId, wholeNumberPercentage)
                        }}
                        className="mb-2"
                      />
                    </div>
                  )
                } catch (error) {
                  console.error("Error rendering share editor:", error)
                  return (
                    <div
                      key={share.userId}
                      className="p-2 text-xs sm:text-sm text-red-500 bg-red-100 dark:bg-red-900/20 rounded"
                    >
                      Error displaying share information
                    </div>
                  )
                }
              })}

              {/* Price breakdown */}
              <div className="text-xs sm:text-sm text-muted-foreground mt-3 border-t pt-2">
                <div className="font-medium mb-1">Price breakdown:</div>
                {product.shares.map((share) => {
                  const user = getUserById(share.userId)
                  if (!user) return null

                  try {
                    const price = Number.parseFloat(product.price.replace("₹", ""))
                    const userAmount = price * ((share.percentage || 0) / 100)

                    return (
                      <div key={share.userId} className="flex justify-between">
                        <span className="truncate mr-2">{user.name}:</span>
                        <span>₹{userAmount.toFixed(2)}</span>
                      </div>
                    )
                  } catch (error) {
                    console.error("Error calculating price breakdown:", error)
                    return (
                      <div key={share.userId} className="flex justify-between text-red-500">
                        <span className="truncate mr-2">{user.name}:</span>
                        <span>Error</span>
                      </div>
                    )
                  }
                })}
              </div>
            </div>
          )}

          {/* User Assignment Buttons - Mobile optimized */}
          <div className="mt-2 border-t pt-2">
            <p className="text-sm font-medium mb-2">Assign to:</p>
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-1 sm:gap-2">
              {users.map((user) => {
                const isAssigned = product.shares.some((share) => share.userId === user.id)
                return (
                  <button
                    key={user.id}
                    onClick={() => toggleUserAssignment(product.id, user.id)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs sm:text-sm transition-colors ${
                      isAssigned ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: user.color }} />
                    <span className="truncate">{user.name}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export const ProductCard = withErrorBoundary(ProductCardComponent)
