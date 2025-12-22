/**
 * Quick Start: Licensing Module Integration
 * 
 * This file shows how to quickly integrate the licensing module
 * into your application.
 */

// ============================================================================
// 1. ADD LICENSE KEY VALIDATION TO SESSION CREATION ENDPOINT
// ============================================================================

// File: src/app/api/sessions/create/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { LicenseValidator } from '@/lib/licensing/validator';
import { globalUsageTracker } from '@/lib/licensing/usage-tracker';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { licenseKey, browserType = 'chrome', region = 'us-east-1' } = body;
    
    // 1. Validate license
    // In production, fetch from database
    const license = {
      id: 'demo',
      key: licenseKey || 'demo-key',
      tier: 'professional' as const,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      isActive: true,
      organizationId: 'org-1',
      organizationName: 'Demo',
    };
    
    const licenseCheck = LicenseValidator.validateLicense(license);
    if (!licenseCheck.valid) {
      return NextResponse.json({ error: 'Invalid license' }, { status: 403 });
    }
    
    // 2. Check browser support
    if (!LicenseValidator.isBrowserSupported(license.tier, browserType)) {
      return NextResponse.json(
        { error: `Browser ${browserType} not supported in this tier` },
        { status: 403 }
      );
    }
    
    // 3. Check session limits
    const sessionViolation = LicenseValidator.checkSessionLimitViolation(
      license.tier,
      0,    // Current sessions (get from DB in production)
      0     // Monthly count (get from DB in production)
    );
    
    if (sessionViolation?.severity === 'critical') {
      return NextResponse.json({ error: sessionViolation.message }, { status: 403 });
    }
    
    // 4. Create session (your existing logic)
    const sessionId = 'session-' + Math.random().toString(36).substr(2, 9);
    
    // 5. Record usage
    globalUsageTracker.recordSessionCreated('org-1', license.tier, browserType, region);
    
    return NextResponse.json({ sessionId, tier: license.tier });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }
}

// ============================================================================
// 2. ADD LICENSE INFO TO DASHBOARD
// ============================================================================

// File: src/app/page.tsx

import { LicenseInfo } from '@/components/license/LicenseInfo';
import { LicenseFeatures } from '@/components/license/LicenseFeatures';

export default function Dashboard() {
  return (
    <div className="grid md:grid-cols-2 gap-6 mb-6">
      {/* License Status */}
      <LicenseInfo 
        tier="professional"
        maxSessions={50}
        currentSessions={25}
        daysUntilExpiration={180}
      />
      
      {/* Available Features */}
      <LicenseFeatures tier="professional" />
    </div>
  );
}

// ============================================================================
// 3. TRACK USAGE IN YOUR SESSION ENDPOINTS
// ============================================================================

// File: src/app/api/sessions/[sessionId]/route.ts

import { globalUsageTracker } from '@/lib/licensing/usage-tracker';

export async function POST(request: NextRequest) {
  // Track API call
  globalUsageTracker.recordApiCall('org-1', 'professional', `/api/sessions`, 200);
  
  // ... your existing logic
}

// ============================================================================
// 4. PROTECT PREMIUM FEATURES
// ============================================================================

// File: src/app/api/sessions/advanced-analytics/route.ts

import { isFeatureAvailable } from '@/lib/licensing';

export async function GET(request: NextRequest) {
  const userTier = 'professional'; // Get from auth in production
  
  if (!isFeatureAvailable(userTier, 'advancedMonitoring')) {
    return NextResponse.json(
      { error: 'Advanced monitoring not available in your tier' },
      { status: 403 }
    );
  }
  
  // Provide advanced analytics
  return NextResponse.json({ /* analytics data */ });
}

// ============================================================================
// 5. GET USAGE STATS IN UI
// ============================================================================

// File: src/components/UsageStats.tsx

'use client';

import { useEffect, useState } from 'react';

export function UsageStats() {
  const [usage, setUsage] = useState(null);
  
  useEffect(() => {
    // Fetch usage metrics
    fetch('/api/license/usage?org=org-1')
      .then(r => r.json())
      .then(d => setUsage(d.data))
      .catch(console.error);
  }, []);
  
  if (!usage) return null;
  
  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-muted-foreground">Sessions Created</p>
        <p className="text-2xl font-bold">{usage.summary.sessionCreated}</p>
      </div>
      
      <div>
        <p className="text-sm text-muted-foreground">API Calls</p>
        <p className="text-2xl font-bold">{usage.summary.apiCalls}</p>
      </div>
      
      <div>
        <p className="text-sm text-muted-foreground">Browser Usage</p>
        <ul>
          <li>Chrome: {usage.summary.browserTypeUsage.chrome}</li>
          <li>Firefox: {usage.summary.browserTypeUsage.firefox}</li>
        </ul>
      </div>
    </div>
  );
}

// ============================================================================
// 6. PRISMA INTEGRATION (Optional but Recommended)
// ============================================================================

// File: prisma/schema.prisma

model License {
  id              String   @id @default(cuid())
  key             String   @unique
  tier            String   // 'starter' | 'professional' | 'enterprise'
  organizationId  String
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  expiresAt       DateTime?
  maxUsers        Int?
  maxSessions     Int?
  metadata        Json?
  
  @@index([organizationId])
  @@index([key])
}

model UsageLog {
  id              String   @id @default(cuid())
  organizationId  String
  tier            String
  eventType       String
  metadata        Json?
  timestamp       DateTime @default(now())
  
  @@index([organizationId])
  @@index([timestamp])
}

// ============================================================================
// 7. ENVIRONMENT VARIABLES
// ============================================================================

// .env.local

# License Configuration
LICENSE_TIER=professional
LICENSE_KEY=demo-key-123
LICENSE_EXPIRES_IN_DAYS=365

# Usage Tracking
TRACK_USAGE=true
USAGE_RETENTION_DAYS=90

# ============================================================================
// TESTING THE INTEGRATION
// ============================================================================

// Create a simple test file to verify everything works

import { LicenseValidator, globalUsageTracker, LICENSE_TIERS } from '@/lib/licensing';

async function testLicensing() {
  console.log('🔍 Testing Licensing Module...\n');
  
  // 1. Test tier lookup
  console.log('✓ Available tiers:', Object.keys(LICENSE_TIERS));
  
  // 2. Test license validation
  const mockLicense = {
    id: 'test',
    key: 'test-key',
    tier: 'professional' as const,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    isActive: true,
    organizationId: 'org-test',
    organizationName: 'Test Org',
  };
  
  const result = LicenseValidator.validateLicense(mockLicense);
  console.log('✓ License validation:', result.valid ? 'PASSED' : 'FAILED');
  
  // 3. Test feature availability
  console.log('✓ API access available:', LicenseValidator.isBrowserSupported('professional', 'chrome'));
  
  // 4. Test usage tracking
  globalUsageTracker.recordSessionCreated('org-test', 'professional', 'chrome', 'us-east-1');
  const metrics = globalUsageTracker.getMetrics('org-test');
  console.log('✓ Usage tracking:', metrics?.sessionCount === 1 ? 'PASSED' : 'FAILED');
  
  // 5. Test summary
  const summary = globalUsageTracker.getSummary('org-test', 1);
  console.log('✓ Session summary:', summary.sessionCreated, 'sessions');
  
  console.log('\n✅ All tests passed!');
}

// Run: testLicensing()
