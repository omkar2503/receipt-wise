import { type NextRequest, NextResponse } from "next/server"

// This is now a proxy to the external API
export async function POST(request: NextRequest) {
  try {
    // Get the form data from the request
    const formData = await request.formData()

    // Get all files from the request
    const files = formData.getAll("files") as File[]
    const groupId = formData.get("groupId") as string

    // Check if we have any files
    if (!files || files.length === 0) {
      return NextResponse.json({ success: false, error: "No files provided" }, { status: 400 })
    }

    // Create a new FormData object to send to the external API
    const apiFormData = new FormData()

    // Add all files to the API request
    files.forEach((file, index) => {
      apiFormData.append(`files`, file)
    })

    apiFormData.append("groupId", groupId)
    apiFormData.append("multipleReceipts", "true") // Flag to indicate multiple receipts

    // Call the external API
    const response = await fetch("http://localhost:8000/imageUpload", {
      method: "POST",
      body: apiFormData,
    })

    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`)
    }

    const data = await response.json()

    // Transform the response to match our application's expected format
    const users = Object.entries(data.members).map(([name, id], index) => ({
      id: id.toString(),
      name,
      color: getColorForIndex(index),
    }))

    // Combine products from all receipts
    let allProducts = []
    let totalSubtotal = 0
    let totalTax = 0

    // Check if we have multiple receipts or a single receipt
    if (Array.isArray(data.receipt_data)) {
      // Multiple receipts
      data.receipt_data.forEach((receipt: any, receiptIndex: number) => {
        const receiptProducts = receipt.items.map((item: any, index: number) => ({
          id: `${receiptIndex}_${index}`,
          name: item.name,
          price: `$${item.cost.toFixed(2)}`,
          image: "/placeholder.svg?height=200&width=200",
        }))

        allProducts = [...allProducts, ...receiptProducts]
        totalSubtotal += receipt.total - receipt.tax
        totalTax += receipt.tax
      })
    } else {
      // Single receipt
      allProducts = data.receipt_data.items.map((item: any, index: number) => ({
        id: index.toString(),
        name: item.name,
        price: `$${item.cost.toFixed(2)}`,
        image: "/placeholder.svg?height=200&width=200",
      }))

      totalSubtotal = data.receipt_data.total - data.receipt_data.tax
      totalTax = data.receipt_data.tax
    }

    const totalAmount = totalSubtotal + totalTax
    const taxRate = totalSubtotal > 0 ? totalTax / totalSubtotal : 0

    // Get the primary receipt path from the response
    // This is the path that should be used for the expense
    const primaryReceiptPath = data.primary_receipt_path || ""

    // Also keep the array of all receipt paths for reference
    const allReceiptPaths = Array.isArray(data.receipt_path) ? data.receipt_path : [data.receipt_path || ""]

    return NextResponse.json({
      success: true,
      groupId,
      users,
      products: allProducts,
      tax: {
        rate: taxRate,
        amount: totalTax.toFixed(2),
      },
      subtotal: totalSubtotal.toFixed(2),
      total: totalAmount.toFixed(2),
      primaryReceiptPath: primaryReceiptPath,
      allReceiptPaths: allReceiptPaths,
    })
  } catch (error) {
    console.error("Error processing images:", error)
    return NextResponse.json({ success: false, error: "Failed to process images" }, { status: 500 })
  }
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
