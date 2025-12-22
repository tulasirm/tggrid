# Getting Started with TGGrid

This guide will help you set up and run TGGrid in minutes.

## 📋 Prerequisites

### Required
- **Bun** (v1.0+) or **Node.js** (v18+)
- **Docker** (for browser containers)
- **PostgreSQL** (v15+)

### Optional
- **Git** (for version control)

## 🚀 Installation

### 1. Clone and Install Dependencies

```bash
git clone <your-repo-url> tggrid
cd tggrid
bun install  # or npm install
```

### 2. Configure Environment

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your settings:

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/tggrid"

# Service Ports
PORT=3000
BROWSER_POOL_PORT=3002
WEBSOCKET_PORT=3001

# Browser Pool Configuration
BROWSER_POOL_SIZE=20
PRE_WARM_COUNT=10
CONTAINER_STARTUP_TIMEOUT=5000
MAX_MEMORY_PER_CONTAINER=256
MAX_CPU_PER_CONTAINER=0.5

# Docker Configuration
CHROME_IMAGE=chrome-alpine:latest
FIREFOX_IMAGE=firefox-alpine:latest
DOCKER_NETWORK=selenium-grid

# Authentication
NEXTAUTH_SECRET=your-super-secret-key-change-this
```

### 3. Setup Database

#### Option A: Use Docker PostgreSQL
```bash
cd postgres
docker-compose up -d
cd ..
```

#### Option B: Use Existing PostgreSQL
Update `DATABASE_URL` in `.env` to point to your PostgreSQL instance.

#### Initialize Database Schema
```bash
bun run db:push
```

#### (Optional) Seed Test Data
```bash
bun run db:seed
```

### 4. Build Docker Images

Build the browser container images:

```bash
cd containers/chrome-alpine
docker build -t chrome-alpine:latest .
cd ../firefox-alpine
docker build -t firefox-alpine:latest .
cd ../..
```

### 5. Start All Services

Use the orchestration script to start all three services:

```bash
chmod +x start-all-services.sh
./start-all-services.sh
```

This will start:
- **Main App** on http://localhost:3000
- **Browser Pool** on http://localhost:3002
- **WebSocket Server** on http://localhost:3001

## ✅ Verify Installation

### 1. Check Service Health

```bash
curl http://localhost:3000/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "services": {
    "mainApp": "healthy",
    "browserPool": "healthy",
    "cdpClient": "healthy",
    "database": "healthy",
    "docker": "healthy"
  }
}
```

### 2. Access Dashboard

Open your browser and navigate to:
```
http://localhost:3000
```

You should see the TGGrid dashboard with real-time metrics.

### 3. Create Test Session

```bash
# First, register a user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123","name":"Test User"}'

# Login to get token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# Create a browser session (use token from login)
curl -X POST http://localhost:3000/api/sessions/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{"browser":"chrome","vncEnabled":true,"videoEnabled":true}'
```

## 🔧 Manual Service Startup

If you prefer to start services individually:

### Terminal 1 - Main App
```bash
bun run dev
```

### Terminal 2 - Browser Pool
```bash
cd mini-services/browser-pool
bun run dev
```

### Terminal 3 - WebSocket Server
```bash
cd mini-services/browser-websocket
bun run dev
```

## 🐳 Docker Verification

Verify Docker is running and accessible:

```bash
docker --version
docker ps
docker network ls | grep selenium-grid
```

Check pre-warmed containers:
```bash
docker ps | grep browser-chrome
```

## 📊 Monitor Services

### View Logs

Main app logs:
```bash
tail -f dev.log
```

Browser pool logs:
```bash
tail -f mini-services/browser-pool/pool.log
```

WebSocket logs:
```bash
tail -f mini-services/browser-websocket/ws.log
```

### Check Metrics

```bash
# Browser pool metrics
curl http://localhost:3002/metrics

# System health
curl http://localhost:3000/api/health

# Active sessions
curl http://localhost:3000/api/sessions/list
```

## 🛑 Stopping Services

### Using the orchestration script
Press `Ctrl+C` in the terminal running the script.

### Manual shutdown
Press `Ctrl+C` in each service terminal.

### Cleanup Docker containers
```bash
docker stop $(docker ps -q --filter "name=browser-")
docker network rm selenium-grid
```

## 🔄 Next Steps

- **[Features Overview](FEATURES.md)** - Learn about all features
- **[Selenium Integration](SELENIUM-INTEGRATION.md)** - Integrate with Selenium tests
- **[Playwright Integration](PLAYWRIGHT-INTEGRATION.md)** - Integrate with Playwright tests
- **[Parallel Execution](PARALLEL-EXECUTION.md)** - Scale to hundreds of concurrent tests

## ❓ Troubleshooting

### Docker daemon not running
```bash
# macOS
open -a Docker

# Linux
sudo systemctl start docker
```

### Port already in use
```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 <PID>
```

### Database connection failed
- Verify PostgreSQL is running
- Check DATABASE_URL in .env
- Ensure database exists: `createdb tggrid`

### Containers not starting
- Check Docker has enough resources (4GB+ RAM recommended)
- Verify images are built: `docker images | grep alpine`
- Check Docker logs: `docker logs <container_id>`

### Browser pool timeout
- Increase `CONTAINER_STARTUP_TIMEOUT` in .env
- Reduce `PRE_WARM_COUNT` if resources are limited
- Check available system resources: `docker stats`
