/**
 * License usage endpoint
 * GET /api/license/usage
 */

import { NextRequest, NextResponse } from "next/server";
import { globalUsageTracker } from "@/lib/licensing/usage-tracker";

export async function GET(request: NextRequest) {
  try {
    const organizationId = request.nextUrl.searchParams.get("org");
    const daysBack = parseInt(request.nextUrl.searchParams.get("days") || "30");

    if (!organizationId) {
      return NextResponse.json(
        {
          error: "Organization ID is required",
          code: "MISSING_ORG_ID",
        },
        { status: 400 }
      );
    }

    const metrics = globalUsageTracker.getMetrics(organizationId);
    const summary = globalUsageTracker.getSummary(organizationId, daysBack);

    return NextResponse.json({
      status: "success",
      data: {
        metrics,
        summary,
      },
    });
  } catch (error) {
    console.error("Usage tracking error:", error);
    return NextResponse.json(
      {
        error: "Failed to retrieve usage metrics",
        code: "USAGE_ERROR",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { organizationId, tier, eventType, metadata } = body;

    if (!organizationId || !tier || !eventType) {
      return NextResponse.json(
        {
          error: "Missing required fields: organizationId, tier, eventType",
          code: "MISSING_FIELDS",
        },
        { status: 400 }
      );
    }

    // Record the event
    globalUsageTracker.recordEvent(organizationId, tier, {
      type: eventType,
      timestamp: new Date(),
      metadata: metadata || {},
    });

    return NextResponse.json({
      status: "success",
      message: "Event recorded successfully",
    });
  } catch (error) {
    console.error("Event recording error:", error);
    return NextResponse.json(
      {
        error: "Failed to record usage event",
        code: "RECORDING_ERROR",
      },
      { status: 500 }
    );
  }
}
