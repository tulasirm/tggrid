/**
 * Licensing Module Usage Examples
 * 
 * Real-world code examples showing how to use the licensing module
 * in your UFBrowsers application.
 */

// ============================================================================
// EXAMPLE 1: Protect Session Creation with License Validation
// ============================================================================

import { LicenseValidator } from '@/lib/licensing/validator';
import { globalUsageTracker } from '@/lib/licensing/usage-tracker';
import { NextRequest, NextResponse } from 'next/server';

export async function createSession(request: NextRequest) {
  const { licenseKey, browserType, region, count } = await request.json();
  
  // Step 1: Validate license
  const license = {
    id: 'lic-1',
    key: licenseKey,
    tier: 'professional' as const,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    isActive: true,
    organizationId: 'org-1',
    organizationName: 'Acme Corp',
  };
  
  const licenseCheck = LicenseValidator.validateLicense(license);
  if (!licenseCheck.valid) {
    return NextResponse.json({ error: 'License is invalid' }, { status: 403 });
  }
  
  // Step 2: Check if browser is supported
  if (!LicenseValidator.isBrowserSupported(license.tier, browserType)) {
    return NextResponse.json(
      { error: `${browserType} not supported in ${license.tier} plan` },
      { status: 403 }
    );
  }
  
  // Step 3: Check session limits
  const sessionViolation = LicenseValidator.checkSessionLimitViolation(
    license.tier,
    count,              // How many sessions trying to create
    9500                // Monthly usage so far
  );
  
  if (sessionViolation?.severity === 'critical') {
    return NextResponse.json({ error: sessionViolation.message }, { status: 403 });
  }
  
  if (sessionViolation?.severity === 'warning') {
    console.warn('License warning:', sessionViolation.message);
    // Could warn user but still allow
  }
  
  // Step 4: Create sessions
  const sessions = [];
  for (let i = 0; i < count; i++) {
    const sessionId = `session-${Date.now()}-${i}`;
    
    // Record usage event for each session
    globalUsageTracker.recordSessionCreated(
      license.organizationId,
      license.tier,
      browserType,
      region
    );
    
    sessions.push({ sessionId, browserType, region });
  }
  
  return NextResponse.json({ sessions, createdCount: sessions.length });
}

// ============================================================================
// EXAMPLE 2: Feature Gating Based on License Tier
// ============================================================================

import { isFeatureAvailable, isTierAtLeast } from '@/lib/licensing';

async function advancedAnalytics(organizationId: string, userTier: string) {
  // Check if user's tier supports advanced analytics
  if (!isFeatureAvailable(userTier, 'advancedMonitoring')) {
    throw new Error(`Advanced monitoring not available in ${userTier} plan`);
  }
  
  // Provide detailed analytics
  return {
    realTimeMetrics: true,
    historicalAnalysis: true,
    customDashboards: true,
    exportCapability: isTierAtLeast(userTier, 'professional'),
  };
}

// ============================================================================
// EXAMPLE 3: Track Different Usage Events
// ============================================================================

import { LicenseUsageTracker } from '@/lib/licensing/usage-tracker';

const tracker = new LicenseUsageTracker();

// Track session lifecycle
async function sessionLifecycle(orgId: string, tier: string, sessionId: string) {
  // 1. Record session created
  tracker.recordSessionCreated(orgId, tier, 'chrome', 'us-east-1');
  
  // 2. Do some work with the session
  await runTests(sessionId);
  
  // 3. Record completion
  tracker.recordSessionCompleted(orgId, tier, 3600); // 1 hour duration
  
  // 4. Get metrics
  const metrics = tracker.getMetrics(orgId);
  console.log(`Total sessions: ${metrics?.sessionCount}`);
  console.log(`Chrome usage: ${metrics?.browserTypeBreakdown.chrome}`);
}

// Track API usage
function apiEndpointWithTracking(orgId: string, tier: string, endpoint: string) {
  tracker.recordApiCall(orgId, tier, endpoint, 200); // Success
  
  // Later, retrieve summary
  const summary = tracker.getSummary(orgId, 30); // Last 30 days
  console.log(`Monthly API calls: ${summary.apiCalls}`);
}

