import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { publishEvent } from "@/lib/event-bus";
import { v4 as uuidv4 } from "uuid";

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

/**
 * POST /api/sessions/create
 * Create a new browser session with billing/payment verification
 *
 * Checks:
 * 1. User is authenticated
 * 2. User has active subscription
 * 3. User has sufficient account balance
 * 4. Kubernetes resources are allocated
 */
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

    // ✅ CHECK 1: Subscription is active
    if (user.subscriptionStatus !== "active") {
      return NextResponse.json(
        {
          error: "Subscription not active",
          status: user.subscriptionStatus,
          message: "Please upgrade your subscription to use sessions",
        },
        { status: 402 } // Payment Required
      );
    }

    // ✅ CHECK 2: Account has balance
    if (user.accountBalance <= 0) {
      return NextResponse.json(
        {
          error: "Insufficient balance",
          currentBalance: user.accountBalance,
          requiredBalance: 1,
          message: "Please top up your account or wait for monthly renewal",
        },
        { status: 402 } // Payment Required
      );
    }

    // ✅ CHECK 3: Kubernetes resources allocated
    if (!user.resourcesAllocated || !user.k8sNamespace) {
      return NextResponse.json(
        {
          error: "Resources not allocated",
          message:
            "Your Kubernetes resources are being provisioned. Please wait 1-2 minutes.",
        },
        { status: 503 } // Service Unavailable
      );
    }

    const body = await request.json();
    const {
      browser = "chrome",
      vncEnabled = true,
      videoEnabled = true,
      resolution = "1920x1080",
    } = body;

    // Generate session ID
    const sessionId = `session-${uuidv4()}`;

    // Get browser from pool
    let browserInfo;
    let isWarmPod = false;
    try {
      const poolResponse = await fetch(`${BROWSER_POOL_URL}/browser`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          browserType: browser,
          customerId: user.id,
          isWarmPool: true, // Request warm pod if available
        }),
      });

      if (!poolResponse.ok) {
        throw new Error(`Browser pool error: ${poolResponse.status}`);
      }

      browserInfo = await poolResponse.json();
      isWarmPod = browserInfo.isWarmPod || false;
    } catch (poolError) {
      console.warn(
        "Browser pool unavailable, creating database record only:",
        poolError
      );
      browserInfo = null;
    }

    // Create browser session in database
    const session = await db.browserSession.create({
      data: {
        id: sessionId,
        userId: user.id,
        browser,
        status: "active",
        containerId: browserInfo?.containerId,
        cdpUrl: browserInfo?.cdpUrl,
        capabilities: JSON.stringify({
          enableVNC: vncEnabled,
          enableVideo: videoEnabled,
          resolution,
          isWarmPod,
          ...(browserInfo && {
            directCDP: true,
            cdpUrl: browserInfo.cdpUrl,
            wsEndpoint: browserInfo.wsEndpoint,
            port: browserInfo.port,
          }),
        }),
        vncEnabled,
        videoEnabled,
        resolution,
        costEstimate: 0.01, // $0.01 per session
      },
    });

    // ✅ DEBIT: Remove 1 session credit from balance
    const newBalance = user.accountBalance - 1;
    await db.user.update({
      where: { id: user.id },
      data: { accountBalance: newBalance },
    });

    // Log transaction
    await db.transaction.create({
      data: {
        userId: user.id,
        type: "debit",
        amount: 1,
        description: `Session ${sessionId} created (${
          isWarmPod ? "warm" : "on-demand"
        } pod)`,
        balanceAfter: newBalance,
        sessionId,
        timestamp: new Date(),
      },
    });

    const totalTime = Date.now() - startTime;

    // Publish event for analytics
    await publishEvent("session:started", {
      sessionId,
      customerId: user.id,
      containerId: browserInfo?.containerId,
      isWarmPod,
      browser,
      costEstimate: 0.01,
      timestamp: new Date().toISOString(),
    }).catch((err) => console.warn("[SESSION] Failed to publish event:", err));

    // Log audit entry
    await db.auditLog.create({
      data: {
        userId: user.id,
        eventType: "session:created",
        action: "session.create",
        resourceType: "session",
        resourceId: session.id,
        details: JSON.stringify({
          browser,
          resolution,
          vncEnabled,
          videoEnabled,
          isWarmPod,
        }),
        payload: {
          sessionId,
          newBalance,
        },
      },
    });

    console.log(
      `[SESSION] ✓ Created session ${sessionId} for user ${user.id} (${
        isWarmPod ? "warm" : "on-demand"
      })`
    );

    const sessionData: any = {
      id: session.id,
      userId: session.userId,
      webdriverUrl: `http://localhost:4444/wd/hub/session/${session.id}`,
      vncUrl: `ws://localhost:3001/vnc/${session.id}`,
      status: session.status,
      createdAt: session.createdAt.toISOString(),
      browser: session.browser,
      version: "latest",
      platform: "linux",
      capabilities: JSON.parse(session.capabilities),
      creationTime: totalTime,
      costPerSession: 0.01,
      accountBalance: newBalance,
      remainingSessions: Math.floor(newBalance),
      isWarmPod,
    };

    // Add real browser connection info if available
    if (browserInfo) {
      sessionData.cdpUrl = browserInfo.cdpUrl;
      sessionData.wsEndpoint = browserInfo.wsEndpoint;
      sessionData.port = browserInfo.port;
    }

    return NextResponse.json(sessionData, { status: 201 });
  } catch (error) {
    console.error("Failed to create session:", error);

    // Publish error event
    await publishEvent("error:session-creation", {
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    }).catch((err) =>
      console.warn("[SESSION] Failed to publish error event:", err)
    );

    return NextResponse.json(
      {
        error: "Failed to create browser session",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/sessions/create
 * List user's sessions
 */
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

    // Get user's sessions from database
    const sessions = await db.browserSession.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      sessions: sessions.map((s) => ({
        id: s.id,
        browser: s.browser,
        status: s.status,
        userId: s.userId,
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
    console.error("Failed to fetch sessions:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch sessions",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
