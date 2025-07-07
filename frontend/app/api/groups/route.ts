import { NextResponse } from "next/server"

// Mock groups data - in a real application, this would come from a database
const GROUPS_DATA = {
  "0": {
    id: 0,
    name: "Non-group expenses",
  },
  "12345678": {
    id: 12345678,
    name: "SPIT-2026",
  },
  "87654321": {
    id: 87654321,
    name: "SPIT-2027",
  },
}

// Fallback groups data for use when external API fails
const FALLBACK_GROUPS = Object.values(GROUPS_DATA);

// Get the API base URL from environment variables with fallback
const API_BASE_URL = process.env.SPLIT_API_BASE_URL || 'http://localhost:8000'


export async function GET() {
  try {
    // Make a call to the external groups endpoint
    const response = await fetch(`${API_BASE_URL}/groups`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      let errorBody = await response.text();
      console.error(`External API error body:`, errorBody);
      throw new Error(`External API responded with status: ${response.status}`)
    }

    const data = await response.json()

    // Return the groups data from the external API
    return NextResponse.json({
      status: "success",
      groups: data.groups || {},
    })
  } catch (error) {
    console.error("Error fetching groups from external API:", error)

    // Return fallback groups data if the external API call fails
    return NextResponse.json({
      status: "success",
      groups: FALLBACK_GROUPS,
      _note: "Using fallback data due to external API error",
    })
  }
}
