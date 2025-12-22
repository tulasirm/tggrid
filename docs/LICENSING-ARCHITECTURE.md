# Licensing Module Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        UFBrowsers Application                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │               React Components (UI Layer)                  │ │
│  ├────────────────────────────────────────────────────────────┤ │
│  │  ┌──────────────────┐      ┌──────────────────┐           │ │
│  │  │  LicenseInfo     │      │ LicenseFeatures  │           │ │
│  │  │  - Status        │      │ - Feature List   │           │ │
│  │  │  - Usage         │      │ - Availability   │           │ │
│  │  │  - Expiration    │      │ - Limits         │           │ │
│  │  └──────────────────┘      └──────────────────┘           │ │
│  └────────────────────────────────────────────────────────────┘ │
│                               ↓                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              API Routes (API Layer)                        │ │
│  ├────────────────────────────────────────────────────────────┤ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │ │
│  │  │   /validate  │  │    /usage    │  │    /tiers    │    │ │
│  │  │ - GET/POST   │  │  - GET/POST  │  │    - GET     │    │ │
│  │  │ - Check key  │  │  - Track evt │  │  - List all  │    │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘    │ │
│  └────────────────────────────────────────────────────────────┘ │
│                               ↓                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │        Middleware (Request Protection)                     │ │
│  ├────────────────────────────────────────────────────────────┤ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │  licenseMiddleware - Route Protection               │ │ │
│  │  │  - Validate license in headers                      │ │ │
│  │  │  - Check feature access                             │ │ │
│  │  │  - Enforce tier requirements                        │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────┘ │
│                               ↓                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │          Core Library (src/lib/licensing/)                │ │
│  ├────────────────────────────────────────────────────────────┤ │
│  │                                                            │ │
│  │  ┌──────────────────────────────────────────────────┐    │ │
│  │  │           types.ts - Type Definitions            │    │ │
│  │  │  - LicenseKey, LicenseTier, LicenseFeatures     │    │ │
│  │  │  - LicenseCheckResult, UsageMetrics             │    │ │
│  │  │  - LicenseViolation, LicenseUsageEvent          │    │ │
│  │  └──────────────────────────────────────────────────┘    │ │
│  │                          ↓                                 │ │
│  │  ┌──────────────────────────────────────────────────┐    │ │
│  │  │    tiers.ts - Tier Configuration                │    │ │
│  │  │  ┌────────────────────────────────────────────┐ │    │ │
│  │  │  │ Starter (Free)                             │ │    │ │
│  │  │  │ - 10 sessions/month, 5 concurrent          │ │    │ │
│  │  │  │ - Chrome only, 1 region                    │ │    │ │
│  │  │  │ - Basic monitoring, no API                 │ │    │ │
│  │  │  ├────────────────────────────────────────────┤ │    │ │
│  │  │  │ Professional ($99/mo)                      │ │    │ │
│  │  │  │ - 10,000 sessions/month, 50 concurrent     │ │    │ │
│  │  │  │ - Chrome + Firefox, 3 regions              │ │    │ │
│  │  │  │ - Advanced monitoring, API access          │ │    │ │
│  │  │  ├────────────────────────────────────────────┤ │    │ │
│  │  │  │ Enterprise (Custom)                        │ │    │ │
│  │  │  │ - Unlimited sessions                       │ │    │ │
│  │  │  │ - All browsers, 10+ regions                │ │    │ │
│  │  │  │ - All features, dedicated support          │ │    │ │
│  │  │  └────────────────────────────────────────────┘ │    │ │
│  │  │  - getLicenseTier()                              │    │ │
│  │  │  - isFeatureAvailable()                          │    │ │
│  │  │  - compareTiers()                                │    │ │
│  │  └──────────────────────────────────────────────────┘    │ │
│  │                          ↓                                 │ │
│  │  ┌──────────────────────────────────────────────────┐    │ │
│  │  │    validator.ts - License Validation            │    │ │
│  │  │  LicenseValidator class:                         │    │ │
│  │  │  - validateLicense()         [Check validity]   │    │ │
│  │  │  - canUseFeature()           [Feature access]   │    │ │
│  │  │  - checkSessionLimit()       [Limit enforce]    │    │ │
│  │  │  - isBrowserSupported()      [Browser check]    │    │ │
│  │  │  - isRegionAvailable()       [Region check]     │    │ │
│  │  │  - daysUntilExpiration()     [Expiry check]     │    │ │
│  │  │  - getUsagePercentage()      [Usage calc]       │    │ │
│  │  └──────────────────────────────────────────────────┘    │ │
│  │                          ↓                                 │ │
│  │  ┌──────────────────────────────────────────────────┐    │ │
│  │  │  usage-tracker.ts - Usage Tracking              │    │ │
│  │  │  LicenseUsageTracker class:                     │    │ │
│  │  │  Events tracked:                                │    │ │
│  │  │  - session_created                              │    │ │
│  │  │  - session_completed                            │    │ │
│  │  │  - browser_type_used                            │    │ │
│  │  │  - region_used                                  │    │ │
│  │  │  - api_call                                     │    │ │
│  │  │  - feature_used                                 │    │ │
│  │  │  Methods:                                       │    │ │
│  │  │  - recordEvent()          [Generic event]       │    │ │
│  │  │  - recordSessionCreated() [Session create]      │    │ │
│  │  │  - recordApiCall()        [API usage]           │    │ │
│  │  │  - getMetrics()           [Get metrics]         │    │ │
│  │  │  - getSummary()           [Get summary]         │    │ │
│  │  │  - exportMetrics()        [Prometheus format]   │    │ │
│  │  └──────────────────────────────────────────────────┘    │ │
│  │                                                            │ │
│  └────────────────────────────────────────────────────────────┘ │
│                               ↓                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │               Data Layer (Persistence)                     │ │
│  ├────────────────────────────────────────────────────────────┤ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │           PostgreSQL Database (Prisma)              │ │ │
│  │  │  Tables:                                             │ │ │
│  │  │  - License (key, tier, org, active, expires)        │ │ │
│  │  │  - UsageLog (org, tier, event, metadata, ts)        │ │ │
│  │  │  - Organization (licensing parent)                  │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│              User Action (e.g., Create Session)                  │
└──────────────────┬───────────────────────────────────────────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │  API Endpoint        │
        │  /api/sessions/create│
        └──────────┬───────────┘
                   │
                   ▼
        ┌──────────────────────────┐
        │  License Middleware      │
        │  - Extract license key   │
        │  - Validate auth header  │
        └──────────┬───────────────┘
                   │
                   ▼
        ┌──────────────────────────┐
        │  LicenseValidator        │
        │  - Check license valid   │
        │  - Check expiration      │
        │  - Verify tier support   │
        └──────────┬───────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
      Valid                Invalid
        │                     │
        ▼                     ▼
    ┌────────┐          ┌──────────┐
    │ Check  │          │ Return   │
    │Features│          │ 403 Error│
    └───┬────┘          └──────────┘
        │
        ▼
    ┌──────────────────────┐
    │ Check Session Limits │
    │ - Current sessions   │
    │ - Monthly count      │
    └───┬────────────────┬─┘
        │                │
     OK │               Limit Exceeded
        │                │
        ▼                ▼
    ┌────────┐      ┌──────────┐
    │Create  │      │ Return   │
    │Session │      │ 403 Error│
    └───┬────┘      └──────────┘
        │
        ▼
    ┌──────────────────────┐
    │ Record Usage Event   │
    │ - recordSessionCreated│
    │ - globalUsageTracker │
    └───┬────────────────┬─┘
        │                │
        ▼                ▼
    ┌────────────┐  ┌─────────────┐
    │Update      │  │Aggregate    │
    │Session     │  │Metrics      │
    │Metrics     │  │- Browser    │
    └────────┬───┘  │- Region     │
             │      │- Count      │
             │      └─────────────┘
             ▼
    ┌────────────────────┐
    │ Return 200 OK      │
    │ { sessionId, ... } │
    └────────────────────┘
