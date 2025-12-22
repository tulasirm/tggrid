# Enterprise Features Implementation Guide

This document provides comprehensive guidance for the newly implemented enterprise features in TGGrid.

## Table of Contents

1. [Role-Based Access Control (RBAC)](#rbac)
2. [Single Sign-On (SSO) Integration](#sso)
3. [CDN Support](#cdn)
4. [Database Replication](#database-replication)
5. [Multi-Region Support](#multi-region)

---

## RBAC

### Overview

Complete role-based access control system with 4 predefined roles and granular permissions.

### Roles and Permissions

| Role | Permissions |
|------|------------|
| **admin** | Full access to all resources (sessions, users, config, audit logs, metrics) |
| **manager** | Can manage sessions, read users/config/audit/metrics |
| **user** | Can manage own sessions and read metrics |
| **viewer** | Read-only access to sessions and metrics |

### Usage

#### Check User Permissions
```typescript
import { getUserRole, hasPermission } from '@/lib/rbac';

const role = await getUserRole(userId);
const canCreate = hasPermission(role, 'sessions.create');
```

#### Protect API Routes
```typescript
import { rbacMiddleware } from '@/middleware/rbac';

export async function POST(request: NextRequest) {
  const authResult = await rbacMiddleware(request, ['sessions.create']);
  if (authResult.error) {
    return authResult.response;
  }
  
  const { userId, role } = authResult;
  // ... your handler code
}
```

#### Assign Roles
```bash
# API endpoint
POST /api/rbac/assign
{
  "userId": "user-id-here",
  "role": "manager"
}

# Headers
Authorization: Bearer <admin-token>
```

### API Endpoints

- `GET /api/rbac/me` - Get current user's role and permissions
- `POST /api/rbac/assign` - Assign role to user (admin only)
- `GET /api/rbac/users` - List all users with roles (admin/manager only)

### Permission List

- `sessions.create`, `sessions.read`, `sessions.update`, `sessions.delete`
- `users.create`, `users.read`, `users.update`, `users.delete`
- `config.read`, `config.update`
- `audit.read`
- `metrics.read`

---

## SSO

### Overview

Multi-provider SSO integration supporting Google OAuth, Azure AD, SAML, and generic OAuth2.

### Supported Providers

1. **Google OAuth 2.0**
2. **Azure Active Directory (Microsoft 365)**
3. **SAML 2.0** (Okta, OneLogin, etc.)
4. **Generic OAuth 2.0**

### Configuration

#### Google OAuth

```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-secret
GOOGLE_CALLBACK_URL=https://tggrid.com/api/auth/sso/google/callback
```

**Setup:**
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create OAuth 2.0 credentials
3. Add authorized redirect URI: `https://tggrid.com/api/auth/sso/google/callback`
4. Enable Google+ API

#### Azure AD

```env
AZURE_AD_CLIENT_ID=your-client-id
AZURE_AD_CLIENT_SECRET=your-secret
AZURE_AD_TENANT=your-tenant-id
AZURE_AD_CALLBACK_URL=https://tggrid.com/api/auth/sso/azure/callback
```

**Setup:**
1. Go to [Azure Portal](https://portal.azure.com)
2. Register app in Azure AD
3. Add redirect URI
4. Grant API permissions: `User.Read`

#### SAML

```env
SAML_ENTRY_POINT=https://your-idp.com/sso/saml
SAML_ISSUER=tggrid
SAML_CALLBACK_URL=https://tggrid.com/api/auth/sso/saml/callback
SAML_CERT=-----BEGIN CERTIFICATE-----...-----END CERTIFICATE-----
```

### Usage

#### Login Flow

1. **Initiate SSO:**
```typescript
// Redirect user to SSO provider
window.location.href = '/api/auth/sso/google';
```

2. **User Authenticates:** Provider handles authentication

3. **Callback:** User returns to `/api/auth/sso/google/callback`

4. **Session Created:** User logged in with auth cookie

#### Frontend Integration

```tsx
<Button onClick={() => window.location.href = '/api/auth/sso/google'}>
  Sign in with Google
</Button>

<Button onClick={() => window.location.href = '/api/auth/sso/azure'}>
  Sign in with Microsoft
</Button>
```

### Security

- All SSO logins create audit log entries
- Passwords not required for SSO users (empty string)
- SSO provider and ID stored in user record
- HTTP-only cookies for session management
- 24-hour session expiration

---

## CDN

### Overview

CDN configurations for Cloudflare and AWS CloudFront to accelerate static asset delivery.

### Providers

#### Cloudflare

**Features:**
- Global edge network (300+ locations)
- Brotli compression
- HTTP/2 and HTTP/3 (QUIC)
- Image optimization
- Automatic HTTPS
- DDoS protection

**Setup:**
```bash
./scripts/setup-cdn.sh cloudflare
```

**Configuration:** [cdn/cloudflare-config.json](cdn/cloudflare-config.json)

**Cache Rules:**
- `/_next/static/*` → 1 year cache
- `/api/*` → No cache (bypass)
- `/images/*` → 30 days cache

#### AWS CloudFront

**Features:**
- Integration with AWS services
- Origin Shield for reduced origin load
- CloudFront Functions for edge computing
- WAF integration
- Real-time logs

**Setup:**
```bash
./scripts/setup-cdn.sh cloudfront
```

**Configuration:** [cdn/cloudfront-config.json](cdn/cloudfront-config.json)

### Next.js Integration

Update `next.config.ts`:

```typescript
const config: NextConfig = {
  assetPrefix: process.env.CDN_URL,
  images: {
    domains: ['cdn.tggrid.com'],
  },
};
```

### Environment Variables

```env
CDN_URL=https://cdn.tggrid.com
CDN_PROVIDER=cloudflare
ASSET_PREFIX=/_next/static
```

### Cloudflare Worker

Automatic optimization worker for static assets:

- **Location:** [cdn/workers/static-optimizer.js](cdn/workers/static-optimizer.js)
- **Features:** Aggressive caching, compression, security headers
- **Deploy:** `wrangler deploy static-optimizer.js`

### Monitoring

**Cloudflare:**
- Dashboard: https://dash.cloudflare.com
- Metrics: Cache ratio, bandwidth, requests per second

**CloudFront:**
- CloudWatch metrics
- Real-time monitoring console
- S3 logs: `s3://tggrid-cdn-logs/cloudfront/`

---

## Database Replication

### Overview

PostgreSQL streaming replication for high availability and read scaling.

### Architecture

- **Primary:** Write operations (port 5432)
- **Standby:** Read replicas (port 5433+)
- **Replication:** Async streaming (WAL shipping)

### Setup

#### Docker Compose

```bash
docker-compose -f docker-compose.replication.yml up -d
```

**Services:**
- `postgres-primary` → Port 5432
- `postgres-standby` → Port 5433

#### Manual Setup

```bash
./scripts/setup-db-replication.sh
```

**Steps:**
1. Creates replication user
2. Configures WAL settings
3. Base backup to standby
4. Starts standby in recovery mode

### Configuration

**Primary Server (`postgresql.conf`):**
```conf
wal_level = replica
max_wal_senders = 10
max_replication_slots = 10
hot_standby = on
archive_mode = on
```

**Standby Server (`postgresql.auto.conf`):**
```conf
primary_conninfo = 'host=primary port=5432 user=replicator password=***'
```

### Monitoring

#### Check Replication Status (Primary)
```sql
SELECT * FROM pg_stat_replication;
```

#### Check Standby Status
```sql
SELECT pg_is_in_recovery(); -- Should return true on standby
```

#### Monitor Replication Lag
```sql
SELECT 
  client_addr,
  state,
  sent_lsn,
  write_lsn,
  flush_lsn,
  replay_lsn,
  sync_state
FROM pg_stat_replication;
```

### Connection Pooling

```typescript
// Primary for writes
const primaryDb = new PrismaClient({
  datasources: {
    db: { url: process.env.DATABASE_URL_PRIMARY }
  }
});

// Standby for reads
const standbyDb = new PrismaClient({
  datasources: {
    db: { url: process.env.DATABASE_URL_STANDBY }
  }
});
```

### Failover

**Promote Standby to Primary:**
```bash
pg_ctl promote -D /var/lib/postgresql/data/pgdata
```

**Update connection strings** to point to new primary.

---

## Multi-Region

### Overview

Deploy TGGrid across multiple geographic regions for low latency and high availability.

### Supported Regions

| Region | Location | Code |
|--------|----------|------|
| US East | Virginia | `us-east-1` |
| US West | Oregon | `us-west-2` |
| EU West | Ireland | `eu-west-1` |
| Asia Pacific | Singapore | `ap-southeast-1` |

### Setup

```bash
./scripts/setup-multi-region.sh
```

### Architecture

- **Docker Swarm** for orchestration
- **Nginx** for geo-routing
- **Cross-region database replication**
- **Regional health checks**

### Geo-Routing

**Nginx Configuration:**

```nginx
map $geoip2_country_code $tggrid_backend {
  default tggrid_us_east;
  GB tggrid_eu_west;
  FR tggrid_eu_west;
  DE tggrid_eu_west;
  SG tggrid_ap_southeast;
  JP tggrid_ap_southeast;
  AU tggrid_ap_southeast;
}

server {
  location / {
    proxy_pass http://$tggrid_backend;
    proxy_set_header X-Region $tggrid_backend;
  }
}
```

### Region Management

#### Get Available Regions
```bash
GET /api/regions
```

**Response:**
```json
{
  "success": true,
  "currentRegion": "us-east-1",
  "regions": [
    {
      "name": "us-east-1",
      "displayName": "US East (Virginia)",
      "endpoint": "https://us-east-1.tggrid.com",
      "isPrimary": true,
      "isActive": true
    }
  ]
}
```

#### Get Region Statistics
```bash
GET /api/regions/stats
```

**Response:**
```json
{
  "success": true,
  "stats": [
    {
      "region": "us-east-1",
      "displayName": "US East (Virginia)",
      "isHealthy": true,
      "latency": 45,
      "totalSessions": 1250,
      "activeSessions": 87
    }
  ]
}
```

### Environment Variables

```env
REGION=us-east-1
PRIMARY_REGION=us-east-1
DATABASE_URL_US_EAST=postgresql://...
DATABASE_URL_EU_WEST=postgresql://...
DATABASE_URL_AP_SOUTHEAST=postgresql://...
```

### Session Routing

```typescript
import { findBestRegion } from '@/lib/multi-region';

// Find lowest latency region for user
const bestRegion = await findBestRegion();

// Create session in that region
const session = await createSession({
  region: bestRegion,
  // ... other params
});
```

### Data Synchronization

```typescript
import { syncDataAcrossRegions } from '@/lib/multi-region';

// Sync session data to all regions
await syncDataAcrossRegions('session', sessionData);
```

### Deployment

**Deploy to Specific Region:**
```bash
REGION=eu-west-1 docker stack deploy -c docker-compose.multi-region.yml tggrid
```

**Scale Per Region:**
```bash
docker service scale tggrid_tggrid-app=5
```

### Monitoring

**Health Checks:**
```typescript
import { checkRegionHealth } from '@/lib/multi-region';

const isHealthy = await checkRegionHealth('us-east-1');
```

**Latency Measurement:**
```typescript
import { measureRegionLatency } from '@/lib/multi-region';

const latency = await measureRegionLatency('eu-west-1');
console.log(`EU West latency: ${latency}ms`);
```

### DNS Configuration

**Route53 Geolocation Routing:**

1. Create hosted zone for `tggrid.com`
2. Add A records for each region:
   - `us-east-1.tggrid.com` → US East IP
   - `eu-west-1.tggrid.com` → EU West IP
3. Create geolocation routing policy
4. Add health checks for each endpoint

**Cloudflare Load Balancing:**

1. Add origin pools for each region
2. Configure geo-steering
3. Set health check intervals (30s)
4. Enable session affinity

---

## Testing

### RBAC Testing

```bash
# Get user permissions
curl http://localhost:3000/api/rbac/me \
  -H "Authorization: Bearer <token>"

# Assign role (as admin)
curl -X POST http://localhost:3000/api/rbac/assign \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"userId": "user-123", "role": "manager"}'
```

### SSO Testing

```bash
# Open browser and navigate to
http://localhost:3000/api/auth/sso/google
# or
http://localhost:3000/api/auth/sso/azure
```

### Multi-Region Testing

```bash
# Get regions
curl http://localhost:3000/api/regions

# Get region stats
curl http://localhost:3000/api/regions/stats
```

### Database Replication Testing

```bash
# Check replication status
docker exec -it tggrid-postgres-primary psql -U postgres -c "SELECT * FROM pg_stat_replication;"

# Test write on primary
docker exec -it tggrid-postgres-primary psql -U postgres -d tggrid -c "INSERT INTO \"User\" (id, email, password, name) VALUES ('test-1', 'test@test.com', 'pass', 'Test');"

# Verify read on standby
docker exec -it tggrid-postgres-standby psql -U postgres -d tggrid -c "SELECT * FROM \"User\" WHERE id='test-1';"
```

---

## Production Checklist

- [ ] Configure SSO providers (Google/Azure/SAML)
- [ ] Set up CDN (Cloudflare or CloudFront)
- [ ] Deploy database replication (primary + standby)
- [ ] Configure multi-region deployment
- [ ] Set up geo-routing (DNS or load balancer)
- [ ] Enable RBAC and assign roles to users
- [ ] Configure environment variables for all regions
- [ ] Test failover scenarios
- [ ] Monitor replication lag
- [ ] Set up alerts for region health
- [ ] Configure backup strategies per region
- [ ] Test SSO login flows
- [ ] Verify CDN cache hit rates
- [ ] Load test multi-region setup

---

## Support

For issues or questions:
- GitHub Issues: https://github.com/tggrid/tggrid/issues
- Documentation: https://docs.tggrid.com
- Email: support@tggrid.com
