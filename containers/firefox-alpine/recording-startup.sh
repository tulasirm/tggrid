#!/bin/sh
set -e

echo "Starting Firefox container with recording support..."

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

# Start recording if enabled
if [ "$ENABLE_RECORDING" = "true" ]; then
    SESSION_ID=${SESSION_ID:-$(date +%s)}
    RECORDING_FILE="${RECORDING_DIR}/session-${SESSION_ID}.mp4"
    
    echo "Starting video recording to ${RECORDING_FILE}"
    ffmpeg -f x11grab -video_size ${SCREEN_WIDTH}x${SCREEN_HEIGHT} -framerate 30 \
           -i ${DISPLAY} -codec:v libx264 -preset ultrafast \
           -pix_fmt yuv420p -y "${RECORDING_FILE}" &
    
    FFMPEG_PID=$!
    echo "FFmpeg recording started with PID $FFMPEG_PID"
    echo $FFMPEG_PID > /tmp/ffmpeg.pid
fi

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

# Trap SIGTERM to stop recording gracefully
trap 'echo "Stopping recording..."; kill -SIGTERM $(cat /tmp/ffmpeg.pid 2>/dev/null) 2>/dev/null || true; kill -SIGTERM $FIREFOX_PID; exit' SIGTERM SIGINT

# Wait for Firefox
wait $FIREFOX_PID
