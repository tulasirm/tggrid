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
      include: {
        user: true,
        metrics: {
          orderBy: { timestamp: "desc" },
          take: 10,
        },
      },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const capabilities = JSON.parse(session.capabilities || "{}");
    const duration = session.endTime
      ? Math.floor(
          (session.endTime.getTime() - session.startTime.getTime()) / 1000
        )
      : Math.floor((Date.now() - session.startTime.getTime()) / 1000);

    return NextResponse.json({
      id: session.id,
      status: session.status,
      browserType: session.browser,
      browser: session.browser,
      startTime: session.startTime.toISOString(),
      endTime: session.endTime?.toISOString() || null,
      duration,
      user: session.user.fullName,
      capabilities,
      metrics: session.metrics.map((m) => ({
        cpuUsage: m.cpuUsage,
        memoryUsage: m.memoryUsage,
        networkLatency: m.networkLatency,
        timestamp: m.timestamp.toISOString(),
      })),
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error(`Failed to get session info ${params.sessionId}:`, error);
    return NextResponse.json(
      { error: "Failed to get session info", details: error.message },
      { status: 500 }
    );
  }
}
