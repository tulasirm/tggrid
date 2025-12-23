#!/bin/bash

# TGGrid Complete Startup Script
# Starts all services: Main App, Browser Pool, and WebSocket Server

set -e

ROOT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "=================================================="
echo "🚀 TGGrid Complete Environment Startup"
echo "=================================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if ports are already in use
check_port() {
  if lsof -i :$1 &> /dev/null; then
    echo -e "${YELLOW}⚠️  Port $1 is already in use${NC}"
    return 0
  fi
  return 1
}

# Create logs directory
mkdir -p "$ROOT_DIR/logs"

echo -e "${BLUE}📋 Checking prerequisites...${NC}"
echo ""

# Check for bun
if ! command -v bun &> /dev/null; then
  # Try to find bun in .bun directory
  if [ -f "$HOME/.bun/bin/bun" ]; then
    export PATH="$HOME/.bun/bin:$PATH"
    echo -e "${GREEN}✓${NC} Bun found at $HOME/.bun/bin/bun"
  else
    echo -e "${RED}❌ Bun is not installed${NC}"
    echo -e "${YELLOW}   Install with: curl -fsSL https://bun.sh/install | bash${NC}"
    exit 1
  fi
else
  echo -e "${GREEN}✓${NC} Bun installed"
fi

# Check for Docker
if ! command -v docker &> /dev/null; then
  echo -e "${YELLOW}⚠️  Docker is not installed (needed for browser containers)${NC}"
else
  echo -e "${GREEN}✓${NC} Docker installed"
fi

echo ""
echo -e "${BLUE}🔧 Starting services...${NC}"
echo ""

# Start PostgreSQL if not running
if ! lsof -i :5432 &> /dev/null; then
  echo -e "${BLUE}Starting PostgreSQL...${NC}"
  # This assumes PostgreSQL is configured to auto-start or managed externally
  echo -e "${YELLOW}⚠️  PostgreSQL not detected on port 5432${NC}"
  echo -e "${YELLOW}   Make sure PostgreSQL is running (see README)${NC}"
fi

# Start Main Application (Port 3000)
if check_port 3000; then
  echo -e "${YELLOW}Port 3000 already in use. Skipping main app.${NC}"
else
  echo -e "${BLUE}▶️  Starting Main Application on port 3000...${NC}"
  cd "$ROOT_DIR"
  rm -f dev.log
  bun run dev > logs/main.log 2>&1 &
  MAIN_PID=$!
  echo "   PID: $MAIN_PID"
fi

# Start Browser Pool Service (Port 3002)
if check_port 3002; then
  echo -e "${YELLOW}Port 3002 already in use. Skipping browser pool.${NC}"
else
  echo -e "${BLUE}▶️  Starting Browser Pool Service on port 3002...${NC}"
  cd "$ROOT_DIR/mini-services/browser-pool"
  rm -f service.log
  bun run dev > "$ROOT_DIR/logs/browser-pool.log" 2>&1 &
  POOL_PID=$!
  echo "   PID: $POOL_PID"
fi

# Start WebSocket Service (Port 3001)
if check_port 3001; then
  echo -e "${YELLOW}Port 3001 already in use. Skipping WebSocket service.${NC}"
else
  echo -e "${BLUE}▶️  Starting WebSocket Service on port 3001...${NC}"
  cd "$ROOT_DIR/mini-services/browser-websocket"
  rm -f service.log
  bun run dev > "$ROOT_DIR/logs/websocket.log" 2>&1 &
  WS_PID=$!
  echo "   PID: $WS_PID"
fi

echo ""
echo -e "${GREEN}=================================================="
echo "✅ Services Starting..."
echo "==================================================${NC}"
echo ""
echo -e "Waiting for services to be ready..."
echo ""

# Wait for services to start
sleep 3

# Check if services are responding
echo -e "${BLUE}🔍 Verifying services...${NC}"
echo ""

# Check Main App
if curl -s http://localhost:3000/api/health &> /dev/null; then
  echo -e "${GREEN}✓${NC} Main Application (3000) - Ready"
else
  echo -e "${YELLOW}⏳${NC} Main Application (3000) - Starting..."
fi

# Check Browser Pool
if curl -s http://localhost:3002/health &> /dev/null; then
  echo -e "${GREEN}✓${NC} Browser Pool Service (3002) - Ready"
else
  echo -e "${YELLOW}⏳${NC} Browser Pool Service (3002) - Starting..."
fi

# Check WebSocket
if curl -s http://localhost:3001/health &> /dev/null 2>&1; then
  echo -e "${GREEN}✓${NC} WebSocket Service (3001) - Ready"
else
  echo -e "${YELLOW}⏳${NC} WebSocket Service (3001) - Starting..."
fi

echo ""
echo -e "${GREEN}=================================================="
echo "🎉 TGGrid Environment Ready!"
echo "==================================================${NC}"
echo ""
echo "📍 Access Points:"
echo -e "   ${BLUE}Main App:${NC}        http://localhost:3000"
echo -e "   ${BLUE}Browser Pool:${NC}    http://localhost:3002"
echo -e "   ${BLUE}WebSocket:${NC}       ws://localhost:3001"
echo ""
echo "📊 Health Check:"
echo -e "   ${BLUE}Main App:${NC}        curl http://localhost:3000/api/health"
echo -e "   ${BLUE}Browser Pool:${NC}    curl http://localhost:3002/health"
echo ""
echo "📝 Logs:"
echo -e "   ${BLUE}Main App:${NC}        tail -f logs/main.log"
echo -e "   ${BLUE}Browser Pool:${NC}    tail -f logs/browser-pool.log"
echo -e "   ${BLUE}WebSocket:${NC}       tail -f logs/websocket.log"
echo ""
echo "🛑 Stop all services:"
echo -e "   ${BLUE}pkill -f 'bun run dev'${NC}"
echo ""
