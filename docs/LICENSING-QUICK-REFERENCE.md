# Licensing Module - Quick Reference

## 🎯 Module Exports

```typescript
// Import everything
import * as licensing from '@/lib/licensing';

// Or import specific items
import {
  // Types
  LicenseTier,
  LicenseFeatures,
  LicenseKey,
  LicenseCheckResult,
  
  // Tiers
  LICENSE_TIERS,
  getLicenseTier,
  getAvailableTiers,
  isFeatureAvailable,
  isTierAtLeast,
  
  // Validator
  LicenseValidator,
  
  // Usage Tracker
  LicenseUsageTracker,
  globalUsageTracker,
} from '@/lib/licensing';
```

---

## 🔑 Core Functions

### License Validation
```typescript
// Validate a license
const result = LicenseValidator.validateLicense(licenseKey);
if (result.valid) { /* proceed */ }

// Check expiration
const daysLeft = LicenseValidator.daysUntilExpiration(expiresAt);

// Get usage percentage
const percent = LicenseValidator.getUsagePercentage('professional', 'sessions', 25);
```

### Feature Checking
```typescript
// Check if feature available
const hasAPI = isFeatureAvailable('professional', 'apiAccess');

// Check browser support
const supportsBrowser = LicenseValidator.isBrowserSupported('professional', 'firefox');

// Compare tiers
const isPro = isTierAtLeast('professional', 'professional');
```

### Session Limits
```typescript
// Check for violations
const violation = LicenseValidator.checkSessionLimitViolation(
  'professional',  // tier
  45,              // current sessions
  9500             // monthly count
);

if (violation?.severity === 'critical') {
  // Prevent operation
}
```

### Usage Tracking
```typescript
// Record session created
globalUsageTracker.recordSessionCreated('org-1', 'professional', 'chrome', 'us-east-1');

// Record browser usage
globalUsageTracker.recordBrowserUsage('org-1', 'professional', 'firefox');

// Record API call
globalUsageTracker.recordApiCall('org-1', 'professional', '/api/sessions', 200);

// Record region usage
globalUsageTracker.recordRegionUsage('org-1', 'professional', 'eu-west-1');

// Get metrics
const metrics = globalUsageTracker.getMetrics('org-1');

// Get summary
const summary = globalUsageTracker.getSummary('org-1', 30); // Last 30 days
```

---

## 📊 Tier Configuration

### Starter
- **Price**: Free
- **Sessions/Month**: 10
- **Concurrent**: 5
- **Browsers**: Chrome
- **Regions**: 1
- **Features**: Basic monitoring, Community support

### Professional
- **Price**: $99/month
- **Sessions/Month**: 10,000
- **Concurrent**: 50
- **Browsers**: Chrome, Firefox
- **Regions**: 3
- **Features**: Advanced monitoring, API, Audit logs, Auto-scaling, VNC, Recording, Webhooks, Priority support

### Enterprise
- **Price**: Custom
- **Sessions/Month**: Unlimited
- **Concurrent**: 1,000+
- **Browsers**: All
- **Regions**: 10+
- **Features**: Everything + Custom integration, Dedicated support, SLA, On-premise, Multi-team

---

## 🔌 API Endpoints

### GET /api/license/validate
```bash
curl "http://localhost:3000/api/license/validate?key=abc123"
```

Response:
```json
{
  "status": "success",
  "data": {
    "valid": true,
    "tier": "professional",
    "expiresAt": "2025-12-22...",
    "violations": []
  }
}
```

### POST /api/license/validate
```bash
curl -X POST http://localhost:3000/api/license/validate \
  -H "Content-Type: application/json" \
  -d '{"licenseKey":"abc123"}'
```

### GET /api/license/usage
```bash
curl "http://localhost:3000/api/license/usage?org=org-1&days=30"
```

Response:
```json
{
  "status": "success",
  "data": {
    "metrics": {...},
    "summary": {
      "sessionCreated": 42,
      "sessionCompleted": 40,
      "apiCalls": 1250,
      "browserTypeUsage": {"chrome": 30, "firefox": 10}
    }
  }
}
```

### POST /api/license/usage
```bash
curl -X POST http://localhost:3000/api/license/usage \
  -H "Content-Type: application/json" \
  -d '{
    "organizationId": "org-1",
    "tier": "professional",
    "eventType": "session_created",
    "metadata": {"browserType": "chrome", "region": "us-east-1"}
  }'
```

### GET /api/license/tiers
```bash
curl "http://localhost:3000/api/license/tiers"
```

---

## ⚛️ React Components

### LicenseInfo Component
```tsx
import { LicenseInfo } from '@/components/license/LicenseInfo';

<LicenseInfo 
  tier="professional"
  maxSessions={50}
  currentSessions={25}
  daysUntilExpiration={180}
/>
```

Props:
- `tier: LicenseTier` - Current license tier
- `maxSessions?: number` - Maximum allowed sessions
- `currentSessions?: number` - Current session count
- `daysUntilExpiration?: number` - Days until expiration
- `className?: string` - Additional CSS classes

