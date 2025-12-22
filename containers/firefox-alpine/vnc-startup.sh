#!/bin/sh
set -e

echo "Starting VNC-enabled Firefox container..."

# Start Xvfb
Xvfb ${DISPLAY} -screen 0 ${SCREEN_WIDTH}x${SCREEN_HEIGHT}x${SCREEN_DEPTH} -ac +extension GLX +render -noreset &
XVFB_PID=$!
echo "Xvfb started with PID $XVFB_PID on display ${DISPLAY}"

# Wait for X server
sleep 2

# Start window manager
fluxbox &
echo "Window manager started"

# Start x11vnc
x11vnc -display ${DISPLAY} -forever -shared -rfbport ${VNC_PORT} -nopw -bg -xkb
echo "VNC server started on port ${VNC_PORT}"

# Start Firefox with debugging
${FIREFOX_BIN} \
  --no-remote \
  --safe-mode \
  --disable-extensions \
  --disable-plugins \
  --start-debugger-server=9222 \
  --remote-debugging-port=9222 \
  --width=${SCREEN_WIDTH} \
  --height=${SCREEN_HEIGHT} \
  about:blank &

FIREFOX_PID=$!
echo "Firefox started with PID $FIREFOX_PID (CDP on port 9222)"

# Wait for processes
wait $FIREFOX_PID
