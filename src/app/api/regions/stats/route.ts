import { NextRequest, NextResponse } from "next/server";
import { getAvailableRegions, getRegionStats } from "@/lib/multi-region";

/**
 * Get statistics for all regions
 * GET /api/regions/stats
 */
export async function GET(request: NextRequest) {
  try {
    const regions = getAvailableRegions();

    const stats = await Promise.all(
      regions.map((region) => getRegionStats(region.name))
    );

    return NextResponse.json({
      success: true,
      stats: stats.filter((stat) => stat !== null),
    });
  } catch (error) {
    console.error("Failed to get region stats:", error);
    return NextResponse.json(
      { error: "Failed to get region stats" },
      { status: 500 }
    );
  }
}
