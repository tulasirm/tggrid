import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const BROWSER_POOL_URL =
  process.env.BROWSER_POOL_URL || "http://localhost:3002";

function decodeToken(token: string): string | null {
  try {
    const decodedEmail = Buffer.from(token, "base64").toString().split(":")[0];
    return decodedEmail;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Verify authentication
    const token = request.headers.get("authorization")?.split(" ")[1];
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const email = decodeToken(token);
    if (!email) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const user = await db.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const { browserType = "chrome", capabilities = {} } = body;

    // Get browser from ultra-fast pool
    let browserInfo;
    try {
      const poolResponse = await fetch(`${BROWSER_POOL_URL}/browser`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ browserType }),
      });

      if (!poolResponse.ok) {
        throw new Error(`Browser pool error: ${poolResponse.status}`);
      }

      browserInfo = await poolResponse.json();
    } catch (poolError) {
      console.error("Browser pool error:", poolError);
      return NextResponse.json(
        {
          error: "Failed to get browser from pool",
          details:
            poolError instanceof Error ? poolError.message : "Unknown error",
        },
        { status: 503 }
      );
    }

    // Create session record in database
    const session = await db.browserSession.create({
      data: {
        userId: user.id,
        browser: browserType,
        status: "running",
        capabilities: JSON.stringify({
          ...capabilities,
          directCDP: true,
          pooledContainer: true,
          ultraFast: true,
          cdpUrl: browserInfo.cdpUrl,
          wsEndpoint: browserInfo.wsEndpoint,
          port: browserInfo.port,
        }),
        vncEnabled: true,
        videoEnabled: false,
        resolution: "1920x1080",
      },
    });

    const totalTime = Date.now() - startTime;

    return NextResponse.json({
      id: session.id,
      sessionId: session.id,
      userId: session.userId,
      browserType,
      status: "running",
      startTime: session.startTime.toISOString(),
      createdAt: session.createdAt.toISOString(),
      creationTime: totalTime,
      // Real browser connection info
      cdpUrl: browserInfo.cdpUrl,
      wsEndpoint: browserInfo.wsEndpoint,
      port: browserInfo.port,
      webdriverUrl: `http://localhost:4444/wd/hub/session/${session.id}`,
      capabilities: {
        ...capabilities,
        directCDP: true,
        pooledContainer: true,
        ultraFast: true,
        cdpUrl: browserInfo.cdpUrl,
        wsEndpoint: browserInfo.wsEndpoint,
        port: browserInfo.port,
      },
    });
  } catch (error) {
    console.error("Failed to create ultra-fast session:", error);
    return NextResponse.json(
      {
        error: "Failed to create browser session",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.headers.get("authorization")?.split(" ")[1];
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const email = decodeToken(token);
    if (!email) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const user = await db.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get ultra-fast sessions for user
    const sessions = await db.browserSession.findMany({
      where: {
        userId: user.id,
        capabilities: {
          contains: '"ultraFast":true',
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      sessions: sessions.map((s) => ({
        id: s.id,
        browser: s.browser,
        status: s.status,
        startTime: s.startTime.toISOString(),
        duration: s.duration,
        capabilities:
          typeof s.capabilities === "string"
            ? JSON.parse(s.capabilities)
            : s.capabilities,
        createdAt: s.createdAt.toISOString(),
      })),
      total: sessions.length,
    });
  } catch (error) {
    console.error("Failed to get ultra-fast sessions:", error);
    return NextResponse.json(
      {
        error: "Failed to get sessions",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
