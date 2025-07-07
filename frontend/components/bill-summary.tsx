"use client"

import { useCallback } from "react"
import { Receipt, AlertCircle } from "lucide-react"
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card"
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

interface TaxInfo {
  rate: number
  amount: string
}

interface BillSummaryProps {
  products: Product[]
  users: User[]
  taxInfo: TaxInfo
  subtotal: string
  total: string
  payer: string | null
}

function BillSummaryComponent({ products, users, taxInfo, subtotal, total, payer }: BillSummaryProps) {
  // Safely get user by ID
  const getUserById = useCallback(
    (userId: string) => {
      return users.find((user) => user.id === userId) || null
    },
    [users],
  )

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

  // Count items assigned to a user
  const getItemCount = useCallback(
    (userId: string) => {
      try {
        return products.filter((p) => p.shares.some((share) => share.userId === userId)).length
      } catch (error) {
        console.error("Error counting user items:", error)
        return 0
      }
    },
    [products],
  )

  // Get unassigned items
  const getUnassignedItems = useCallback(() => {
    try {
      return products.filter((p) => p.shares.length === 0)
    } catch (error) {
      console.error("Error getting unassigned items:", error)
      return []
    }
  }, [products])

  // Calculate total for unassigned items
  const getUnassignedTotal = useCallback(() => {
    try {
      return products
        .filter((p) => p.shares.length === 0)
        .reduce((total, p) => total + (Number.parseFloat(p.price.replace("$", "")) || 0), 0)
        .toFixed(2)
    } catch (error) {
      console.error("Error calculating unassigned total:", error)
      return "0.00"
    }
  }, [products])

  const unassignedItems = getUnassignedItems()

  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-base sm:text-lg flex items-center">
          <Receipt className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
          Bill Summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Bill Details - Mobile optimized */}
        <div className="mb-3 p-3 bg-muted/10 rounded-lg">
          <div className="flex flex-col space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal:</span>
              <span className="font-medium">${subtotal || "0.00"}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax ({taxInfo ? (taxInfo.rate * 100).toFixed(1) : "0"}%):</span>
              <span className="font-medium">${taxInfo ? taxInfo.amount : "0.00"}</span>
            </div>

            <div className="flex justify-between pt-1 border-t">
              <span className="text-muted-foreground font-medium">Total:</span>
              <span className="font-bold">${total || "0.00"}</span>
            </div>

            {payer && (
              <div className="pt-1 border-t mt-1">
                <span className="text-muted-foreground text-xs sm:text-sm">
                  Payer: {getUserById(payer)?.name || "Unknown User"}
                </span>
              </div>
            )}
          </div>
        </div>

        <h3 className="text-sm sm:text-base font-medium mb-2">Individual Shares</h3>

        {/* Responsive grid for user shares */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3">
          {users.map((user) => {
            const subtotalAmount = getUserSubtotal(user.id)
            const taxShare = getUserTaxShare(user.id)
            const totalAmount = getUserTotal(user.id)
            const itemCount = getItemCount(user.id)

            if (itemCount === 0) return null

            return (
              <div
                key={user.id}
                className={`p-2 sm:p-3 rounded-lg ${
                  payer === user.id ? "bg-primary/10 border border-primary/30" : "bg-muted/10"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: user.color }} />
                  <span className="font-medium text-sm truncate flex-1">{user.name}</span>
                  {payer === user.id && (
                    <Badge variant="default" className="text-xs">
                      Payer
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-1 text-xs sm:text-sm">
                  <div className="text-muted-foreground">Items:</div>
                  <div className="text-right">
                    {itemCount} {itemCount !== 1 ? "items" : "item"}
                  </div>

                  <div className="text-muted-foreground">Subtotal:</div>
                  <div className="text-right">${subtotalAmount.toFixed(2)}</div>

                  <div className="text-muted-foreground">Tax share:</div>
                  <div className="text-right">${taxShare.toFixed(2)}</div>

                  <div className="text-muted-foreground font-medium pt-1 border-t">Total:</div>
                  <div className="text-right font-bold pt-1 border-t">${totalAmount.toFixed(2)}</div>
                </div>
              </div>
            )
          })}

          {/* Show unassigned items if any */}
          {unassignedItems.length > 0 && (
            <div className="p-2 sm:p-3 bg-amber-50 text-amber-800 dark:bg-amber-900 dark:text-amber-200 rounded-lg border border-amber-300 dark:border-amber-700 col-span-full sm:col-span-1">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span className="font-medium text-sm">Unassigned Items</span>
              </div>

              <div className="grid grid-cols-2 gap-1 text-xs sm:text-sm">
                <div>Items:</div>
                <div className="text-right">
                  {unassignedItems.length} item{unassignedItems.length !== 1 ? "s" : ""}
                </div>

                <div>Total:</div>
                <div className="text-right font-bold">${getUnassignedTotal()}</div>
              </div>
              <div className="mt-2 text-xs">These items need to be assigned before creating the expense.</div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export const BillSummary = withErrorBoundary(BillSummaryComponent)
