# Quick Start Guide - TGGrid

## Prerequisites

- **Bun** v1.3.5+ (runtime)
- **Docker** (for browser containers)
- **PostgreSQL** 15+ (database)
- **Node.js** 18+ (optional, for fallback)

## Installation

```bash
# Install dependencies
bun install

# Setup database
bun run db:push

# Install UI components (if needed)
bun run setup:ui
```

## Starting the Application

### Option 1: Start All Services at Once (Recommended)

```bash
./start-all-services.sh
```

This will automatically start:
- ✅ Main Application (port 3000)
- ✅ Browser Pool Service (port 3002)
- ✅ WebSocket Service (port 3001)

### Option 2: Start Services Manually

**Terminal 1 - Main Application:**
```bash
cd /Users/tsiripireddytest/Downloads/TGGrid
bun run dev
```

**Terminal 2 - Browser Pool Service:**
```bash
cd /Users/tsiripireddytest/Downloads/TGGrid/mini-services/browser-pool
bun run dev
```

**Terminal 3 - WebSocket Service:**
```bash
cd /Users/tsiripireddytest/Downloads/TGGrid/mini-services/browser-websocket
bun run dev
```

## Access the Application

- **Main App**: http://localhost:3000
- **API Health**: http://localhost:3000/api/health

## Default Test Credentials

Email: `demo@example.com`
Password: `demo123`

Or create new users during registration.

## Services Health Check

```bash
# Main App
curl http://localhost:3000/api/health

# Browser Pool
curl http://localhost:3002/health

# WebSocket (via API)
curl http://localhost:3001/health
```

## Common Issues

### "Failed to get browser from pool"
- Browser pool service is not running
- **Solution**: Run `cd mini-services/browser-pool && bun run dev`

### Port Already in Use
- Another process is using the port
- **Solution**: Kill the process: `lsof -i :3000 | grep node | awk '{print $2}' | xargs kill -9`

### Database Connection Error
- PostgreSQL is not running
- **Solution**: Start PostgreSQL (check environment-specific instructions)

## Features

✅ **Ultra-Fast Browser Sessions** - 200ms startup time
✅ **Real-Time Dashboard** - Live metrics and monitoring
✅ **Session Management** - Create, pause, stop, and view sessions
✅ **Browser Control** - Chrome DevTools Protocol access
✅ **Video Streaming** - Live and recorded session playback

## Development

### Build Production

```bash
bun run build
bun start
```

### Rebuild Database Schema

```bash
bun run db:migrate
```

### View Database

```bash
bun run db:studio
```

## Documentation

- See [BROWSER-SESSIONS-API.md](./BROWSER-SESSIONS-API.md) for API details
- See [HOW-TO-RUN.md](./HOW-TO-RUN.md) for environment setup
- See [README.md](./README.md) for architecture overview

## Support

For issues or questions, refer to the documentation files in the project root.