// ============================================================================
// EXAMPLE 4: Display License Status in React Component
// ============================================================================

'use client';

import { useEffect, useState } from 'react';
import { LicenseInfo } from '@/components/license/LicenseInfo';
import { LicenseFeatures } from '@/components/license/LicenseFeatures';
import { LicenseTier } from '@/lib/licensing/types';

export function LicenseDashboard() {
  const [tier, setTier] = useState<LicenseTier>('professional');
  const [sessions, setSessions] = useState(25);
  const [maxSessions, setMaxSessions] = useState(50);
  const [daysLeft, setDaysLeft] = useState(180);
  
  useEffect(() => {
    // Fetch actual license info from API
    const fetchLicense = async () => {
      const response = await fetch('/api/license/validate?key=your-key');
      const data = await response.json();
      
      if (data.status === 'success') {
        // Update state with real data
      }
    };
    
    fetchLicense();
  }, []);
  
  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Current License Status */}
      <LicenseInfo
        tier={tier}
        maxSessions={maxSessions}
        currentSessions={sessions}
        daysUntilExpiration={daysLeft}
      />
      
      {/* Available Features */}
      <LicenseFeatures tier={tier} />
    </div>
  );
}

// ============================================================================
// EXAMPLE 5: Check Multiple Tier-based Conditions
// ============================================================================

import { getLicenseTier, compareTiers } from '@/lib/licensing';

function checkTierCapabilities(userTier: string) {
  const tierConfig = getLicenseTier(userTier);
  
  if (!tierConfig) {
    throw new Error('Invalid tier');
  }
  
  // Check specific limits
  const canCreateSessions = tierConfig.features.maxSessions > 0;
  const hasUnlimitedSessions = tierConfig.features.maxSessions === Infinity;
  const canUseFirefox = tierConfig.features.supportedBrowsers.includes('firefox');
  const multiRegionSupport = tierConfig.features.regions >= 3;
  
  // Compare tiers
  const isEnterpriseOrBetter = compareTiers(userTier, 'enterprise') >= 0;
  const isProfessionalOrBetter = compareTiers(userTier, 'professional') >= 0;
  
  return {
    canCreateSessions,
    hasUnlimitedSessions,
    canUseFirefox,
    multiRegionSupport,
    isEnterpriseOrBetter,
    isProfessionalOrBetter,
  };
}

// ============================================================================
// EXAMPLE 6: Get Usage Summary for Billing
// ============================================================================

async function generateMonthlyBillingReport(organizationId: string) {
  const tracker = new LicenseUsageTracker();
  
  // Get last 30 days of usage
  const summary = tracker.getSummary(organizationId, 30);
  
  // Create billing report
  const report = {
    organizationId,
    period: {
      start: new Date(new Date().setDate(new Date().getDate() - 30)),
      end: new Date(),
    },
    usage: {
      sessionCount: summary.sessionCreated,
      sessionsCompleted: summary.sessionCompleted,
      apiCalls: summary.apiCalls,
      browserUsage: summary.browserTypeUsage,
      regionUsage: summary.regionUsage,
    },
    estimatedCost: calculateCost(summary),
  };
  
  return report;
}

function calculateCost(summary: any): number {
  // Simple cost calculation
  // Professional tier: $99/month + overage charges
  const baseCost = 99;
  const overage = Math.max(0, summary.sessionCreated - 10000) * 0.01;
  return baseCost + overage;
}

// ============================================================================
// EXAMPLE 7: License-Protected Middleware
// ============================================================================

import { withLicenseProtection } from '@/middleware/license';

// Protect entire route handler
const protectedHandler = withLicenseProtection(
  async (request: NextRequest) => {
    // This handler requires a valid license
    const body = await request.json();
    
    // Safe to access premium features here
    return NextResponse.json({ success: true });
  },
  {
    requiredTier: 'professional',
    requiredFeature: 'apiAccess',
    strict: true, // Immediately reject if license missing
  }
);

