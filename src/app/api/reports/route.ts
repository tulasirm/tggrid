import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const reports = await db.report.findMany({
      include: { template: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(reports);
  } catch (error) {
    console.error("Failed to get reports:", error);
    return NextResponse.json(
      { error: "Failed to get reports" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const report = await db.report.create({
      data: {
        name: body.name || "Untitled Report",
        type: body.type || "performance",
        data: body.data ? JSON.stringify(body.data) : "{}",
        status: "completed",
        generatedAt: new Date(),
      },
      include: { template: true },
    });

    return NextResponse.json(report, { status: 201 });
  } catch (error) {
    console.error("Failed to create report:", error);
    return NextResponse.json(
      { error: "Failed to create report" },
      { status: 500 }
    );
  }
}
