import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    // Get all active browser sessions from database
    const sessions = await db.browserSession.findMany({
      where: { status: { in: ["running", "idle"] } },
      include: { user: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const formattedSessions = sessions.map((s) => ({
      id: s.id,
      browserType: s.browser,
      browser: s.browser,
      status: s.status,
      startTime: s.startTime.toISOString(),
      duration: Math.floor((Date.now() - s.startTime.getTime()) / 1000),
      user: s.user.fullName,
      capabilities: JSON.parse(s.capabilities || "{}"),
      userId: s.userId,
      createdAt: s.createdAt.toISOString(),
    }));

    return NextResponse.json({
      sessions: formattedSessions,
      total: formattedSessions.length,
      active: formattedSessions.filter((s) => s.status === "running").length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to get sessions:", error);
    return NextResponse.json(
      { error: "Failed to get sessions", details: error.message },
      { status: 500 }
    );
  }
}
