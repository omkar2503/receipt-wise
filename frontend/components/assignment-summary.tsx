"use client"

import { AlertTriangle, CheckCircle2, Calculator } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"

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

interface AssignmentSummaryProps {
  products: Product[]
  subtotal: string
  onRecalculateSubtotal: () => void
}

export function AssignmentSummary({ products, subtotal, onRecalculateSubtotal }: AssignmentSummaryProps) {
  // Calculate total of all assigned items
  const calculateAssignedTotal = () => {
    return products.reduce((total, product) => {
      const price = Number.parseFloat(product.price.replace("$", "")) || 0

      // Only count items that are assigned (have shares)
      if (product.shares.length > 0) {
        return total + price
      }

      return total
    }, 0)
  }

  // Calculate total of unassigned items
  const calculateUnassignedTotal = () => {
    return products.reduce((total, product) => {
      const price = Number.parseFloat(product.price.replace("$", "")) || 0

      // Only count items that are NOT assigned (no shares)
      if (product.shares.length === 0) {
        return total + price
      }

      return total
    }, 0)
  }

  // Calculate total of all items (assigned + unassigned)
  const calculateAllItemsTotal = () => {
    return products.reduce((total, product) => {
      const price = Number.parseFloat(product.price.replace("$", "")) || 0
      return total + price
    }, 0)
  }

  const assignedTotal = calculateAssignedTotal()
  const unassignedTotal = calculateUnassignedTotal()
  const allItemsTotal = calculateAllItemsTotal()
  const currentSubtotal = Number.parseFloat(subtotal) || 0

  // Check if assigned total matches subtotal
  const assignedMatchesSubtotal = Math.abs(assignedTotal - currentSubtotal) < 0.01

  // Check if all items total matches subtotal (in case there are unassigned items)
  const allItemsMatchSubtotal = Math.abs(allItemsTotal - currentSubtotal) < 0.01

  // Count assigned and unassigned items
  const assignedItemsCount = products.filter((p) => p.shares.length > 0).length
  const unassignedItemsCount = products.filter((p) => p.shares.length === 0).length

  const getStatusInfo = () => {
    if (unassignedItemsCount > 0) {
      return {
        status: "warning",
        message: "Some items are unassigned",
        icon: AlertTriangle,
        color: "text-amber-600 dark:text-amber-400",
      }
    } else if (assignedMatchesSubtotal) {
      return {
        status: "success",
        message: "All items assigned and totals match",
        icon: CheckCircle2,
        color: "text-green-600 dark:text-green-400",
      }
    } else {
      return {
        status: "error",
        message: "Totals don't match - check item prices",
        icon: AlertTriangle,
        color: "text-red-600 dark:text-red-400",
      }
    }
  }

  const statusInfo = getStatusInfo()
  const StatusIcon = statusInfo.icon

  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
          <Calculator className="h-4 w-4 sm:h-5 sm:w-5" />
          Assignment Summary
          <StatusIcon className={`h-4 w-4 sm:h-5 sm:w-5 ${statusInfo.color}`} />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Status Message */}
          <div
            className={`p-3 rounded-lg flex items-center gap-2 ${
              statusInfo.status === "success"
                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                : statusInfo.status === "warning"
                  ? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                  : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
            }`}
          >
            <StatusIcon className="h-4 w-4 flex-shrink-0" />
            <span className="text-sm font-medium">{statusInfo.message}</span>
          </div>

          {/* Summary Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Assigned Items */}
            <div className="p-3 bg-muted/10 rounded-lg">
              <div className="text-xs text-muted-foreground mb-1">Assigned Items</div>
              <div className="font-bold text-lg">${assignedTotal.toFixed(2)}</div>
              <div className="text-xs text-muted-foreground">
                {assignedItemsCount} item{assignedItemsCount !== 1 ? "s" : ""}
              </div>
            </div>

            {/* Unassigned Items */}
            {unassignedItemsCount > 0 && (
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <div className="text-xs text-amber-700 dark:text-amber-300 mb-1">Unassigned Items</div>
                <div className="font-bold text-lg text-amber-800 dark:text-amber-200">
                  ${unassignedTotal.toFixed(2)}
                </div>
                <div className="text-xs text-amber-700 dark:text-amber-300">
                  {unassignedItemsCount} item{unassignedItemsCount !== 1 ? "s" : ""}
                </div>
              </div>
            )}

            {/* All Items Total */}
            <div className="p-3 bg-muted/10 rounded-lg">
              <div className="text-xs text-muted-foreground mb-1">All Items Total</div>
              <div className="font-bold text-lg">${allItemsTotal.toFixed(2)}</div>
              <div className="text-xs text-muted-foreground">
                {products.length} item{products.length !== 1 ? "s" : ""}
              </div>
            </div>

            {/* Receipt Subtotal */}
            <div
              className={`p-3 rounded-lg ${
                assignedMatchesSubtotal
                  ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                  : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
              }`}
            >
              <div
                className={`text-xs mb-1 ${
                  assignedMatchesSubtotal ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"
                }`}
              >
                Receipt Subtotal
              </div>
              <div
                className={`font-bold text-lg ${
                  assignedMatchesSubtotal ? "text-green-800 dark:text-green-200" : "text-red-800 dark:text-red-200"
                }`}
              >
                ${currentSubtotal.toFixed(2)}
              </div>
              <div
                className={`text-xs ${
                  assignedMatchesSubtotal ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"
                }`}
              >
                From receipt
              </div>
            </div>
          </div>

          {/* Difference Analysis */}
          {!assignedMatchesSubtotal && unassignedItemsCount === 0 && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-red-800 dark:text-red-200">Difference Analysis</span>
                <Badge variant="destructive" className="text-xs">
                  ${Math.abs(assignedTotal - currentSubtotal).toFixed(2)} off
                </Badge>
              </div>
              <div className="text-xs text-red-700 dark:text-red-300 space-y-1">
                {assignedTotal > currentSubtotal ? (
                  <p>
                    • Assigned items total is ${(assignedTotal - currentSubtotal).toFixed(2)} more than receipt subtotal
                  </p>
                ) : (
                  <p>
                    • Assigned items total is ${(currentSubtotal - assignedTotal).toFixed(2)} less than receipt subtotal
                  </p>
                )}
                <p>• Check individual item prices for accuracy</p>
                <p>• Consider if there are missing items or price discrepancies</p>
              </div>
            </div>
          )}

          {/* Unassigned Items Warning */}
          {unassignedItemsCount > 0 && (
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-amber-800 dark:text-amber-200">Unassigned Items</span>
                <Badge variant="warning" className="text-xs">
                  {unassignedItemsCount} item{unassignedItemsCount !== 1 ? "s" : ""}
                </Badge>
              </div>
              <div className="text-xs text-amber-700 dark:text-amber-300 space-y-1">
                <p>• ${unassignedTotal.toFixed(2)} worth of items are not assigned to anyone</p>
                <p>• Assign these items before creating the expense</p>
                {allItemsMatchSubtotal && <p>• All items total matches receipt subtotal ✓</p>}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <TooltipProvider>
            <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onRecalculateSubtotal}
                    className="flex items-center gap-2"
                  >
                    <Calculator className="h-4 w-4" />
                    <span className="hidden sm:inline">Recalculate Subtotal from Items</span>
                    <span className="sm:hidden">Recalculate</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Update the receipt subtotal to match the total of all assigned items</p>
                </TooltipContent>
              </Tooltip>

              {!assignedMatchesSubtotal && unassignedItemsCount === 0 && (
                <div className="text-xs text-muted-foreground flex items-center">
                  <span>Tip: Use "Recalculate" to sync subtotal with item prices</span>
                </div>
              )}
            </div>
          </TooltipProvider>
        </div>
      </CardContent>
    </Card>
  )
}
