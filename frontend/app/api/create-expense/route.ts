import { type NextRequest, NextResponse } from "next/server"

// This is now a proxy to the external API
export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const expenseData = await request.json()

    // Ensure receiptPath is valid before sending to external API
    if (!expenseData.receiptPath) {
      expenseData.receiptPath = "" // Set empty string if missing
    }

    // The request body should already be in the correct format
    // Just forward it to the external API
    const response = await fetch("http://localhost:8000/expenses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(expenseData),
    })

    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`)
    }

    const data = await response.json()

    return NextResponse.json({
      success: true,
      message: "Expense created successfully",
      expenseId: data.id || "exp_" + Date.now(),
    })
  } catch (error) {
    console.error("Error creating expense:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create expense",
      },
      { status: 500 },
    )
  }
}
