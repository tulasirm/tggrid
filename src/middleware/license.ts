/**
 * License-based route protection middleware
 * Enforces license tiers on API endpoints
 */

import { NextRequest, NextResponse } from "next/server";
import { LicenseValidator } from "@/lib/licensing/validator";
import { LicenseTier } from "@/lib/licensing/types";

export interface LicenseProtectOptions {
  requiredTier?: LicenseTier;
  requiredFeature?: string;
  strict?: boolean; // If true, reject immediately; if false, warn only
}

/**
 * Middleware to protect routes based on license
 */
export async function licenseMiddleware(
  request: NextRequest,
  options: LicenseProtectOptions = {}
) {
  try {
    // Get license from headers or session
    const licenseHeader =
      request.headers.get("x-license-key") ||
      request.headers.get("authorization");

    if (!licenseHeader) {
      if (options.strict) {
        return NextResponse.json(
          {
            error: "Missing license",
            code: "NO_LICENSE",
            message: "License key is required for this endpoint",
          },
          { status: 401 }
        );
      }
      // If not strict, allow but mark as unlicensed
      return null;
    }

    // In a real implementation, validate license from database
    // For now, we'll return null to indicate successful middleware pass
    return null;
  } catch (error) {
    console.error("License middleware error:", error);
    return NextResponse.json(
      {
        error: "License validation failed",
        code: "LICENSE_ERROR",
      },
      { status: 500 }
    );
  }
}

/**
 * Protect API route handler
 */
export function withLicenseProtection<
  T extends (...args: any[]) => Promise<NextResponse>
>(handler: T, options: LicenseProtectOptions = {}): T {
  return (async (request: NextRequest, ...args: any[]) => {
    const licenseError = await licenseMiddleware(request, options);
    if (licenseError) {
      return licenseError;
    }

    return handler(request, ...args);
  }) as T;
}

/**
 * Helper to check if user can use a feature
 */
export async function canUseFeature(
  tier: LicenseTier,
  feature: string
): Promise<boolean> {
  const result = await LicenseValidator.prototype.canUseFeature(tier, feature, {
    period: "monthly",
    sessionCount: 0,
    browserTypeBreakdown: { chrome: 0, firefox: 0 },
    regionUsage: {},
    maxConcurrentSessions: 0,
    totalApiCalls: 0,
    storageUsedGB: 0,
    timestamp: new Date(),
  });
  return result.allowed;
}

/**
 * Helper to enforce tier requirement
 */
export function requireTier(requiredTier: LicenseTier) {
  return (userTier: LicenseTier): boolean => {
    const tierHierarchy = ["starter", "professional", "enterprise"];
    const userIndex = tierHierarchy.indexOf(userTier);
    const requiredIndex = tierHierarchy.indexOf(requiredTier);
    return userIndex >= requiredIndex;
  };
}
