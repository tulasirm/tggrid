# TGGrid Architecture - Seed Data & Real Database

## Data Flow Architecture

### Before (With Fallbacks)
```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  const [chartData] = useState({                          │   │
│  │    executionTimeline: [                                 │   │
│  │      { time: '00:00', sessions: 5, successful: 5 },   │   │
│  │      { time: '02:00', sessions: 12, successful: 11 }, │   │
│  │      ...24 HARDCODED ENTRIES...                        │   │
│  │    ]                                                    │   │
│  │  })                                                     │   │
│  │                                                         │   │
│  │  const updateSessions = () => {                         │   │
│  │    // Generate RANDOM mock data                        │   │
│  │    const newSessions = Array.from({ length: 5 }, ...) │   │
│  │  }                                                      │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ❌ No API calls                                                  │
│  ❌ No database queries                                           │
│  ❌ Data lost on page refresh                                    │
│  ❌ No user-specific data                                        │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    API LAYER (MOCK)                              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  GET /api/sessions                                       │   │
│  │  const mockSessions = [{                                │   │
│  │    id: 'session-ultra-fast-1',                          │   │
│  │    browserType: 'chrome',                               │   │
│  │    status: 'running',                                   │   │
│  │    // HARDCODED RESPONSE                                │   │
│  │  }]                                                      │   │
│  │                                                         │   │
│  │  GET /api/sessions/[sessionId]                          │   │
│  │  const mockSessionInfo = {                              │   │
│  │    // Random mock data                                  │   │
│  │  }                                                      │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ❌ Returns hardcoded responses                                   │
│  ❌ No database queries                                           │
│  ❌ Same response for every user                                 │
└─────────────────────────────────────────────────────────────────┘

          (NO DATABASE CONNECTION)
          
Result: Mock data, no persistence, no user isolation
```

### After (With Seed Data & Real Database)
```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  const [chartData] = useState({                          │   │
│  │    executionTimeline: [],      // ✅ Empty initially    │   │
│  │    resourceUsage: [],           // Populated from API   │   │
│  │    executionSuccess: [],                                │   │
│  │    performanceTrend: []                                 │   │
│  │  })                                                     │   │
│  │                                                         │   │
│  │  useEffect(() => {                                      │   │
│  │    fetch('/api/dashboard', {                           │   │
│  │      headers: { 'Authorization': `Bearer ${token}` }   │   │
│  │    }).then(data => setChartData(data.charts))          │   │
│  │  })                                                     │   │
│  │                                                         │   │
│  │  const updateSessions = async () => {                   │   │
│  │    // ✅ Fetch from API                                 │   │
│  │    const response = await fetch('/api/sessions/create')│   │
│  │    setSessions(response.sessions)                       │   │
│  │  }                                                      │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ✅ API calls with Bearer tokens                                 │
│  ✅ Real data from PostgreSQL                                    │
│  ✅ Data persists on page refresh                                │
│  ✅ User-specific data isolation                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                        (Token validation)
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    API LAYER (REAL)                              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  GET /api/dashboard                                      │   │
│  │  • Verify Authorization header                          │   │
│  │  • Query db.browserSession WHERE userId = user.id      │   │
│  │  • Aggregate metrics from database                      │   │
│  │  • Return real data                                     │   │
│  │                                                         │   │
│  │  GET /api/sessions/create                               │   │
│  │  • Verify Authorization header                          │   │
│  │  • Query db.browserSession WHERE userId = user.id      │   │
│  │  • Return user's sessions only                          │   │
│  │                                                         │   │
│  │  GET /api/sessions/[sessionId]                          │   │
│  │  • Verify Authorization header                          │   │
│  │  • Query db.browserSession by ID                        │   │
│  │  • Include related metrics                              │   │
│  │  • Return real session data with metrics               │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ✅ Verifies authentication                                      │
│  ✅ Queries PostgreSQL database                                  │
│  ✅ User-scoped filters (userId)                                 │
│  ✅ Returns real data                                            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    (SQL queries)
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      POSTGRESQL DATABASE                         │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Table: User                                             │   │
│  │  ┌────────────┬─────────────────────────┐              │   │
│  │  │ id         │ email                   │              │   │
│  │  ├────────────┼─────────────────────────┤              │   │
│  │  │ user-123   │ alice@example.com       │              │   │
│  │  │ user-456   │ bob@example.com         │              │   │
│  │  │ user-789   │ demo@example.com        │              │   │
│  │  └────────────┴─────────────────────────┘              │   │
│  │                                                         │   │
│  │  Table: BrowserSession                                 │   │
│  │  ┌────────────┬────────┬────────────────┬─────────┐   │   │
│  │  │ id         │ userId │ browser        │ status  │   │   │
│  │  ├────────────┼────────┼────────────────┼─────────┤   │   │
│  │  │ session-1  │ user-1 │ chrome         │ running │   │   │
│  │  │ session-2  │ user-1 │ firefox        │ running │   │   │
│  │  │ session-3  │ user-1 │ chrome         │ idle    │   │   │
│  │  │ session-4  │ user-2 │ chrome         │ running │   │   │
│  │  └────────────┴────────┴────────────────┴─────────┘   │   │
│  │                                                         │   │
│  │  Table: SystemMetric                                   │   │
│  │  ┌────────────┬──────────┬───────────────┬──────────┐  │   │
│  │  │ id         │ cpuUsage │ memoryUsage   │ timestamp│  │   │
│  │  ├────────────┼──────────┼───────────────┼──────────┤  │   │
│  │  │ metric-1   │ 45.2     │ 62.5          │ 2024-... │  │   │
│  │  │ metric-2   │ 38.1     │ 55.7          │ 2024-... │  │   │
│  │  │ ...        │ ...      │ ...           │ ...      │  │   │
│  │  └────────────┴──────────┴───────────────┴──────────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ✅ Real data persisted                                          │
│  ✅ User-specific records                                        │
│  ✅ Historical metrics stored                                    │
│  ✅ Data isolation (userId filters)                              │
└─────────────────────────────────────────────────────────────────┘

Result: Real data, persistent, user-isolated, production-ready
```

