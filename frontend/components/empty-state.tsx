"use client"

import { Upload, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

interface EmptyStateProps {
  type: "upload" | "products" | "error"
  message: string
  subMessage?: string
  action?: () => void
  actionLabel?: string
}

export function EmptyState({ type, message, subMessage, action, actionLabel }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-4 text-center border-2 border-dashed rounded-lg bg-muted/20">
      <div className="mb-4 rounded-full bg-muted p-3">
        {type === "upload" && <Upload className="h-6 w-6 text-muted-foreground" />}
        {type === "error" && <AlertCircle className="h-6 w-6 text-destructive" />}
        {type === "products" && <AlertCircle className="h-6 w-6 text-amber-500" />}
      </div>
      <h3 className="text-lg font-medium mb-1">{message}</h3>
      {subMessage && <p className="text-sm text-muted-foreground mb-4">{subMessage}</p>}
      {action && actionLabel && (
        <Button onClick={action} variant={type === "error" ? "destructive" : "default"}>
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