```

## Feature Flow

```
User Request
    │
    ├─► Premium Feature?
    │   │
    │   ├─► [YES] → Check License Tier
    │   │           │
    │   │           ├─► Enterprise? → Allow ✓
    │   │           │
    │   │           ├─► Professional? 
    │   │           │   ├─► Feature available? → Allow ✓
    │   │           │   └─► Deny × (Upgrade prompt)
    │   │           │
    │   │           └─► Starter? → Deny × (Upgrade prompt)
    │   │
    │   └─► [NO] → Allow (free feature) ✓
    │
    └─► Return Response
```

## Session Limit Checking

```
                    Create Session Request
                            │
                            ▼
                ┌─────────────────────────┐
                │ Get Current Session Count│
                │ Get Monthly Session Count│
                └────────┬────────────────┘
                         │
                         ▼
        ┌────────────────────────────────┐
        │ Load Tier Configuration        │
        │ - maxSessions: 50              │
        │ - maxSessionsPerMonth: 10,000  │
        └────────┬───────────────────────┘
                 │
                 ▼
        ┌────────────────────────────┐
        │ Check Current < Max?        │
        │ (45 < 50) = TRUE           │
        └───┬──────────────────┬──────┘
            │                  │
          TRUE                FALSE
            │                  │
            ▼                  ▼
    ┌──────────────┐    ┌───────────────┐
    │Check Monthly │    │Limit Exceeded!│
    │Usage %       │    │Return Error   │
    └─────┬────────┘    └───────────────┘
          │
          ▼
    ┌──────────────┐
    │ < 95% OK?    │
    │ (95% = warn) │
    └─┬────────┬───┘
    YES      NO (warning)
      │         │
      ▼         ▼
   Allow   Warn & Allow
      │         │
      └────┬────┘
           ▼
        Return OK
