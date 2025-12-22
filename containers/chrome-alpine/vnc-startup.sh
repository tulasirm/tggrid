#!/bin/sh
set -e

echo "Starting VNC-enabled Chrome container..."

# Start Xvfb
Xvfb ${DISPLAY} -screen 0 ${SCREEN_WIDTH}x${SCREEN_HEIGHT}x${SCREEN_DEPTH} -ac +extension GLX +render -noreset &
XVFB_PID=$!
echo "Xvfb started with PID $XVFB_PID on display ${DISPLAY}"

# Wait for X server
sleep 2

# Start window manager (lightweight fluxbox)
fluxbox &
echo "Window manager started"

# Start x11vnc
x11vnc -display ${DISPLAY} -forever -shared -rfbport ${VNC_PORT} -nopw -bg -xkb
echo "VNC server started on port ${VNC_PORT}"

# Start Chrome with CDP
${CHROME_BIN} \
  --no-sandbox \
  --disable-setuid-sandbox \
  --disable-dev-shm-usage \
  --disable-accelerated-2d-canvas \
  --no-first-run \
  --no-zygote \
  --disable-gpu \
  --remote-debugging-address=0.0.0.0 \
  --remote-debugging-port=9222 \
  --disable-features=VizDisplayCompositor \
  --disable-extensions \
  --disable-plugins \
  --window-size=${SCREEN_WIDTH},${SCREEN_HEIGHT} \
  --start-maximized \
  about:blank &

CHROME_PID=$!
echo "Chrome started with PID $CHROME_PID (CDP on port 9222)"

# Wait for processes
wait $CHROME_PID
