# UFBrowsers Copilot Instructions

## Project Overview

**UFBrowsers** is an Enterprise Selenium browser automation platform built on Next.js 15 with TypeScript, enabling parallel test execution at scale with <100ms session startup. The architecture separates concerns between the main Next.js application (UI + REST API on port 3000), WebSocket service (real-time updates on port 3001), and browser pool service (Docker container lifecycle on port 3002).

## Architecture Essentials

### Tech Stack
- **Framework**: Next.js 15 (App Router) + TypeScript 5
- **UI**: shadcn/ui (Radix UI) + Tailwind CSS 4
- **Database**: Prisma ORM with PostgreSQL (v15+)
- **State**: Zustand + React Query (TanStack)
- **Forms**: React Hook Form + Zod validation
- **WebSocket**: Socket.IO (browser-websocket service), WebSocket (browser-pool service)
- **Automation**: Docker containers (Chrome Alpine, Firefox Alpine), Chrome Remote Interface
- **Runtime**: Bun (preferred) / Node.js
- **Build Output**: `output: "standalone"` (deployable without node_modules)

### Directory Structure
- `src/app/` - Next.js pages and API routes (App Router)
  - `api/sessions/` - Browser session management endpoints
    - `create/route.ts` - POST endpoint to create new session
    - `list/route.ts` - GET endpoint to list active sessions
    - `ultra-fast/route.ts` - Ultra-fast <100ms session creation
    - `[sessionId]/automation/route.ts` - WebSocket automation endpoint
  - `api/auth/` - Authentication (NextAuth + SSO: Azure AD, Google, SAML)
  - `api/rbac/` - Role-Based Access Control (assign roles, check permissions)
  - `api/regions/` - Multi-region deployment management
  - `api/health/` - Service health checks (30s polling interval)
  - `api/config/`, `api/dashboard/`, `api/loadbalancer/`, `api/metrics/`, `api/reports/`, `api/security/` - Domain-specific APIs
  - `page.tsx` - Enterprise dashboard (~3060 lines; client component with metrics visualization, session management, health monitoring)
  - `layout.tsx` - Root layout with metadata
- `src/components/ui/` - 40+ shadcn/ui components (pre-configured)
- `src/lib/` - Utilities (db singleton with Prisma, cn() helper)
- `src/hooks/` - Custom hooks (use-toast, use-mobile, use-config)
- `mini-services/browser-websocket/` - Socket.IO server (port 3001) for real-time events: `session:create`, `session:update`, `metrics:update`
- `mini-services/browser-pool/` - WebSocket/Dockerode server (port 3002) managing Chrome/Firefox Alpine containers with pre-warming and CDP connectivity
- `prisma/schema.prisma` - Data models: User (auth + 2FA), BrowserSession, SessionMetric (time-series), SystemConfiguration, LoadBalancerConfig, AuditLog (compliance)
- `containers/` - Docker container definitions (Chrome Alpine, Firefox Alpine)
- `scripts/setup-selenium-grid.sh` - Docker Compose setup for Selenium Grid
- `start-all-services.sh` - Multi-terminal startup orchestration script

### Key Design Patterns

**Three-Tier Service Architecture**: 
1. Main Next.js (port 3000) - UI dashboard + REST API (sessions, auth, RBAC, health, config)
2. WebSocket Service (port 3001) - Socket.IO for real-time client updates; stores sessions/connections in-memory
3. Browser Pool Service (port 3002) - Dockerode + CDP client; pre-warms containers, manages lifecycle, tracks metrics (poolHits, avgStartupTime)

All three coordinate via environment variables and HTTP/WebSocket APIs. Use `bun run dev:all` for development or `./start-all-services.sh` for orchestrated startup in separate terminals.

**Database Singleton**: [src/lib/db.ts](src/lib/db.ts) ensures single Prisma client across the app (critical for serverless/edge). PostgreSQL is the production database.

**Client-First Dashboard**: Dashboard component ([src/app/page.tsx](src/app/page.tsx)) is a `"use client"` component with real-time service health checks (`GET /api/health` every 30s).

**Ultra-Fast Browser Automation** (inspired by aerokube/moon):
- Alpine Linux containers (~5MB) vs 1GB+ standard; 128MB RAM + 0.25 CPU per container
- Pre-warmed pool (default: 10 containers, 5 pre-warmed) for instant session reuse
- Direct Chrome Remote Debugging Protocol (CDP) via chrome-remote-interface; no Selenium Grid overhead
- Metrics: totalCreated, totalReused, avgStartupTime, poolHits%, poolMisses% exposed via `/api/health`
- Session startup: <100ms for pre-warmed (pool hit), 200-500ms for new (pool miss)

## Critical Developer Workflows

### Setup
```bash
bun install                 # Install all dependencies
bun run db:push            # Push Prisma schema to PostgreSQL
cp .env.example .env       # Configure environment variables
```

