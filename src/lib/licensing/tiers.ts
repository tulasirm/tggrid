/**
 * License tier configurations
 * Defines feature sets and limits for each license tier
 *
 * PRICING ANALYSIS (with 50% margin target):
 *
 * Infrastructure Cost per Session (5-minute average):
 * - CPU (0.25 vCPU @ $0.0265/hour): $0.000552
 * - Memory (128 MB @ $0.0075/hour): $0.000080
 * - Network (10 MB @ $0.12/GB): $0.001200
 * - Overhead (15% orchestration): $0.000275
 * = TOTAL: $0.002107 per session (~$0.0021)
 *
 * TIER PRICING (with profit margins):
 *
 * Starter: FREE
 * - 10 sessions/month
 * - Cost: $0.021
 * - Margin: 0% (loss-leader, CAC = $0.021 per user)
 * - Strategy: Convert to paid tier within 30-60 days
 *
 * Professional: $49/month (optimized from $99)
 * - 5,000 sessions/month included
 * - Additional sessions: $0.01 each
 * - Cost @ 30% avg utilization (1,500 sessions): $3.16
 * - Revenue: $49
 * - Profit: $45.84/month ($550.08/year)
 * - Margin: 93.5% (significantly exceeds 50% target)
 * - Break-even: 445 customers (at $19k/month fixed costs)
 *
 * Enterprise: Custom (starts at $249/month)
 * - 50,000+ sessions/month
 * - Dedicated support, SLA, on-premise
 * - Cost @ 50,000 sessions: $105.35
 * - Cost @ 100,000 sessions: $210.70
 * - Margin: 55-60% at volume (meets 50% target)
 *
 * @see docs/PRICING-COST-ANALYSIS.md for detailed breakdown
 */

import { LicenseTierConfig } from "./types";

export const LICENSE_TIERS: Record<string, LicenseTierConfig> = {
  starter: {
    tier: "starter",
    displayName: "Starter",
    price: "Free",
    period: "forever",
    description: "Perfect for getting started with browser automation",
    maxConcurrentBrowsers: 5,
    features: {
      maxSessions: 5,
      maxSessionsPerMonth: 10,
      supportedBrowsers: ["chrome"],
      regions: 1,
      advancedMonitoring: false,
      apiAccess: false,
      auditLogs: false,
      autoScaling: false,
      customIntegration: false,
      dedicatedSupport: false,
      slaGuarantee: false,
      onPremiseOption: false,
      multiTeamManagement: false,
      advancedSecurity: false,
      vncLiveViewing: false,
      recordingCapability: false,
      webhookIntegration: false,
      prioritySupport: false,
    },
  },
  professional: {
    tier: "professional",
    displayName: "Professional",
    price: "$49",
    period: "/month",
    description:
      "Scaled automation for growing teams (includes 5,000 sessions/month; $0.01 per additional session)",
    maxConcurrentBrowsers: 50,
    features: {
      maxSessions: 50,
      maxSessionsPerMonth: 5000,
      supportedBrowsers: ["chrome", "firefox"],
      regions: 3,
      advancedMonitoring: true,
      apiAccess: true,
      auditLogs: true,
      autoScaling: true,
      customIntegration: false,
      dedicatedSupport: false,
      slaGuarantee: false,
      onPremiseOption: false,
      multiTeamManagement: false,
      advancedSecurity: true,
      vncLiveViewing: true,
      recordingCapability: true,
      webhookIntegration: true,
      prioritySupport: true,
    },
  },
  enterprise: {
    tier: "enterprise",
    displayName: "Enterprise",
    price: "Custom",
    period: "contact sales",
    description:
      "Unlimited scale with dedicated support (starting at $249/month for 50k sessions; contact sales for custom pricing)",
    maxConcurrentBrowsers: 1000,
    features: {
      maxSessions: Infinity,
      maxSessionsPerMonth: Infinity,
      supportedBrowsers: ["chrome", "firefox"],
      regions: 10,
      advancedMonitoring: true,
      apiAccess: true,
      auditLogs: true,
      autoScaling: true,
      customIntegration: true,
      dedicatedSupport: true,
      slaGuarantee: true,
      onPremiseOption: true,
      multiTeamManagement: true,
      advancedSecurity: true,
      vncLiveViewing: true,
      recordingCapability: true,
      webhookIntegration: true,
      prioritySupport: true,
    },
  },
};

/**
 * Get license tier configuration
 */
export function getLicenseTier(tier: string): LicenseTierConfig | null {
  return LICENSE_TIERS[tier] || null;
}

/**
 * Get all available tiers
 */
export function getAvailableTiers(): LicenseTierConfig[] {
  return Object.values(LICENSE_TIERS);
}

/**
 * Check if a feature is available in a tier
 */
export function isFeatureAvailable(
  tier: string,
  feature: keyof LicenseTierConfig["features"]
): boolean {
  const tierConfig = getLicenseTier(tier);
  if (!tierConfig) return false;

  const featureValue = tierConfig.features[feature];

  // For boolean features, return the boolean value
  if (typeof featureValue === "boolean") {
    return featureValue;
  }

  // For numeric features, return true if value is greater than 0
  if (typeof featureValue === "number") {
    return featureValue > 0;
  }

  // For array features, return true if array has items
  if (Array.isArray(featureValue)) {
    return featureValue.length > 0;
  }

  return false;
}

/**
 * Compare two tiers (returns -1 if tier1 < tier2, 0 if equal, 1 if tier1 > tier2)
 */
export function compareTiers(tier1: string, tier2: string): number {
  const tierOrder = ["starter", "professional", "enterprise"];
  const index1 = tierOrder.indexOf(tier1);
  const index2 = tierOrder.indexOf(tier2);

  if (index1 < index2) return -1;
  if (index1 > index2) return 1;
  return 0;
}

/**
 * Check if tier1 meets or exceeds tier2 requirements
 */
export function isTierAtLeast(checkTier: string, minimumTier: string): boolean {
  return compareTiers(checkTier, minimumTier) >= 0;
}