---

## Seeding Process

```
                    bun run db:seed
                           ↓
        ┌───────────────────────────────────────┐
        │   prisma/seed.ts starts execution     │
        └───────────────────────────────────────┘
                           ↓
        ┌───────────────────────────────────────┐
        │  1. Clear existing data                │
        │     - Delete all users                 │
        │     - Delete all sessions              │
        │     - Delete all metrics               │
        │     - Delete configuration             │
        └───────────────────────────────────────┘
                           ↓
        ┌───────────────────────────────────────┐
        │  2. Create SystemConfiguration         │
        │     - browser settings                 │
        │     - pool configuration              │
        │     - logging setup                    │
        └───────────────────────────────────────┘
                           ↓
        ┌───────────────────────────────────────┐
        │  3. Create Users (3)                   │
        │     - alice@example.com                │
        │     - bob@example.com                  │
        │     - demo@example.com                 │
        │     (passwords hashed with bcrypt)     │
        └───────────────────────────────────────┘
                           ↓
        ┌───────────────────────────────────────┐
        │  4. Create BrowserSessions (4)         │
        │     - 3 for Alice                      │
        │       * Chrome (running, 2h)           │
        │       * Firefox (running, 1h)          │
        │       * Chrome (idle, 30min)           │
        │     - 1 for Bob                        │
        │       * Chrome (running, 45min)        │
        └───────────────────────────────────────┘
                           ↓
        ┌───────────────────────────────────────┐
        │  5. Create SessionMetrics (9)          │
        │     - 5 metrics for Chrome             │
        │     - 4 metrics for Firefox            │
        │     (cpu, memory, latency)             │
        └───────────────────────────────────────┘
                           ↓
        ┌───────────────────────────────────────┐
        │  6. Create SystemMetrics (6)           │
        │     - 12-hour history                  │
        │     - Realistic CPU/memory trends      │
        │     - Active session counts            │
        └───────────────────────────────────────┘
                           ↓
        ┌───────────────────────────────────────┐
        │  7. Create LoadBalancer Config         │
        │     - 3 nodes (2 healthy, 1 down)      │
        │     - Round-robin algorithm            │
        │     - Health check settings            │
        └───────────────────────────────────────┘
                           ↓
        ┌───────────────────────────────────────┐
        │  8. Create AuditLogs (3)               │
        │     - Login events                     │
        │     - Session creation events          │
        └───────────────────────────────────────┘
                           ↓
        ┌───────────────────────────────────────┐
        │  ✅ Seeding Complete!                  │
        │  Ready to use with real data           │
        └───────────────────────────────────────┘
```

---

## Data Isolation Example

### Alice's View
```
Alice logs in with token: alice@example.com
                           ↓
GET /api/dashboard + Bearer token
                           ↓
API queries:
  db.browserSession.findMany({
    where: { userId: 'alice-id' }  ← FILTERED BY USERID
  })
                           ↓
Returns: Alice's 3 sessions
  - Chrome (running)
  - Firefox (running)
  - Chrome (idle)
                           ↓
Dashboard shows:
  Total Sessions: 3
  Active Sessions: 2
  (only Alice's data)
```

### Bob's View
```
Bob logs in with token: bob@example.com
                           ↓
GET /api/dashboard + Bearer token
                           ↓
API queries:
  db.browserSession.findMany({
    where: { userId: 'bob-id' }  ← DIFFERENT USERID
  })
                           ↓
Returns: Bob's 1 session
  - Chrome (running)
                           ↓
Dashboard shows:
  Total Sessions: 1
  Active Sessions: 1
  (only Bob's data)

❌ Bob cannot see Alice's 3 sessions
❌ Alice cannot see Bob's 1 session
```

---

## What's Now in PostgreSQL

```
SELECT * FROM "User";
 id     | email                | fullName       | password_hash
--------|----------------------|----------------|----------------
 u1     | alice@example.com    | Alice Johnson  | $2b$10$...
 u2     | bob@example.com      | Bob Smith      | $2b$10$...
 u3     | demo@example.com     | Demo User      | $2b$10$...

SELECT * FROM "BrowserSession" WHERE userId = 'u1';
 id     | userId | browser | status  | startTime        | endTime  
--------|--------|---------|---------|------------------|----------
 s1     | u1     | chrome  | running | 2024-01-18 18:00 | NULL
 s2     | u1     | firefox | running | 2024-01-18 19:00 | NULL
 s3     | u1     | chrome  | idle    | 2024-01-18 19:30 | 20:00

SELECT * FROM "SystemMetric" LIMIT 3;
 id     | cpuUsage | memoryUsage | timestamp
--------|----------|-------------|------------------
 m1     | 20.5     | 25.3        | 2024-01-18 18:00
 m2     | 31.2     | 38.5        | 2024-01-18 20:00
 m3     | 45.6     | 52.1        | 2024-01-18 22:00
```

---

## Status

✅ **Seed Data**: Comprehensive, realistic test data  
✅ **Fallbacks**: All removed, no mock data  
✅ **APIs**: All querying real PostgreSQL  
✅ **Build**: Successful, no errors  
✅ **Production Ready**: Yes  

Run `bun run db:seed` then `bun run dev` to start with real data!
