/**
 * License tiers endpoint
 * GET /api/license/tiers
 */

import { NextRequest, NextResponse } from "next/server";
import { getAvailableTiers } from "@/lib/licensing/tiers";

export async function GET(request: NextRequest) {
  try {
    const tiers = getAvailableTiers();

    return NextResponse.json({
      status: "success",
      data: {
        tiers: tiers.map((tier) => ({
          tier: tier.tier,
          displayName: tier.displayName,
          price: tier.price,
          period: tier.period,
          description: tier.description,
          maxConcurrentBrowsers: tier.maxConcurrentBrowsers,
          features: {
            maxSessions: tier.features.maxSessions,
            maxSessionsPerMonth: tier.features.maxSessionsPerMonth,
            supportedBrowsers: tier.features.supportedBrowsers,
            regions: tier.features.regions,
            advancedMonitoring: tier.features.advancedMonitoring,
            apiAccess: tier.features.apiAccess,
            auditLogs: tier.features.auditLogs,
            autoScaling: tier.features.autoScaling,
            customIntegration: tier.features.customIntegration,
            dedicatedSupport: tier.features.dedicatedSupport,
            slaGuarantee: tier.features.slaGuarantee,
            onPremiseOption: tier.features.onPremiseOption,
            multiTeamManagement: tier.features.multiTeamManagement,
            advancedSecurity: tier.features.advancedSecurity,
            vncLiveViewing: tier.features.vncLiveViewing,
            recordingCapability: tier.features.recordingCapability,
            webhookIntegration: tier.features.webhookIntegration,
            prioritySupport: tier.features.prioritySupport,
          },
        })),
      },
    });
  } catch (error) {
    console.error("Tiers endpoint error:", error);
    return NextResponse.json(
      {
        error: "Failed to retrieve license tiers",
        code: "TIERS_ERROR",
      },
      { status: 500 }
    );
  }
}
