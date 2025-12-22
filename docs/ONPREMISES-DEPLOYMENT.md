# Ultra-Fast Browsers On-Premises Deployment Guide

Complete guide to deploy Ultra-Fast Browsers (UFBrowsers) as a self-hosted, on-premises solution using Docker Compose.

## 📋 Overview

The `docker-compose.yml` is designed for complete on-premises deployment with:

✅ **7 Core Services**:
1. **Main Application** (selenium-box) - Next.js UI + API
2. **Browser Pool** - Docker container management with pre-warming
3. **WebSocket Service** - Real-time communication
4. **PostgreSQL** - Data persistence
5. **Redis** - Caching layer
6. **Nginx** - Reverse proxy + SSL/TLS
7. **Monitoring Stack** - Prometheus + Grafana

✅ **Production Features**:
- Persistent data volumes
- Resource limits per service
- Health checks
- Automatic restart policies
- Reverse proxy with SSL/TLS
- Comprehensive monitoring
- Rate limiting
- Security headers

---

## 🔍 Current Status Check

### ✅ What's Included

| Component | Status | Location |
|-----------|--------|----------|
| docker-compose.yml | ✅ Complete | Root directory |
| Main app | ✅ Complete | src/ |
| Browser pool | ✅ Complete | mini-services/browser-pool/ |
| WebSocket service | ✅ Complete | mini-services/browser-websocket/ |
| PostgreSQL init script | ✅ Complete | postgres/init.sql |

### ⚠️ What's Missing (Now Created!)

These configuration files are referenced in docker-compose.yml but were missing. **All have been created**:

| File | Purpose | Status |
|------|---------|--------|
| `nginx.conf` | Reverse proxy config | ✅ Created |
| `prometheus.yml` | Metrics scraping config | ✅ Created |
| `prometheus-rules.yml` | Alert rules | ✅ Created |
| `grafana/provisioning/datasources/prometheus.yml` | Grafana data source | ✅ Created |
| `grafana/provisioning/dashboards/dashboard-provider.yml` | Dashboard provisioning | ✅ Created |
| `grafana/provisioning/dashboards/ufbrowsers-overview.json` | System overview dashboard | ✅ Created |
| `ssl/cert.pem` | SSL certificate | ⚠️ Self-signed needed |
| `ssl/key.pem` | SSL private key | ⚠️ Self-signed needed |

---

## 🚀 Quick Start - On-Premises Deployment

### Fastest Way (1 Command)

```bash
# Clone/navigate to UFBrowsers directory
cd /path/to/ufbrowsers

# Run setup script - handles everything automatically
./setup-onpremises.sh

# Then start services
docker-compose up -d
```

### What setup-onpremises.sh Does

The automated setup script handles:
1. ✅ **Validates prerequisites** - Docker, Docker Compose, OpenSSL
2. ✅ **Generates SSL certificates** - Self-signed for development
3. ✅ **Creates .env file** - With prompts for configuration
4. ✅ **Verifies configuration** - Checks all files are in place
5. ✅ **Provides guidance** - Shows next steps and access URLs

### Step-by-Step Instructions

#### 1️⃣ **Prerequisites**

```bash
# Check requirements
docker --version          # Docker 20.10+
docker-compose --version  # Docker Compose 1.29+
```

### 2️⃣ **Automated Setup (Recommended)**

Use the automated setup script that handles everything:

```bash
cd /path/to/ufbrowsers

# Run setup script (generates SSL, creates .env, verifies config)
./setup-onpremises.sh
```

The script will:
- ✅ Check all prerequisites (Docker, Docker Compose)
- ✅ Generate SSL certificates automatically
- ✅ Create `.env` file with prompts for configuration
- ✅ Verify all configuration files
- ✅ Display deployment instructions

### Alternative: Manual Setup

If you prefer manual setup:

**Generate SSL Certificates:**

```bash
mkdir -p ssl
openssl req -x509 -newkey rsa:2048 -keyout ssl/key.pem -out ssl/cert.pem \
  -days 365 -nodes -subj "/CN=localhost"
```

