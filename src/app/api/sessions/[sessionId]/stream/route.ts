import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const sessionId = params.sessionId;

    // Get session from database
    const session = await db.browserSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Check if session is running
    if (session.status !== "running") {
      return NextResponse.json(
        { error: "Session is not running - no live stream available" },
        { status: 400 }
      );
    }

    // Return live stream metadata
    // In production, this would establish a WebSocket connection or return an MJPEG stream
    return NextResponse.json({
      sessionId: session.id,
      type: "live",
      browser: session.browser,
      status: session.status,
      streamUrl: `ws://localhost:3001/sessions/${session.id}/stream`,
      message:
        "Live stream endpoint - connect via WebSocket for real-time video feed",
      cdpUrl: session.cdpUrl, // If available from browser pool
      wsEndpoint: session.wsEndpoint, // If available from browser pool
    });
  } catch (error) {
    console.error("Failed to get stream:", error);
    return NextResponse.json(
      {
        error: "Failed to get stream",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
