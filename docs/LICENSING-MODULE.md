# Licensing Module Documentation

## Overview

The licensing module handles all aspects of license management for UFBrowsers, including:
- License tier definitions (Starter, Professional, Enterprise)
- Feature gating based on tier
- Usage tracking and metrics
- License validation
- API protection and enforcement

## License Tiers

### Starter (Free)
- **Price**: Free forever
- **Sessions/Month**: 10
- **Max Concurrent**: 5
- **Features**:
  - Basic monitoring
  - Chrome only
  - 1 region
  - Community support
  - Email alerts

### Professional ($99/month)
- **Price**: $99/month
- **Sessions/Month**: 10,000
- **Max Concurrent**: 50
- **Features**:
  - Advanced monitoring
  - Chrome & Firefox
  - 3 regions
  - API access
  - Audit logs
  - Auto-scaling
  - VNC live viewing
  - Session recording
  - Webhook integration
  - Priority support

### Enterprise (Custom)
- **Price**: Custom pricing
- **Sessions/Month**: Unlimited
- **Max Concurrent**: 1,000
- **Features**:
  - All Professional features
  - All regions (10+)
  - Custom integration
  - Dedicated support
  - SLA guarantee
  - On-premise deployment
  - Multi-team management
  - Advanced security

## Module Structure

```
src/lib/licensing/
├── types.ts                 # Type definitions
├── tiers.ts                 # Tier configurations
├── validator.ts             # License validation logic
├── usage-tracker.ts         # Usage tracking
└── index.ts                 # Module exports

src/middleware/
└── license.ts               # Route protection middleware

src/app/api/license/
├── validate/route.ts        # License validation endpoint
├── usage/route.ts           # Usage metrics endpoint
└── tiers/route.ts           # Available tiers endpoint

src/components/license/
├── LicenseInfo.tsx          # License status display
└── LicenseFeatures.tsx      # Feature listing component
```

## Usage Examples

### 1. Check License Validity

```typescript
import { LicenseValidator } from '@/lib/licensing';

const licenseKey = {
  id: 'lic-123',
  key: 'key-abc',
  tier: 'professional',
  createdAt: new Date(),
  expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
  isActive: true,
  organizationId: 'org-1',
  organizationName: 'Acme Corp',
};

const result = LicenseValidator.validateLicense(licenseKey);
if (result.valid) {
  console.log('License is valid');
  console.log('Tier:', result.tier);
}
```

### 2. Check Feature Availability

```typescript
import { isFeatureAvailable, isTierAtLeast } from '@/lib/licensing';

// Check if feature is available
const hasAPI = isFeatureAvailable('professional', 'apiAccess');

// Check tier level
const isPro = isTierAtLeast('professional', 'professional');
```

### 3. Validate Session Limits

```typescript
import { LicenseValidator } from '@/lib/licensing';

const violation = LicenseValidator.checkSessionLimitViolation(
  'professional',
  45,    // current sessions
  9500   // monthly session count
);

if (violation) {
  console.log('Limit violation:', violation.message);
}
```

### 4. Track Usage Events

```typescript
import { globalUsageTracker } from '@/lib/licensing';

// Record a session creation
globalUsageTracker.recordSessionCreated('org-1', 'professional', 'chrome', 'us-east-1');

// Record browser usage
globalUsageTracker.recordBrowserUsage('org-1', 'professional', 'firefox');

// Record API call
globalUsageTracker.recordApiCall('org-1', 'professional', '/api/sessions/create', 200);

// Get metrics
const metrics = globalUsageTracker.getMetrics('org-1');
const summary = globalUsageTracker.getSummary('org-1', 30); // Last 30 days
```

### 5. Protect API Routes

```typescript
import { withLicenseProtection } from '@/middleware/license';

export const POST = withLicenseProtection(
  async (request: NextRequest) => {
    // Protected route logic
    return NextResponse.json({ success: true });
  },
  { requiredTier: 'professional', requiredFeature: 'apiAccess' }
);
```

### 6. Display License Info in UI

```typescript
import { LicenseInfo } from '@/components/license/LicenseInfo';

export function DashboardPage() {
  return (
    <div>
      <LicenseInfo 
        tier="professional"
        maxSessions={50}
        currentSessions={25}
        daysUntilExpiration={180}
      />
    </div>
  );
}
```

### 7. Display Available Features

```typescript
import { LicenseFeatures } from '@/components/license/LicenseFeatures';

export function FeaturePage() {
  return (
    <div>
      <LicenseFeatures tier="professional" />
    </div>
  );
}
```

