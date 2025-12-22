import { NextRequest, NextResponse } from "next/server";
import { getAuditLogs } from "@/lib/audit-logger";

function decodeToken(token: string): string | null {
  try {
    const decodedEmail = Buffer.from(token, "base64").toString().split(":")[0];
    return decodedEmail;
  } catch {
    return null;
  }
}

/**
 * Get audit logs with optional filters
 * GET /api/audit-logs?userId=xxx&action=xxx&resourceType=xxx&startDate=xxx&endDate=xxx&limit=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.split(" ")[1];
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const email = decodeToken(token);
    if (!email) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;

    const filters: any = {};

    if (searchParams.get("userId")) {
      filters.userId = searchParams.get("userId");
    }

    if (searchParams.get("action")) {
      filters.action = searchParams.get("action");
    }

    if (searchParams.get("resourceType")) {
      filters.resourceType = searchParams.get("resourceType");
    }

    if (searchParams.get("startDate")) {
      filters.startDate = new Date(searchParams.get("startDate")!);
    }

    if (searchParams.get("endDate")) {
      filters.endDate = new Date(searchParams.get("endDate")!);
    }

    const limit = searchParams.get("limit")
      ? parseInt(searchParams.get("limit")!)
      : 100;

    const logs = await getAuditLogs(filters, limit);

    return NextResponse.json({
      success: true,
      logs,
      count: logs.length,
    });
  } catch (error) {
    console.error("Failed to get audit logs:", error);
    return NextResponse.json(
      { error: "Failed to retrieve audit logs" },
      { status: 500 }
    );
  }
}