export const POST = protectedHandler;

// ============================================================================
// EXAMPLE 8: Export Metrics for Prometheus
// ============================================================================

function setupPrometheusMetrics(tracker: LicenseUsageTracker) {
  // Export metrics in Prometheus format
  const prometheusMetrics = tracker.exportMetrics();
  
  // Would typically expose at /metrics endpoint
  console.log('Prometheus Metrics:');
  console.log(prometheusMetrics);
  
  // Example output:
  // # HELP ufbrowsers_sessions_total Total sessions created
  // # TYPE ufbrowsers_sessions_total counter
  // ufbrowsers_sessions_total{org="org-1",tier="professional"} 42
}

// ============================================================================
// EXAMPLE 9: Real-world Integration Pattern
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // Parse request
    const { licenseKey, browserType, config } = await request.json();
    
    // Validate license (would come from header or auth context in production)
    const license = await validateLicenseFromDB(licenseKey);
    
    const licenseCheck = LicenseValidator.validateLicense(license);
    if (!licenseCheck.valid) {
      return NextResponse.json({ error: 'License invalid' }, { status: 403 });
    }
    
    // Check feature availability
    const canUseBrowser = LicenseValidator.isBrowserSupported(
      license.tier,
      browserType
    );
    
    if (!canUseBrowser) {
      return NextResponse.json(
        { error: `Browser ${browserType} not available in ${license.tier}` },
        { status: 403 }
      );
    }
    
    // Create session
    const session = await createBrowserSession(browserType, config);
    
    // Track usage
    globalUsageTracker.recordSessionCreated(
      license.organizationId,
      license.tier,
      browserType,
      config.region || 'default'
    );
    
    // Return response
    return NextResponse.json({
      sessionId: session.id,
      tier: license.tier,
      expiresAt: license.expiresAt,
    });
    
  } catch (error) {
    console.error('Session creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    );
  }
}

// ============================================================================
// EXAMPLE 10: Testing License Module
// ============================================================================

async function runLicenseTests() {
  console.log('🧪 Running License Module Tests...\n');
  
  // Test 1: Validate license
  const mockLicense = {
    id: 'test-lic-1',
    key: 'test-key',
    tier: 'professional' as const,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    isActive: true,
    organizationId: 'org-test',
    organizationName: 'Test Org',
  };
  
  const result = LicenseValidator.validateLicense(mockLicense);
  console.log('✓ License validation:', result.valid ? 'PASS' : 'FAIL');
  
  // Test 2: Feature availability
  const hasAPI = isFeatureAvailable('professional', 'apiAccess');
  console.log('✓ API feature check:', hasAPI ? 'PASS' : 'FAIL');
  
  // Test 3: Browser support
  const supportsBrowser = LicenseValidator.isBrowserSupported('professional', 'firefox');
  console.log('✓ Browser support:', supportsBrowser ? 'PASS' : 'FAIL');
  
  // Test 4: Usage tracking
  const tracker = new LicenseUsageTracker();
  tracker.recordSessionCreated('org-test', 'professional', 'chrome', 'us-east-1');
  const metrics = tracker.getMetrics('org-test');
  console.log('✓ Usage tracking:', metrics?.sessionCount === 1 ? 'PASS' : 'FAIL');
  
  // Test 5: Session limits
  const violation = LicenseValidator.checkSessionLimitViolation('starter', 10, 15);
  console.log('✓ Limit enforcement:', violation !== null ? 'PASS' : 'FAIL');
  
  console.log('\n✅ All tests passed!');
}

// Helper functions (implementation details)
async function validateLicenseFromDB(key: string) {
  // In production, fetch from database
  return {
    id: 'lic-1',
    key,
    tier: 'professional' as const,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    isActive: true,
    organizationId: 'org-1',
    organizationName: 'Test',
  };
}

async function createBrowserSession(browser: string, config: any) {
  return { id: `session-${Date.now()}` };
}

// Run tests (uncomment to execute)
// runLicenseTests();