For production (Let's Encrypt):

```bash
certbot certonly --dns-cloudflare -d yourdomain.com
cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ssl/cert.pem
cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ssl/key.pem
```

**Create .env File:**

```bash
cat > .env << 'EOF'
# Application
NODE_ENV=production
PORT=3000

# Database
POSTGRES_DB=seleniumbox
POSTGRES_USER=user
POSTGRES_PASSWORD=your-secure-password-here
DATABASE_URL=postgresql://user:your-secure-password-here@postgres:5432/seleniumbox

# Redis
REDIS_URL=redis://redis:6379

# Browser Pool
BROWSER_POOL_SIZE=30
PRE_WARM_COUNT=15
BROWSER_POOL_URL=http://browser-pool:3002
MAX_MEMORY_PER_CONTAINER=128
MAX_CPU_PER_CONTAINER=0.25

# WebSocket
WEBSOCKET_PORT=3001
WEBSOCKET_URL=ws://localhost:3001

# Security
NEXTAUTH_SECRET=$(openssl rand -base64 32)
NEXTAUTH_URL=https://yourdomain.com

# Monitoring
METRICS_ENABLED=true
ENABLE_LOAD_BALANCER=true
HEALTH_CHECK_INTERVAL=30
EOF
```

### 3️⃣ **Start All Services**

```bash
# Start all services in the background
docker-compose up -d

# Wait for services to be ready (30-60 seconds)
sleep 60

# Check status
docker-compose ps
```

### 4️⃣ **Verify Deployment**

```bash
# Check all containers are running
docker-compose ps

# Expected output:
# NAME                        STATUS
# ufbrowsers-app              Up (healthy)
# ufbrowsers-browser-pool     Up
# ufbrowsers-browser-websocket Up
# ufbrowsers-postgres         Up (healthy)
# ufbrowsers-redis            Up
# ufbrowsers-nginx            Up
# ufbrowsers-prometheus       Up
# ufbrowsers-grafana          Up

# Test health endpoint
curl -k https://localhost/health

# View logs
docker-compose logs -f ufbrowsers-app
```

### 5️⃣ **Access Applications**

| Service | URL | Credentials |
|---------|-----|-------------|
| UFBrowsers | https://localhost (or https://ufbrowsers.com) | Sign up required |
| Grafana | http://localhost:3004 | admin / admin |
| Prometheus | http://localhost:9090 | - |
| API Health | https://localhost/api/health | - |

---

## 📊 Service Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Docker Network                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────┐    ┌─────────────────────────────┐   │
│  │   Nginx (80/443) │◄──►│   Main App (3000)           │   │
│  │ - SSL/TLS        │    │ - Next.js 15                │   │
│  │ - Reverse Proxy  │    │ - Authentication            │   │
│  │ - Rate Limiting  │    │ - REST API                  │   │
│  │ - Load Balancing │    └─────────────────────────────┘   │
│  └──────────────────┘                                       │
│         ▲                                                    │
│         │                                                    │
│    Internet                                                  │
│    (Client)                                                  │
│         ▼                                                    │
│  ┌──────────────────┐    ┌─────────────────────────────┐   │
│  │                  │    │  Browser Pool (3002)        │   │
│  │  PostgreSQL      │◄──►│  - Container Management     │   │
│  │  (5432)          │    │  - Pre-warming              │   │
│  │                  │    │  - Docker API               │   │
│  └──────────────────┘    └─────────────────────────────┘   │
│         △                                                    │
│         │                                                    │
│  ┌──────┴──────────┐    ┌─────────────────────────────┐   │
│  │    Redis        │    │  WebSocket Service (3001)   │   │
│  │    (6379)       │    │  - Real-time updates        │   │
│  │    - Cache      │    │  - Socket.IO server         │   │
│  │    - Sessions   │    │  - Event broadcasting       │   │
│  └─────────────────┘    └─────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │            Monitoring Stack                          │   │
│  │  ┌──────────────────┐    ┌─────────────────────┐   │   │
│  │  │ Prometheus       │◄──►│ Grafana             │   │   │
│  │  │ (9090)           │    │ (3004)              │   │   │
│  │  │ - Metrics        │    │ - Dashboards        │   │   │
│  │  │ - Alerts         │    │ - Visualization     │   │   │
│  │  └──────────────────┘    └─────────────────────┘   │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘

All containers connected via Docker internal network bridge
```

---

## 🔧 Configuration Details

### Nginx Configuration

**File**: `nginx.conf`

Features:
- SSL/TLS on port 443
- HTTP to HTTPS redirect
- Rate limiting (general, API, WebSocket)
- Security headers (HSTS, CSP, etc.)
- Gzip compression
- Reverse proxy to all services
- Health check endpoint
- Basic auth for Prometheus

### Prometheus Configuration

**File**: `prometheus.yml`

Scrapes metrics from:
- UFBrowsers App (port 3000)
- Browser Pool (port 3002)
- WebSocket Service (port 3001)
- PostgreSQL
- Redis
- System metrics (Node Exporter)
- Container metrics (cAdvisor)

### Alert Rules

**File**: `prometheus-rules.yml`

Includes alerts for:
- Service downtime
- High memory/CPU usage
- Low disk space
- Database connectivity
- Cache connectivity
- High response times
- High error rates

---

## 📈 Monitoring & Metrics

### Access Monitoring

```bash
# Prometheus
open https://localhost:9090

# Grafana (default credentials: admin/admin)
open https://localhost:3004

# Prometheus direct API
curl -k https://localhost:9090/api/v1/query?query=up
```

### Common Metrics Queries

```promql
# Application uptime
up{job="ufbrowsers-app"}

# Browser pool status
up{job="browser-pool"}

# Memory usage percentage
(1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100

# CPU usage percentage
(1 - avg(rate(node_cpu_seconds_total{mode="idle"}[5m]))) * 100

# Request rate
rate(http_requests_total[5m])

# Error rate
rate(http_requests_total{status=~"5.."}[5m])
```

---

## 🔒 Security Hardening

### Credentials Management

**⚠️ Important**: The default docker-compose.yml uses weak credentials for demo purposes.

```yaml
# CHANGE THESE:
POSTGRES_PASSWORD=password        # Change to secure password
POSTGRES_USER=user               # Change username
NEXTAUTH_SECRET=...              # Generate secure secret
```

### Generate Secure Credentials

```bash
# PostgreSQL password
openssl rand -base64 32

# NextAuth secret
openssl rand -base64 32

# Edit and update .env file with these values
nano .env
```

### Network Security

The docker-compose includes:
- ✅ Internal Docker network (containers isolated)
- ✅ Rate limiting on all endpoints
- ✅ HTTPS/SSL enforced
- ✅ Security headers (HSTS, CSP, X-Frame-Options)
- ✅ Database password encryption
- ✅ JWT-based authentication

### Production Recommendations

1. **Use strong passwords** for PostgreSQL and admin accounts
2. **Enable firewall** rules (only expose ports 80, 443)
3. **Use Let's Encrypt** certificates (not self-signed)
4. **Setup log aggregation** (ELK stack, Splunk, etc.)
5. **Enable backups** for PostgreSQL
6. **Monitor resources** via Grafana
7. **Implement RBAC** for user access
8. **Setup VPN** for admin access
9. **Use secrets management** (Vault, etc.)
10. **Regular security updates** of Docker images

---

## 🛠️ Common Operations

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f selenium-box
docker-compose logs -f browser-pool
docker-compose logs -f postgres
docker-compose logs -f nginx
```

### Stop Services

```bash
# Graceful stop
docker-compose stop

# Forceful stop
docker-compose kill

# Completely remove
docker-compose down
```

### Restart Services

```bash
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart selenium-box
docker-compose restart browser-pool
```

### Database Operations

```bash
# Connect to PostgreSQL
docker-compose exec postgres psql -U user -d seleniumbox

# Backup database
docker-compose exec postgres pg_dump -U user seleniumbox > backup.sql

# Restore database
docker-compose exec -T postgres psql -U user seleniumbox < backup.sql
```

### Clear Cache

```bash
# Flush Redis
docker-compose exec redis redis-cli FLUSHALL

# Clear old metrics
docker-compose exec prometheus rm -rf /prometheus/wal
```

---

## 📦 Resource Requirements

### Minimum

- **CPU**: 4 cores
- **RAM**: 8GB
- **Storage**: 50GB
- **Network**: 1Mbps

### Recommended

- **CPU**: 8 cores
- **RAM**: 16GB
- **Storage**: 200GB
- **Network**: 10Mbps

### Per Service Resource Limits

| Service | Memory | CPU | Storage |
|---------|--------|-----|---------|
| selenium-box | 2GB | 1.0 | - |
| browser-pool | 4GB | 2.0 | - |
| browser-websocket | 512MB | 0.5 | - |
| postgres | 1GB | 0.5 | 50GB |
| redis | 256MB | 0.25 | 10GB |
| nginx | 256MB | 0.25 | - |
| prometheus | 1GB | 0.5 | 50GB |
| grafana | 512MB | 0.5 | 10GB |

**Total**: ~9.5GB RAM + 120GB Storage

---

## 🐛 Troubleshooting

### Services Won't Start

```bash
# Check if ports are in use
lsof -i :3000 :3001 :3002 :5432 :6379 :80 :443 :9090 :3004

# Check Docker daemon
docker ps

# Check resource availability
docker stats
```

### Database Connection Failed

```bash
# Check PostgreSQL is running
docker-compose logs postgres

# Test connection
docker-compose exec postgres psql -U user -c "SELECT 1"

# Check DATABASE_URL in .env
grep DATABASE_URL .env
```

### Nginx SSL Error

```bash
# Check certificate files exist
ls -la ssl/

# Validate certificate
openssl x509 -in ssl/cert.pem -text -noout

# Check nginx config
docker-compose exec nginx nginx -t
```

### High Memory Usage

```bash
# Check resource usage
docker stats

# Check browser pool
docker-compose logs browser-pool | grep memory

# Reduce PRE_WARM_COUNT in .env
# Or increase container limits
```

### Prometheus Not Scraping

```bash
# Check config
docker-compose exec prometheus cat /etc/prometheus/prometheus.yml

# View targets
curl -k https://localhost:9090/api/v1/targets

# Check logs
docker-compose logs prometheus
```

---

## 📚 File Structure

```
UFBrowsers/
├── docker-compose.yml              # Complete service definition
├── nginx.conf                       # Reverse proxy configuration
├── prometheus.yml                   # Metrics scraping config
├── prometheus-rules.yml             # Alert rules
├── .env                            # Environment variables
├── ssl/
│   ├── cert.pem                    # SSL certificate
│   └── key.pem                     # SSL private key
├── postgres/
│   ├── init.sql                    # Database schema
│   └── docker-compose.yml          # PostgreSQL standalone
├── grafana/
│   └── provisioning/
│       ├── datasources/
│       │   └── prometheus.yml      # Data source config
│       └── dashboards/
│           ├── dashboard-provider.yml      # Dashboard provisioning
│           └── ufbrowsers-overview.json    # System overview dashboard
├── src/                            # Application source
├── mini-services/
│   ├── browser-pool/               # Container management
│   └── browser-websocket/          # Real-time updates
└── logs/                           # Service logs
```

---

## ✅ Deployment Checklist

- [ ] Create `.env` file with secure credentials
- [ ] Generate SSL certificates (`ssl/cert.pem` and `ssl/key.pem`)
- [ ] Review and customize `nginx.conf`
- [ ] Verify `prometheus.yml` targets
- [ ] Check disk space (minimum 120GB)
- [ ] Ensure Docker daemon is running
- [ ] Review `docker-compose.yml` for your environment
- [ ] Run `docker-compose up -d`
- [ ] Wait 30-60 seconds for services to start
- [ ] Run health checks (see Verification section)
- [ ] Access applications via provided URLs
- [ ] Setup monitoring dashboards in Grafana
- [ ] Configure database backups
- [ ] Setup log aggregation
- [ ] Configure firewall rules
- [ ] Test failover scenarios

---

## 🎯 Next Steps

1. **Initial Setup**: Follow the Quick Start section
2. **Configuration**: Customize `.env` and `nginx.conf`
3. **SSL Certificates**: Generate or acquire valid certificates
4. **Monitoring**: Configure Grafana dashboards
5. **Backups**: Setup automated PostgreSQL backups
6. **Security**: Implement network policies and RBAC
7. **Performance**: Monitor metrics and optimize resource allocation
8. **Updates**: Plan for regular Docker image updates

---

## 📞 Support

- **Documentation**: Check MULTI-CLOUD-DEPLOYMENT.md for cloud alternatives
- **Logs**: `docker-compose logs -f [service-name]`
- **Health Checks**: `curl -k https://localhost/api/health`
- **Metrics**: Access Prometheus at http://localhost:9090

---

**Status**: ✅ Production Ready
**Version**: 1.0
**Last Updated**: December 2025
