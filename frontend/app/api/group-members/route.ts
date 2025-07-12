import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const groupId = searchParams.get("group_id")

    if (!groupId) {
      return NextResponse.json(
        { success: false, error: "Group ID is required" },
        { status: 400 }
      )
    }

    // Call the backend API
    const response = await fetch(`http://localhost:8000/group_members?group_id=${groupId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      console.error(`Backend API error: ${response.status} ${response.statusText}`)
      return NextResponse.json(
        { success: false, error: "Failed to fetch group members" },
        { status: response.status }
      )
    }

    const data = await response.json()

    // Transform the response to match our frontend expectations
    const members = (data.members || []).map((member: any) => ({
      id: member.id.toString(),
      first_name: member.first_name || "",
      last_name: member.last_name || "",
      name: `${member.first_name || ""}${member.last_name ? " " + member.last_name : ""}`.trim() || "Unknown User",
      email: member.email || "",
    }))

    return NextResponse.json({
      success: true,
      members,
    })
  } catch (error) {
    console.error("Error fetching group members:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch group members" },
      { status: 500 }
    )
  }
} 