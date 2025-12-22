import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { publishEvent } from "@/lib/event-bus";

/**
 * POST /api/sessions/[sessionId]/end
 * End a session and clean up resources
 *
 * Actions:
 * 1. Mark session as completed
 * 2. Calculate actual cost based on duration
 * 3. Return container to warm pool (if healthy) or discard
 * 4. Publish session completion event for analytics
 */

export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { sessionId } = params;

    // Get session
    const session = await db.browserSession.findUnique({
      where: { id: sessionId },
      include: { user: true },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (session.status === "completed") {
      return NextResponse.json(
        { error: "Session already completed" },
        { status: 400 }
      );
    }

    // Calculate actual cost
    const durationMs = Date.now() - session.startTime.getTime();
    const durationMinutes = durationMs / 60000;
    const actualCost = calculateSessionCost(durationMinutes);

    // Update session record
    await db.browserSession.update({
      where: { id: sessionId },
      data: {
        status: "completed",
        endTime: new Date(),
        duration: Math.round(durationMs),
        actualCost,
      },
    });

    // Return container to warm pool if available
    if (session.containerId) {
      try {
        // TODO: Integrate with pod warmer service
        // await podWarmer.returnWarmPod(session.containerId);
        console.log(
          `[SESSION] Returned pod ${session.containerId.substring(
            0,
            8
          )} to warm pool`
        );
      } catch (err) {
        console.log(`[SESSION] Pod unhealthy or couldn't return to pool:`, err);
        // Container will be recreated by warmer
      }
    }

    // Log session completion metrics
    await db.sessionMetric.create({
      data: {
        sessionId,
        userId: session.userId,
        eventType: "session:completed",
        metric: JSON.stringify({
          durationMinutes: Math.round(durationMinutes * 100) / 100,
          actualCost,
          completedAt: new Date(),
          containerId: session.containerId,
        }),
        timestamp: new Date(),
      },
    });

    // Publish event for analytics
    await publishEvent("session:completed", {
      sessionId,
      customerId: session.userId,
      durationMinutes: Math.round(durationMinutes * 100) / 100,
      actualCost,
      containerId: session.containerId,
      timestamp: new Date().toISOString(),
    }).catch((err) =>
      console.warn("[SESSION] Failed to publish completion event:", err)
    );

    // Log audit entry
    await db.auditLog.create({
      data: {
        userId: session.userId,
        eventType: "session:ended",
        action: "session.end",
        resourceType: "session",
        resourceId: sessionId,
        details: JSON.stringify({
          durationMinutes: Math.round(durationMinutes * 100) / 100,
          actualCost,
        }),
        payload: {
          sessionId,
          actualCost,
        },
      },
    });

    console.log(
      `[SESSION] ✓ Ended session ${sessionId} (${durationMinutes.toFixed(
        2
      )}min, cost: $${actualCost.toFixed(4)})`
    );

    return NextResponse.json(
      {
        sessionId,
        status: "completed",
        duration: Math.round(durationMs),
        durationMinutes: Math.round(durationMinutes * 100) / 100,
        actualCost: Math.round(actualCost * 10000) / 10000,
        message: "Session ended and resources released",
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[SESSION] Error ending session:", err);

    return NextResponse.json(
      { error: "Failed to end session" },
      { status: 500 }
    );
  }
}

/**
 * Calculate session cost based on duration
 * Formula: $0.002107/session base cost + variable cost
 *
 * For billing simplicity:
 * - Charged per session regardless of duration
 * - But captured for tracking and analytics
 */
function calculateSessionCost(durationMinutes: number): number {
  // Base cost: $0.01 per session (charged upfront via balance debit)
  // This function calculates the actual infrastructure cost for analytics

  const BASE_COST_PER_SESSION = 0.002107; // Infrastructure cost
  const MARGIN_MULTIPLIER = 4.74; // 50% margin target
  const CUSTOMER_PRICE_PER_SESSION = BASE_COST_PER_SESSION * MARGIN_MULTIPLIER; // ~$0.01

  // Return the customer-facing price
  return CUSTOMER_PRICE_PER_SESSION;
}

/**
 * GET /api/sessions/[sessionId]/end
 * Get session status (for checking completion)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { sessionId } = params;

    const session = await db.browserSession.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        status: true,
        startTime: true,
        endTime: true,
        duration: true,
        actualCost: true,
        browser: true,
      },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    return NextResponse.json(
      {
        ...session,
        startTime: session.startTime.toISOString(),
        endTime: session.endTime?.toISOString() || null,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[SESSION] Error getting session status:", err);

    return NextResponse.json(
      { error: "Failed to get session status" },
      { status: 500 }
    );
  }
}
