import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import os from "os";

async function checkServiceHealth(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      signal: controller.signal,
      method: "GET",
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    return false;
  }
}

async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await db.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

export async function GET() {
  const startTime = Date.now();

  try {
    // Check all services in parallel
    const [browserPoolHealthy, databaseHealthy] = await Promise.all([
      checkServiceHealth(
        `http://localhost:${process.env.BROWSER_POOL_PORT || 3002}/health`
      ),
      checkDatabaseHealth(),
    ]);

    const responseTime = Date.now() - startTime;

    // Calculate real system metrics
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const memoryUsage = ((totalMem - freeMem) / totalMem) * 100;

    const cpus = os.cpus();
    const cpuUsage =
      cpus.reduce((acc, cpu) => {
        const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
        const idle = cpu.times.idle;
        return acc + ((total - idle) / total) * 100;
      }, 0) / cpus.length;

    // Get active connections from database
    let activeConnections = 0;
    try {
      const sessions = await db.browserSession.count({
        where: { status: "running" },
      });
      activeConnections = sessions;
    } catch {
      activeConnections = 0;
    }

    const allHealthy = browserPoolHealthy && databaseHealthy;

    // System health check
    const healthStatus = {
      status: allHealthy ? "healthy" : "unhealthy",
      timestamp: new Date().toISOString(),
      version: "2.0.1",
      uptime: process.uptime(),
      services: {
        mainApp: "healthy",
        browserPool: browserPoolHealthy ? "healthy" : "unhealthy",
        cdpClient: browserPoolHealthy ? "healthy" : "unhealthy",
        database: databaseHealthy ? "healthy" : "unhealthy",
        docker: "unknown",
      },
      performance: {
        cpuUsage: Math.round(cpuUsage * 10) / 10,
        memoryUsage: Math.round(memoryUsage * 10) / 10,
        activeConnections,
        responseTime,
      },
      configuration: {
        nodeEnv: process.env.NODE_ENV || "development",
        port: process.env.PORT || 3000,
        browserPoolEnabled: browserPoolHealthy,
        ultraFastMode: true,
        maxSessions: parseInt(process.env.BROWSER_POOL_SIZE || "50"),
      },
    };

    return NextResponse.json(healthStatus);
  } catch (error) {
    console.error("Health check failed:", error);
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error.message,
      },
      { status: 500 }
    );
  }
}
