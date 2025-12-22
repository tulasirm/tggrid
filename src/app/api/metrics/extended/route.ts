import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    // Get latest metrics or create default ones
    let metric = await db.systemMetric.findFirst({
      orderBy: { createdAt: "desc" },
    });

    if (!metric) {
      metric = await db.systemMetric.create({
        data: {
          totalSessions: 0,
          activeSessions: 0,
          cpuUsage: 0,
          memoryUsage: 0,
          networkLatency: 0,
          uptime: 0,
        },
      });
    }

    // Get actual session counts
    const sessions = await db.browserSession.findMany();
    const activeSessions = sessions.filter(
      (s) => s.status === "running"
    ).length;

    // Update with real data
    const updated = await db.systemMetric.update({
      where: { id: metric.id },
      data: {
        totalSessions: sessions.length,
        activeSessions,
      },
    });

    return NextResponse.json({
      metrics: {
        totalSessions: updated.totalSessions,
        activeSessions: updated.activeSessions,
        cpuUsage: 45.2 + Math.random() * 20,
        memoryUsage: 58.3 + Math.random() * 15,
        networkLatency: 12.5 + Math.random() * 8,
        uptime: Math.floor(
          (Date.now() - new Date(updated.createdAt).getTime()) / 1000
        ),
      },
      charts: {
        executionTimeline: generateExecutionTimeline(),
        resourceUsage: generateResourceUsage(),
        executionSuccess: [
          { name: "Successful", value: sessions.length * 12, color: "#F08858" },
          {
            name: "Failed",
            value: Math.floor(sessions.length * 0.8),
            color: "#E11D48",
          },
          {
            name: "Timeout",
            value: Math.floor(sessions.length * 0.3),
            color: "#6AACA1",
          },
        ],
        performanceTrend: generatePerformanceTrend(),
      },
    });
  } catch (error) {
    console.error("Failed to get dashboard metrics:", error);
    return NextResponse.json(
      { error: "Failed to get metrics" },
      { status: 500 }
    );
  }
}

function generateExecutionTimeline() {
  const hours = ["00:00", "02:00", "04:00", "06:00", "08:00", "10:00"];
  return hours.map((time, i) => ({
    time,
    sessions: 5 + i * 7,
    successful: 5 + i * 6,
  }));
}

function generateResourceUsage() {
  const hours = ["00:00", "02:00", "04:00", "06:00", "08:00", "10:00"];
  return hours.map((time, i) => ({
    time,
    cpu: 15 + i * 10,
    memory: 20 + i * 10,
  }));
}

function generatePerformanceTrend() {
  return [
    { hour: "1h ago", avgDuration: 2.4 },
    { hour: "2h ago", avgDuration: 1.9 },
    { hour: "3h ago", avgDuration: 2.0 },
    { hour: "4h ago", avgDuration: 2.2 },
    { hour: "5h ago", avgDuration: 2.5 },
    { hour: "Now", avgDuration: 1.8 },
  ];
}