### LicenseFeatures Component
```tsx
import { LicenseFeatures } from '@/components/license/LicenseFeatures';

<LicenseFeatures tier="professional" />
```

Props:
- `tier: LicenseTier` - License tier to display features for
- `className?: string` - Additional CSS classes

---

## 🛡️ Middleware Usage

### Protect Route Handler
```typescript
import { withLicenseProtection } from '@/middleware/license';

export const POST = withLicenseProtection(
  async (request: NextRequest) => {
    // Protected handler logic
    return NextResponse.json({ success: true });
  },
  {
    requiredTier: 'professional',
    requiredFeature: 'apiAccess',
    strict: true
  }
);
```

### Manual Middleware Check
```typescript
import { licenseMiddleware } from '@/middleware/license';

export async function POST(request: NextRequest) {
  const error = await licenseMiddleware(request, {
    requiredTier: 'professional',
    strict: true
  });
  
  if (error) {
    return error; // Return 401/403 error
  }
  
  // Continue with protected logic
}
```

---

## 📈 Usage Patterns

### Pattern: Protect Session Creation
```typescript
export async function POST(request: NextRequest) {
  const { licenseKey, browserType } = await request.json();
  
  // 1. Validate license
  const license = await getFromDB(licenseKey);
  const check = LicenseValidator.validateLicense(license);
  if (!check.valid) return error('Invalid', 403);
  
  // 2. Check browser support
  if (!LicenseValidator.isBrowserSupported(license.tier, browserType)) {
    return error('Browser not supported', 403);
  }
  
  // 3. Check session limits
  const violation = LicenseValidator.checkSessionLimitViolation(...);
  if (violation?.severity === 'critical') return error(violation, 403);
  
  // 4. Create session
  const session = await createSession(browserType);
  
  // 5. Track usage
  globalUsageTracker.recordSessionCreated('org-1', license.tier, browserType, 'us-east-1');
  
  return response({ sessionId: session.id });
}
```

### Pattern: Feature Gating
```typescript
if (!isFeatureAvailable(userTier, 'advancedMonitoring')) {
  return showUpgradePrompt();
}

return <AdvancedAnalytics />;
```

### Pattern: Usage Reporting
```typescript
const summary = globalUsageTracker.getSummary('org-1', 30);
const report = {
  sessionCount: summary.sessionCreated,
  apiCalls: summary.apiCalls,
  estimatedCost: summary.sessionCreated * 0.01,
};
```

---

## 🚨 Violation Types

| Code | Severity | Meaning |
|------|----------|---------|
| `LICENSE_INACTIVE` | critical | License is not active |
| `LICENSE_EXPIRED` | critical | License has expired |
| `INVALID_TIER` | critical | Invalid tier specified |
| `SESSION_LIMIT_EXCEEDED` | critical | Current session limit reached |
| `MONTHLY_LIMIT_WARNING` | warning | Monthly limit at 95%+ |
| `MONTHLY_LIMIT_EXCEEDED` | critical | Monthly session limit exceeded |

---

## 🔍 Type Reference

```typescript
// License Key
interface LicenseKey {
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
}

// License Check Result
interface LicenseCheckResult {
  valid: boolean;
  tier: LicenseTier;
  expiresAt?: Date;
  allowedFeatures: LicenseFeatures;
  usageMetrics: UsageMetrics;
  violations?: LicenseViolation[];
}

// Tier: 'starter' | 'professional' | 'enterprise'
type LicenseTier = 'starter' | 'professional' | 'enterprise';

// License Features
interface LicenseFeatures {
  maxSessions: number;
  maxSessionsPerMonth: number;
  supportedBrowsers: ('chrome' | 'firefox')[];
  regions: number;
  [key: string]: boolean | number | string[];
}
```

---

## 📦 Installation & Setup

```bash
# Project already has the module installed
# Just import and use:

import { LicenseValidator, globalUsageTracker } from '@/lib/licensing';

// For database integration, add to prisma/schema.prisma:
# model License { ... }
# model UsageLog { ... }

# Then run:
bun run db:migrate
```

---

## 🧪 Quick Test

```typescript
// Test the module
import { LicenseValidator, LICENSE_TIERS } from '@/lib/licensing';

const mockLicense = {
  id: 'test',
  key: 'test-key',
  tier: 'professional',
  createdAt: new Date(),
  expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
  isActive: true,
  organizationId: 'org-test',
  organizationName: 'Test',
};

const result = LicenseValidator.validateLicense(mockLicense);
console.log('Valid:', result.valid);           // true
console.log('Tier:', result.tier);             // 'professional'
console.log('API Available:', isFeatureAvailable('professional', 'apiAccess')); // true
```

---

## 🔗 Related Docs

- **Full Reference**: `docs/LICENSING-MODULE.md`
- **Integration Guide**: `docs/LICENSING-INTEGRATION.md`
- **Code Examples**: `docs/LICENSING-EXAMPLES.md`
- **Architecture**: `docs/LICENSING-ARCHITECTURE.md`
- **Checklist**: `docs/LICENSING-CHECKLIST.md`

---

**Last Updated**: December 22, 2025  
**Module Version**: 1.0.0  
**Status**: ✅ Production Ready
