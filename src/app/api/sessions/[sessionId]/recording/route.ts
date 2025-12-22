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

    // Check if session has a recorded video
    // For now, return a placeholder response
    // In production, you would serve the actual video file or stream

    if (session.status === "stopped" && session.endTime) {
      // Return recorded video metadata
      return NextResponse.json({
        sessionId: session.id,
        type: "recorded",
        duration: Math.floor(
          (session.endTime.getTime() - session.startTime.getTime()) / 1000
        ),
        recordedAt: session.endTime.toISOString(),
        videoUrl: `/videos/sessions/${session.id}/recording.mp4`,
        message:
          "Recorded video available - integrate with your video storage service (S3, GCS, etc.)",
      });
    }

    return NextResponse.json(
      { error: "No recorded video available for this session" },
      { status: 404 }
    );
  } catch (error) {
    console.error("Failed to retrieve recording:", error);
    return NextResponse.json(
      {
        error: "Failed to retrieve recording",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
