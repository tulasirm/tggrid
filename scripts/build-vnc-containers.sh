#!/bin/bash

echo "🐳 Building VNC-enabled browser containers..."

# Build Chrome with VNC
echo "📦 Building Chrome Alpine VNC..."
cd containers/chrome-alpine
docker build -f Dockerfile.vnc -t chrome-alpine-vnc:latest .
if [ $? -eq 0 ]; then
    echo "✅ Chrome Alpine VNC built successfully"
else
    echo "❌ Chrome Alpine VNC build failed"
    exit 1
fi

# Build Firefox with VNC
echo "📦 Building Firefox Alpine VNC..."
cd ../firefox-alpine
docker build -f Dockerfile.vnc -t firefox-alpine-vnc:latest .
if [ $? -eq 0 ]; then
    echo "✅ Firefox Alpine VNC built successfully"
else
    echo "❌ Firefox Alpine VNC build failed"
    exit 1
fi

cd ../..

echo ""
echo "🎉 All VNC containers built successfully!"
echo ""
echo "To use VNC-enabled containers, set in your .env:"
echo "  ENABLE_VNC=true"
echo ""
echo "Then restart the browser-pool service:"
echo "  cd mini-services/browser-pool && bun run dev"
echo ""
echo "VNC will be available on:"
echo "  - VNC protocol: vnc://localhost:<port>"
echo "  - WebSocket: ws://localhost:<port>"
echo ""
echo "You can connect using:"
echo "  - TigerVNC Viewer"
echo "  - RealVNC"
echo "  - noVNC (web-based)"
echo ""