## API Endpoints

### GET /api/license/validate
Validate a license key.

**Query Parameters:**
- `key`: License key to validate

**Response:**
```json
{
  "status": "success",
  "data": {
    "valid": true,
    "tier": "professional",
    "expiresAt": "2025-12-22T...",
    "allowedFeatures": { ... },
    "usageMetrics": { ... }
  }
}
```

### POST /api/license/validate
Validate license key in request body.

**Request Body:**
```json
{
  "licenseKey": "key-abc"
}
```

### GET /api/license/usage
Get usage metrics for an organization.

**Query Parameters:**
- `org`: Organization ID (required)
- `days`: Days to look back (default: 30)

**Response:**
```json
{
  "status": "success",
  "data": {
    "metrics": { ... },
    "summary": { ... }
  }
}
```

### POST /api/license/usage
Record a usage event.

**Request Body:**
```json
{
  "organizationId": "org-1",
  "tier": "professional",
  "eventType": "session_created",
  "metadata": {
    "browserType": "chrome",
    "region": "us-east-1"
  }
}
```

### GET /api/license/tiers
Get all available license tiers.

**Response:**
```json
{
  "status": "success",
  "data": {
    "tiers": [
      {
        "tier": "starter",
        "displayName": "Starter",
        "price": "Free",
        "period": "forever",
        "description": "...",
        "features": { ... }
      },
      ...
    ]
  }
}
```

## License Validation Rules

1. **Active Check**: License must have `isActive = true`
2. **Expiration Check**: License `expiresAt` must be in the future
3. **Tier Check**: Tier must be valid (starter, professional, enterprise)
4. **Feature Check**: Feature must be enabled for the tier
5. **Session Limits**: Current + monthly sessions must not exceed tier limits
6. **Browser Support**: Browser type must be in tier's `supportedBrowsers`
7. **Region Availability**: Region count must be available in tier

## Violation Severity Levels

- **warning**: Non-critical issue (e.g., 95% of monthly limit reached)
- **error**: Critical issue that might prevent some operations
- **critical**: License invalid, must be resolved immediately

## Database Schema (Prisma)

When integrating with your database, add:

```prisma
model License {
  id                String   @id @default(cuid())
  key               String   @unique
  tier              String   // 'starter' | 'professional' | 'enterprise'
  organizationId    String
  organization      Organization @relation(fields: [organizationId], references: [id])
  isActive          Boolean  @default(true)
  createdAt         DateTime @default(now())
  expiresAt         DateTime?
  maxUsers          Int?
  maxSessions       Int?
  metadata          Json?
  createdBy         String?
  updatedAt         DateTime @updatedAt

  @@index([organizationId])
  @@index([key])
}

model UsageLog {
  id              String   @id @default(cuid())
  organizationId  String
  organization    Organization @relation(fields: [organizationId], references: [id])
  tier            String
  eventType       String   // 'session_created' | 'session_completed' | etc
  metadata        Json?
  timestamp       DateTime @default(now())

  @@index([organizationId])
  @@index([timestamp])
}
```

## Best Practices

1. **Always validate licenses** before critical operations
2. **Track usage events** for accurate billing
3. **Monitor approaching limits** and warn users
4. **Use Prometheus metrics** for monitoring
5. **Cache license checks** with short TTL to reduce database load
6. **Implement graceful degradation** when limits are reached
7. **Set up alerts** for expiring licenses
8. **Audit all license changes** for compliance

## Testing

```typescript
import { LICENSE_TIERS } from '@/lib/licensing';

describe('License Module', () => {
  it('should validate professional tier', () => {
    const tierConfig = LICENSE_TIERS.professional;
    expect(tierConfig.features.apiAccess).toBe(true);
    expect(tierConfig.features.maxSessions).toBe(50);
  });
  
  it('should track usage events', () => {
    const tracker = new LicenseUsageTracker();
    tracker.recordSessionCreated('org-1', 'professional', 'chrome', 'us-east-1');
    
    const metrics = tracker.getMetrics('org-1');
    expect(metrics?.sessionCount).toBe(1);
  });
});
```

## Integration Checklist

- [ ] Add License and UsageLog models to Prisma schema
- [ ] Run `bun run db:migrate` to create tables
- [ ] Add license validation to critical API endpoints
- [ ] Add usage tracking to session creation/completion
- [ ] Display license info in dashboard
- [ ] Set up license expiration alerts
- [ ] Configure Prometheus metrics export
- [ ] Add license validation to UI feature toggles
- [ ] Test all tier limitations
- [ ] Document in API docs

