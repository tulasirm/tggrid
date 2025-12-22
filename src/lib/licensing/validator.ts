/**
 * License validation and enforcement
 * Handles license key validation, feature checks, and usage tracking
 */

import {
  LicenseCheckResult,
  LicenseViolation,
  LicenseKey,
  UsageMetrics,
  LicenseTier,
} from "./types";
import { getLicenseTier } from "./tiers";

export class LicenseValidator {
  /**
   * Validate a license key
   */
  static validateLicense(licenseKey: LicenseKey): LicenseCheckResult {
    const violations: LicenseViolation[] = [];

    // Check if license is active
    if (!licenseKey.isActive) {
      violations.push({
        code: "LICENSE_INACTIVE",
        severity: "critical",
        message: "License is inactive",
        feature: "maxSessions",
        currentUsage: 0,
        limit: 0,
      });
    }

    // Check expiration
    if (licenseKey.expiresAt && new Date() > licenseKey.expiresAt) {
      violations.push({
        code: "LICENSE_EXPIRED",
        severity: "critical",
        message: `License expired on ${licenseKey.expiresAt.toISOString()}`,
        feature: "maxSessions",
        currentUsage: 0,
        limit: 0,
      });
    }

    const tierConfig = getLicenseTier(licenseKey.tier);
    if (!tierConfig) {
      violations.push({
        code: "INVALID_TIER",
        severity: "critical",
        message: `Invalid license tier: ${licenseKey.tier}`,
        feature: "maxSessions",
        currentUsage: 0,
        limit: 0,
      });
    }

    return {
      valid: violations.length === 0,
      tier: licenseKey.tier,
      expiresAt: licenseKey.expiresAt,
      allowedFeatures: tierConfig?.features || {},
      usageMetrics: {
        period: "monthly",
        sessionCount: 0,
        browserTypeBreakdown: { chrome: 0, firefox: 0 },
        regionUsage: {},
        maxConcurrentSessions: 0,
        totalApiCalls: 0,
        storageUsedGB: 0,
        timestamp: new Date(),
      },
      violations: violations.length > 0 ? violations : undefined,
    };
  }

  /**
   * Check if a feature is allowed for a tier
   */
  static canUseFeature(
    tier: LicenseTier,
    feature: keyof any,
    usageMetrics: UsageMetrics
  ): { allowed: boolean; reason?: string } {
    const tierConfig = getLicenseTier(tier);
    if (!tierConfig) {
      return { allowed: false, reason: "Invalid license tier" };
    }

    const features = tierConfig.features;

    // Check feature-specific constraints
    switch (feature) {
      case "browsers":
        return {
          allowed: features.supportedBrowsers.length > 0,
          reason: !features.supportedBrowsers.length
            ? "No browsers available in this tier"
            : undefined,
        };

      case "regions":
        return {
          allowed: features.regions > 0,
          reason:
            features.regions <= 0
              ? "No regions available in this tier"
              : undefined,
        };

      case "monitoring":
        return {
          allowed: features.advancedMonitoring,
          reason: !features.advancedMonitoring
            ? "Advanced monitoring not available in this tier"
            : undefined,
        };

      case "api":
        return {
          allowed: features.apiAccess,
          reason: !features.apiAccess
            ? "API access not available in this tier"
            : undefined,
        };

      case "auditLogs":
        return {
          allowed: features.auditLogs,
          reason: !features.auditLogs
            ? "Audit logs not available in this tier"
            : undefined,
        };

      case "autoScaling":
        return {
          allowed: features.autoScaling,
          reason: !features.autoScaling
            ? "Auto-scaling not available in this tier"
            : undefined,
        };

      default:
        return { allowed: true };
    }
  }

  /**
   * Check session limit violations
   */
  static checkSessionLimitViolation(
    tier: LicenseTier,
    currentSessions: number,
    monthlySessionCount: number
  ): LicenseViolation | null {
    const tierConfig = getLicenseTier(tier);
    if (!tierConfig) return null;

    const maxSessions = tierConfig.features.maxSessions;

    if (currentSessions >= maxSessions) {
      return {
        code: "SESSION_LIMIT_EXCEEDED",
        severity: "critical",
        message: `Session limit reached (${currentSessions}/${maxSessions})`,
        feature: "maxSessions",
        currentUsage: currentSessions,
        limit: maxSessions,
      };
    }

    // Check monthly limit (95% threshold for warning)
    const maxMonthly = tierConfig.features.maxSessionsPerMonth;
    const monthlyUsagePercent = (monthlySessionCount / maxMonthly) * 100;

    if (monthlyUsagePercent >= 95) {
      return {
        code: "MONTHLY_LIMIT_WARNING",
        severity: monthlyUsagePercent >= 100 ? "critical" : "warning",
        message: `Monthly session limit at ${monthlyUsagePercent.toFixed(
          1
        )}% (${monthlySessionCount}/${maxMonthly})`,
        feature: "maxSessionsPerMonth",
        currentUsage: monthlySessionCount,
        limit: maxMonthly,
      };
    }

    return null;
  }

  /**
   * Check browser type availability
   */
  static isBrowserSupported(
    tier: LicenseTier,
    browserType: "chrome" | "firefox"
  ): boolean {
    const tierConfig = getLicenseTier(tier);
    if (!tierConfig) return false;

    return tierConfig.features.supportedBrowsers.includes(browserType);
  }

  /**
   * Check region availability
   */
  static isRegionAvailable(tier: LicenseTier): boolean {
    const tierConfig = getLicenseTier(tier);
    if (!tierConfig) return false;

    return tierConfig.features.regions > 0;
  }

  /**
   * Calculate days until license expiration
   */
  static daysUntilExpiration(expiresAt?: Date): number | null {
    if (!expiresAt) return null;

    const now = new Date();
    const diffTime = expiresAt.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return Math.max(0, diffDays);
  }

  /**
   * Get usage percentage for a feature
   */
  static getUsagePercentage(
    tier: LicenseTier,
    feature: "sessions" | "monthlySessions" | "api",
    currentUsage: number
  ): number {
    const tierConfig = getLicenseTier(tier);
    if (!tierConfig) return 0;

    let limit = 0;
    switch (feature) {
      case "sessions":
        limit = tierConfig.features.maxSessions;
        break;
      case "monthlySessions":
        limit = tierConfig.features.maxSessionsPerMonth;
        break;
      default:
        return 0;
    }

    if (limit === Infinity) return 0; // Unlimited
    return Math.min(100, (currentUsage / limit) * 100);
  }
}

/**
 * License enforcement middleware for API routes
 */
export async function requireLicenseFeature(
  tier: LicenseTier,
  feature: string
): Promise<{ allowed: boolean; reason?: string }> {
  const validator = new LicenseValidator();
  return validator.canUseFeature(tier, feature, {
    period: "monthly",
    sessionCount: 0,
    browserTypeBreakdown: { chrome: 0, firefox: 0 },
    regionUsage: {},
    maxConcurrentSessions: 0,
    totalApiCalls: 0,
    storageUsedGB: 0,
    timestamp: new Date(),
  });
}