### Environment Configuration
Key variables for multi-service coordination (see `.env.example` for complete list):

**Database & Core**:
```bash
DATABASE_URL="postgresql://user:pass@localhost:5432/tggrid"
NODE_ENV=development
NEXTAUTH_SECRET=your-super-secret-key
```

**Service Ports**:
```bash
PORT=3000                          # Main Next.js app
BROWSER_POOL_PORT=3002            # Browser pool service
WEBSOCKET_PORT=3001               # WebSocket service
```

**Browser Pool Configuration**:
```bash
BROWSER_POOL_SIZE=20              # Max containers in pool
PRE_WARM_COUNT=10                 # Pre-warmed containers on startup
CONTAINER_STARTUP_TIMEOUT=5000    # Milliseconds
MAX_MEMORY_PER_CONTAINER=128      # MB
MAX_CPU_PER_CONTAINER=0.25        # CPU quota
```

### Docker Requirements
- **Docker daemon must be running**: `docker ps` should return successfully
- **Pre-warm containers consume resources**: Default config reserves 10 × 128MB = ~1.3GB RAM + CPU quota
- **Bridge network**: Containers use `DOCKER_NETWORK` env var (default: selenium-grid) for inter-container communication
- **Auto-remove policy**: Containers auto-cleanup after session ends; check `docker ps -a` if cleanup fails

### Development - Multi-Service Startup
**Recommended Option 1**: Use npm script (concurrent):
```bash
bun run dev:all  # Runs all 3 services in one terminal with color-coded output
```

**Recommended Option 2**: Use orchestration script (separate terminals):
```bash
./start-all-services.sh  # Spawns 3 xterm windows (macOS: iTerm2, Linux: xterm)
```

**Manual startup** (in 3 separate terminals):
```bash
# Terminal 1 - Next.js main app (port 3000)
bun run dev

# Terminal 2 - Browser pool service (port 3002)
cd mini-services/browser-pool && bun install && bun run dev

# Terminal 3 - WebSocket service (port 3001)
cd mini-services/browser-websocket && bun install && bun run dev
```

⚠️ **Startup Order**: No strict requirement, but health checks may fail briefly if services start out-of-order. Dashboard polls `/api/health` every 30 seconds; wait ~1 minute for all green.

Server logs saved to: `dev.log` (dev), `server.log` (prod), or stdout (concurrent mode).

### Production Build
```bash
bun run build              # Builds standalone output (.next/standalone)
bun start                  # Runs production build (NODE_ENV=production)
```

### Database Operations
- `bun run db:generate` - Regenerate Prisma client after schema changes
- `bun run db:migrate` - Interactive migration for schema changes
- `bun run db:reset` - Destructive: reset + reapply migrations
- `bun run db:seed` - Run seed file (prisma/seed.ts) to populate test data

## Project-Specific Conventions

### Authentication & Authorization
- **NextAuth.js 4**: Handles JWT tokens, session management, provider integrations (Azure AD, Google, SAML)
- **RBAC Middleware**: Protect API routes with role checks; import `rbacMiddleware` from `@/middleware/rbac`
  ```typescript
  export async function POST(request: NextRequest) {
    const auth = await rbacMiddleware(request, ['sessions.create'])
    if (auth.error) return auth.response
    // safe to use auth.userId, auth.role
  }
  ```
- **Roles**: admin, manager, user, viewer with granular permissions (sessions.*, users.*, config, audit, metrics)

### UI Patterns
- **Tailwind + shadcn/ui**: Use `cn()` helper from `src/lib/utils.ts` for safe class merging
- **Forms**: React Hook Form + Zod; schemas validate at runtime. Example: `useForm({ resolver: zodResolver(sessionSchema) })`
- **Real-time Updates**: Use Socket.IO client from `io('http://localhost:3001')` for live session/metrics feeds
- **DND Kit + Framer Motion**: Drag-drop for session reordering, animations for modals/transitions

### API Route Conventions
- File-based routing: `src/app/api/sessions/create/route.ts` → `POST /api/sessions/create`
- Prefer Next.js 15 server actions over route handlers for mutations when possible
- Return standard JSON: `{ status, data, error, timestamp }`

### Type Definitions
- Keep local interfaces near usage (see `src/app/page.tsx` for BrowserSession, SystemMetrics)
- Reusable types: add to `src/types/` (create directory if needed)
- Prisma types auto-generated; import from `@prisma/client`

## Integration Points & External Dependencies

### Browser Automation
- **Docker Alpine Containers**: Chrome + Firefox images in `containers/` built via Dockerfile and Dockerfile.recording/Dockerfile.vnc
- **Dockerode**: Node.js Docker client in browser-pool service for container lifecycle (create, start, stop, remove)
- **Chrome Remote Debugging Protocol (CDP)**: Direct control via chrome-remote-interface; enables <100ms startup vs Selenium Grid overhead
- **WebDriver Compatibility**: Sessions expose `cdpUrl` for Selenium/Playwright clients to connect directly
- **VNC & Recording**: Optional supervisord-based container variants for remote viewing or video capture

