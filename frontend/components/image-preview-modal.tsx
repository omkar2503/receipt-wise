"use client"

import { X } from "lucide-react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { withErrorBoundary } from "./error-boundary"

interface ImagePreviewModalProps {
  imageUrl: string
  onClose: () => void
}

function ImagePreviewModalComponent({ imageUrl, onClose }: ImagePreviewModalProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-2 sm:p-4" onClick={onClose}>
      <div className="relative max-w-[95vw] sm:max-w-3xl w-full h-auto max-h-[90vh] sm:max-h-[85vh] bg-background rounded-lg overflow-hidden">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 z-10 bg-background/80 hover:bg-background rounded-full h-8 w-8 sm:h-10 sm:w-10"
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}
        >
          <X className="h-4 w-4 sm:h-5 sm:w-5" />
        </Button>
        <div className="relative w-full h-full" onClick={(e) => e.stopPropagation()}>
          <div className="relative w-full h-[70vh] sm:h-[75vh]">
            <Image
              src={imageUrl || "/placeholder.svg"}
              alt="Receipt preview"
              fill
              className="object-contain"
              onError={(e) => {
                // Fallback if image fails to load
                const target = e.target as HTMLImageElement
                target.src = "/placeholder.svg"
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export const ImagePreviewModal = withErrorBoundary(ImagePreviewModalComponent)
