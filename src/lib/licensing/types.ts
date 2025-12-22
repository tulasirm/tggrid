/**
 * Licensing module types
 * Defines license tiers, features, and usage tracking
 */

export type LicenseTier = "starter" | "professional" | "enterprise";

export interface LicenseFeatures {
  maxSessions: number;
  maxSessionsPerMonth: number;
  supportedBrowsers: ("chrome" | "firefox")[];
  regions: number;
  advancedMonitoring: boolean;
  apiAccess: boolean;
  auditLogs: boolean;
  autoScaling: boolean;
  customIntegration: boolean;
  dedicatedSupport: boolean;
  slaGuarantee: boolean;
  onPremiseOption: boolean;
  multiTeamManagement: boolean;
  advancedSecurity: boolean;
  vncLiveViewing: boolean;
  recordingCapability: boolean;
  webhookIntegration: boolean;
  prioritySupport: boolean;
}

export interface LicenseTierConfig {
  tier: LicenseTier;
  displayName: string;
  price: string;
  period: string;
  description: string;
  features: LicenseFeatures;
  maxConcurrentBrowsers?: number;
}

export interface LicenseKey {
  id: string;
  key: string;
  tier: LicenseTier;
  createdAt: Date;
  expiresAt?: Date;
  isActive: boolean;
  organizationId: string;
  organizationName: string;
  maxUsers?: number;
  maxSessions?: number;
  metadata?: Record<string, any>;
}

export interface UsageMetrics {
  period: "daily" | "monthly";
  sessionCount: number;
  browserTypeBreakdown: {
    chrome: number;
    firefox: number;
  };
  regionUsage: Record<string, number>;
  maxConcurrentSessions: number;
  totalApiCalls: number;
  storageUsedGB: number;
  timestamp: Date;
}

export interface LicenseCheckResult {
  valid: boolean;
  tier: LicenseTier;
  expiresAt?: Date;
  allowedFeatures: LicenseFeatures;
  usageMetrics: UsageMetrics;
  violations?: LicenseViolation[];
}

export interface LicenseViolation {
  code: string;
  severity: "warning" | "error" | "critical";
  message: string;
  feature: keyof LicenseFeatures;
  currentUsage: number;
  limit: number;
}

export interface LicenseUsageEvent {
  type:
    | "session_created"
    | "session_completed"
    | "browser_type_used"
    | "region_used"
    | "api_call"
    | "feature_used";
  tier: LicenseTier;
  timestamp: Date;
  organizationId: string;
  metadata: Record<string, any>;
}