### Real-Time Communication
**Socket.IO Server** (`mini-services/browser-websocket/` port 3001):
- Events: `session:create`, `session:update`, `metrics:update`, `health:change`
- In-memory storage: activeConnections (client sockets), activeSessions (browser sessions)
- CORS: Configured for http://localhost:3000 (or NEXTAUTH_URL env var)
- Metrics: totalConnections, activeConnections, totalSessions, messagesSent (exposed via WebSocket API)

### Health Check API (`GET /api/health`)
Dashboard polls every 30 seconds. Returns comprehensive system status:
```json
{
  "status": "healthy|unhealthy",
  "timestamp": "2025-12-22T...",
  "services": {
    "mainApp": "healthy",
    "browserPool": "healthy",
    "cdpClient": "healthy",
    "database": "healthy",
    "docker": "healthy"
  },
  "performance": { "cpuUsage": 35.2, "memoryUsage": 48.1, "activeConnections": 42 },
  "browserPool": { "totalCreated": 150, "totalReused": 5420, "avgStartupTime": 245, "poolHits": 97.2, "poolMisses": 2.8 }
}
```

**Implementation Note**: Currently returns mock/simulated values in production. For real metrics:
1. Query Docker daemon via `docker.listContainers()` for actual container counts
2. Read from browser-pool WebSocket API for accurate pool metrics
3. Query PostgreSQL via Prisma for session history

### Multi-Region & Deployment
- **K8s**: Helm charts in `helm/tggrid/` with overlays for AWS/GKE/DigitalOcean
- **Docker Compose**: Multi-region setup via `docker-compose.multi-region.yml` + `scripts/setup-multi-region.sh`
- **Database Replication**: PostgreSQL primary-replica setup; see `scripts/setup-db-replication.sh`
- **CDN**: Cloudflare/CloudFront config in `cdn/` with static optimizer worker

### Image Processing & Recording
- **Sharp**: Browser screenshot capture and image optimization
- **Recording**: supervisord-based container variants (Dockerfile.recording) with ffmpeg for video capture
- **VNC**: supervisord-based novnc integration for remote browser viewing (Dockerfile.vnc)

## Important Gotchas & Non-Standard Patterns

1. **Disabled Linting & TypeScript Checks**: ESLint/TypeScript errors ignored during build (`ignoreBuildErrors: true`, `noImplicitAny: false`). Maintain discipline in code reviews; enable for stricter teams.

2. **Three-Service Coordination**: All services must be running for full functionality. Dashboard degrades gracefully if browser-pool/browser-websocket are unavailable. Health check shows individual service status.

3. **Pre-warmed Containers Consume Resources**: Default config (10 containers × 128MB RAM) reserves ~1.3GB always. Adjust `BROWSER_POOL_SIZE` and `PRE_WARM_COUNT` for resource-constrained environments.

4. **Database: PostgreSQL Only**: Schema uses `@default(now())`, JSON fields, and array types; SQLite incompatible.

5. **Docker-Dependent**: Browser automation strictly requires Docker daemon running. Check with `docker ps` before startup.

6. **Standalone Build**: Production build creates `.next/standalone` directory; deployment must include static assets. See build script: `cp -r .next/static .next/standalone/.next/`

7. **Bun Primary Runtime**: Project assumes Bun CLI for scripts. Node.js works but may have package version mismatches on globals (e.g., `next`).

8. **Health Check is Polling, Not Event-Driven**: Dashboard polls `/api/health` every 30s; service failures detected with ~30s latency. Not real-time monitoring.

9. **Mini-Service Dependencies**: Browser-pool requires Docker socket access (`/var/run/docker.sock` or DOCKER_HOST). WebSocket service stores sessions in memory (doesn't persist across restarts).

10. **Ultra-Fast Mode vs Selenium Grid**: Direct CDP is 10x faster but incompatible with legacy Selenium Grid clients. Use WebDriver Protocol endpoints for compatibility.

## Quick Reference: File Paths

- Page layout: [src/app/layout.tsx](src/app/layout.tsx)
- Dashboard logic: [src/app/page.tsx](src/app/page.tsx)
- Session endpoints: [src/app/api/sessions/](src/app/api/sessions/)
- Automation WebSocket: [src/app/api/sessions/[sessionId]/automation/route.ts](src/app/api/sessions/[sessionId]/automation/route.ts)
- Config: [next.config.ts](next.config.ts), [tsconfig.json](tsconfig.json), [tailwind.config.ts](tailwind.config.ts)
- Prisma schema: [prisma/schema.prisma](prisma/schema.prisma)
- WebSocket service: [mini-services/browser-websocket/](mini-services/browser-websocket/)

---

**Last Updated**: December 2025 | **Next.js 15** + **TypeScript 5** + **Prisma 6** | **Ultra-Fast Browser Automation**
