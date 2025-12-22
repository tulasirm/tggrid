import { db } from "./db";

interface RecordingMetadata {
  sessionId: string;
  startTime: Date;
  endTime?: Date;
  fileSize?: number;
  duration?: number;
  filePath: string;
}

/**
 * Start video recording for a session
 */
export async function startRecording(
  sessionId: string
): Promise<RecordingMetadata> {
  const metadata: RecordingMetadata = {
    sessionId,
    startTime: new Date(),
    filePath: `/recordings/session-${sessionId}.mp4`,
  };

  // Update session with recording metadata
  await db.browserSession.update({
    where: { id: sessionId },
    data: {
      videoUrl: metadata.filePath,
    },
  });

  return metadata;
}

/**
 * Stop video recording for a session
 */
export async function stopRecording(
  sessionId: string
): Promise<RecordingMetadata | null> {
  try {
    const session = await db.browserSession.findUnique({
      where: { id: sessionId },
    });

    if (!session || !session.videoUrl) {
      return null;
    }

    const metadata: RecordingMetadata = {
      sessionId,
      startTime: session.createdAt,
      endTime: new Date(),
      filePath: session.videoUrl,
    };

    // Calculate duration
    metadata.duration = Math.floor(
      (metadata.endTime.getTime() - metadata.startTime.getTime()) / 1000
    );

    return metadata;
  } catch (error) {
    console.error("Stop recording error:", error);
    return null;
  }
}

/**
 * Get recording status for a session
 */
export async function getRecordingStatus(sessionId: string): Promise<{
  isRecording: boolean;
  videoUrl?: string;
  startTime?: Date;
  duration?: number;
} | null> {
  try {
    const session = await db.browserSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return null;
    }

    const isRecording = session.status === "running" && !!session.videoUrl;

    return {
      isRecording,
      videoUrl: session.videoUrl || undefined,
      startTime: session.createdAt,
      duration: isRecording
        ? Math.floor((Date.now() - session.createdAt.getTime()) / 1000)
        : undefined,
    };
  } catch (error) {
    console.error("Get recording status error:", error);
    return null;
  }
}

/**
 * List all recordings
 */
export async function listRecordings(
  userId?: string
): Promise<RecordingMetadata[]> {
  try {
    const where = userId ? { userId } : {};

    const sessions = await db.browserSession.findMany({
      where: {
        ...where,
        videoUrl: {
          not: null,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 100,
    });

    return sessions.map((session) => ({
      sessionId: session.id,
      startTime: session.createdAt,
      endTime: session.endTime || undefined,
      filePath: session.videoUrl!,
      duration: session.endTime
        ? Math.floor(
            (session.endTime.getTime() - session.createdAt.getTime()) / 1000
          )
        : undefined,
    }));
  } catch (error) {
    console.error("List recordings error:", error);
    return [];
  }
}

/**
 * Delete old recordings (cleanup)
 */
export async function cleanupOldRecordings(
  daysOld: number = 7
): Promise<number> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const oldSessions = await db.browserSession.findMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
        videoUrl: {
          not: null,
        },
      },
    });

    // Delete video files and update database
    const { unlinkSync, existsSync } = await import("fs");
    const { join } = await import("path");

    let deletedCount = 0;
    const recordingsDir = process.env.RECORDINGS_DIR || "/tmp/recordings";

    for (const session of oldSessions) {
      if (session.videoUrl) {
        const videoPath = join(recordingsDir, `session-${session.id}.mp4`);

        if (existsSync(videoPath)) {
          unlinkSync(videoPath);
          deletedCount++;
        }

        // Clear video URL from database
        await db.browserSession.update({
          where: { id: session.id },
          data: { videoUrl: null },
        });
      }
    }

    return deletedCount;
  } catch (error) {
    console.error("Cleanup recordings error:", error);
    return 0;
  }
}
