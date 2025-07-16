"use client"

import { useState } from "react"
import { Edit3, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface TaxInfo {
  rate: number
  amount: string
}

interface EditableTotalProps {
  subtotal: string
  taxInfo: TaxInfo
  total: string
  onUpdateTotal: (newSubtotal: string, newTax: string, newTotal: string) => void
}

export function EditableTotal({ subtotal, taxInfo, total, onUpdateTotal }: EditableTotalProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [tempSubtotal, setTempSubtotal] = useState(subtotal)
  const [tempTaxRate, setTempTaxRate] = useState((taxInfo.rate * 100).toFixed(1))
  const [tempTotal, setTempTotal] = useState(total)

  const handleSave = () => {
    try {
      const newSubtotal = Number.parseFloat(tempSubtotal)
      const newTaxRate = Number.parseFloat(tempTaxRate) / 100
      const newTotal = Number.parseFloat(tempTotal)

      if (isNaN(newSubtotal) || isNaN(newTaxRate) || isNaN(newTotal)) {
        return
      }

      const calculatedTax = newSubtotal * newTaxRate
      const calculatedTotal = newSubtotal + calculatedTax

      onUpdateTotal(newSubtotal.toFixed(2), calculatedTax.toFixed(2), calculatedTotal.toFixed(2))

      setIsEditing(false)
    } catch (error) {
      console.error("Error updating total:", error)
    }
  }

  const handleCancel = () => {
    setTempSubtotal(subtotal)
    setTempTaxRate((taxInfo.rate * 100).toFixed(1))
    setTempTotal(total)
    setIsEditing(false)
  }

  const recalculateFromSubtotalAndTax = () => {
    const sub = Number.parseFloat(tempSubtotal) || 0
    const rate = Number.parseFloat(tempTaxRate) / 100 || 0
    const calculatedTotal = sub + sub * rate
    setTempTotal(calculatedTotal.toFixed(2))
  }

  if (isEditing) {
    return (
      <div className="space-y-4 p-4 border rounded-lg bg-muted/10">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="edit-subtotal" className="text-sm font-medium">
              Subtotal (₹)
            </Label>
            <Input
              id="edit-subtotal"
              type="number"
              min="0"
              step="0.01"
              value={tempSubtotal}
              onChange={(e) => {
                setTempSubtotal(e.target.value)
                setTimeout(recalculateFromSubtotalAndTax, 0)
              }}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="edit-tax-rate" className="text-sm font-medium">
              Tax Rate (%)
            </Label>
            <Input
              id="edit-tax-rate"
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={tempTaxRate}
              onChange={(e) => {
                setTempTaxRate(e.target.value)
                setTimeout(recalculateFromSubtotalAndTax, 0)
              }}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="edit-total" className="text-sm font-medium">
              Total (₹)
            </Label>
            <Input
              id="edit-total"
              type="number"
              min="0"
              step="0.01"
              value={tempTotal}
              onChange={(e) => setTempTotal(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={handleCancel}>
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave}>
            <Check className="h-4 w-4 mr-1" />
            Save
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/10">
      <div className="space-y-1">
        <div className="flex justify-between items-center min-w-[200px]">
          <span className="text-sm text-muted-foreground">Subtotal:</span>
          <span className="font-medium">₹{subtotal}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Tax ({(taxInfo.rate * 100).toFixed(1)}%):</span>
          <span className="font-medium">₹{taxInfo.amount}</span>
        </div>
        <div className="flex justify-between items-center border-t pt-1">
          <span className="font-medium">Total:</span>
          <span className="font-bold text-lg">₹{total}</span>
        </div>
      </div>

      <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} className="ml-4">
        <Edit3 className="h-4 w-4 mr-1" />
        <span className="hidden sm:inline">Edit</span>
      </Button>
    </div>
  )
}
