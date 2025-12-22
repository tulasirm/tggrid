import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createReadStream, existsSync, statSync } from "fs";
import { join } from "path";

/**
 * Get video recording for a session
 * GET /api/sessions/[sessionId]/video
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { sessionId } = params;

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    // Get session from database
    const session = await db.browserSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Check if video recording exists
    const recordingsDir = process.env.RECORDINGS_DIR || "/tmp/recordings";
    const videoPath = join(recordingsDir, `session-${sessionId}.mp4`);

    if (!existsSync(videoPath)) {
      return NextResponse.json(
        {
          error: "Video recording not available",
          message: "Recording may not be enabled or session is still active",
        },
        { status: 404 }
      );
    }

    // Get file stats
    const stats = statSync(videoPath);
    const fileSize = stats.size;

    // Check if it's a range request
    const range = request.headers.get("range");

    if (range) {
      // Handle video streaming with range requests
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      const stream = createReadStream(videoPath, { start, end });

      return new NextResponse(stream as any, {
        status: 206,
        headers: {
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunkSize.toString(),
          "Content-Type": "video/mp4",
        },
      });
    }

    // Full file download
    const stream = createReadStream(videoPath);

    return new NextResponse(stream as any, {
      status: 200,
      headers: {
        "Content-Length": fileSize.toString(),
        "Content-Type": "video/mp4",
        "Content-Disposition": `attachment; filename="session-${sessionId}.mp4"`,
      },
    });
  } catch (error) {
    console.error("Video download error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve video recording" },
      { status: 500 }
    );
  }
}

/**
 * Delete video recording for a session
 * DELETE /api/sessions/[sessionId]/video
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { sessionId } = params;

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    const recordingsDir = process.env.RECORDINGS_DIR || "/tmp/recordings";
    const videoPath = join(recordingsDir, `session-${sessionId}.mp4`);

    if (!existsSync(videoPath)) {
      return NextResponse.json(
        { error: "Video recording not found" },
        { status: 404 }
      );
    }

    // Delete the file
    const { unlinkSync } = await import("fs");
    unlinkSync(videoPath);

    return NextResponse.json({
      success: true,
      message: "Video recording deleted successfully",
    });
  } catch (error) {
    console.error("Video deletion error:", error);
    return NextResponse.json(
      { error: "Failed to delete video recording" },
      { status: 500 }
    );
  }
}
