import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { sessionId } = params;

    // Get current session to check status
    const session = await db.browserSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Determine new status based on current status
    const newStatus = session.status === "running" ? "idle" : "running";

    // Update session status in database
    const updatedSession = await db.browserSession.update({
      where: { id: sessionId },
      data: {
        status: newStatus,
      },
    });

    return NextResponse.json({
      success: true,
      sessionId,
      message:
        newStatus === "idle"
          ? "Session paused successfully"
          : "Session resumed successfully",
      timestamp: new Date().toISOString(),
      session: {
        id: updatedSession.id,
        status: updatedSession.status,
        previousStatus: session.status,
      },
    });
  } catch (error) {
    console.error(`Failed to pause/resume session:`, error);
    return NextResponse.json(
      {
        error: "Failed to pause/resume session",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