```

## Integration Points

```
┌─────────────────────────────────────────────────────┐
│                 Your Application                    │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Session Creation               Browser Operations │
│  ├─► Check License    ◄─────────────────────────┐  │
│  ├─► Validate Tier                              │  │
│  ├─► Check Limits                               │  │
│  └─► Track Usage                                │  │
│                                                     │
│  Dashboard                      Feature Access      │
│  ├─► Display License Info  ◄────┐                 │
│  ├─► Show Usage            │    │                 │
│  └─► Feature List          │    ├─ isFeatureAvail │
│                            │                       │
│  Monitoring                 │                       │
│  ├─► Prometheus Export ◄────┤                     │
│  └─► Usage Metrics          │                     │
│                             └─ globalUsageTracker │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## Module Dependencies

```
index.ts (Main Export)
    │
    ├─► types.ts (Type Definitions)
    │   └─ No dependencies
    │
    ├─► tiers.ts (Tier Configuration)
    │   └─ depends on: types.ts
    │
    ├─► validator.ts (Validation Logic)
    │   └─ depends on: types.ts, tiers.ts
    │
    └─► usage-tracker.ts (Usage Tracking)
        └─ depends on: types.ts

middleware/license.ts
    └─ depends on: validator.ts, types.ts

api/license/validate/route.ts
    └─ depends on: validator.ts, types.ts

api/license/usage/route.ts
    └─ depends on: usage-tracker.ts, types.ts

api/license/tiers/route.ts
    └─ depends on: tiers.ts

components/LicenseInfo.tsx
    └─ depends on: types.ts, validator.ts

components/LicenseFeatures.tsx
    └─ depends on: types.ts, tiers.ts
```

---

This architecture provides:
- ✅ Clear separation of concerns
- ✅ Type-safe interfaces
- ✅ Scalable design
- ✅ Database-ready
- ✅ Easy integration points
- ✅ Production-ready code
