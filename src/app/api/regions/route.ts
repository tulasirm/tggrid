import { NextRequest, NextResponse } from "next/server";
import { getAvailableRegions, getCurrentRegion } from "@/lib/multi-region";

/**
 * Get all available regions
 * GET /api/regions
 */
export async function GET(request: NextRequest) {
  try {
    const regions = getAvailableRegions();
    const currentRegion = getCurrentRegion();

    return NextResponse.json({
      success: true,
      currentRegion,
      regions: regions.map((region) => ({
        name: region.name,
        displayName: region.displayName,
        endpoint: region.endpoint,
        isPrimary: region.isPrimary,
        isActive: region.isActive,
      })),
    });
  } catch (error) {
    console.error("Failed to get regions:", error);
    return NextResponse.json(
      { error: "Failed to get regions" },
      { status: 500 }
    );
  }
}
