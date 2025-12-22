# Ultra-lightweight Chrome container (based on Alpine)
FROM alpine:edge

# Install minimal dependencies
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    && rm -rf /var/cache/apk/*

# Create non-root user
RUN addgroup -g 1000 -S chrome && \
    adduser -u 1000 -S chrome -G chrome

# Set up environment for headless Chrome
ENV CHROME_BIN=/usr/bin/chromium-browser \
    CHROME_PATH=/usr/bin/chromium-browser \
    DISPLAY=:99

# Create startup script
RUN echo '#!/bin/sh' > /start-chrome.sh && \
    echo 'exec ${CHROME_BIN} \' >> /start-chrome.sh && \
    echo '  --headless \' >> /start-chrome.sh && \
    echo '  --no-sandbox \' >> /start-chrome.sh && \
    echo '  --disable-setuid-sandbox \' >> /start-chrome.sh && \
    echo '  --disable-dev-shm-usage \' >> /start-chrome.sh && \
    echo '  --disable-accelerated-2d-canvas \' >> /start-chrome.sh && \
    echo '  --no-first-run \' >> /start-chrome.sh && \
    echo '  --no-zygote \' >> /start-chrome.sh && \
    echo '  --disable-gpu \' >> /start-chrome.sh && \
    echo '  --remote-debugging-address=0.0.0.0 \' >> /start-chrome.sh && \
    echo '  --remote-debugging-port=9222 \' >> /start-chrome.sh && \
    echo '  --disable-features=VizDisplayCompositor \' >> /start-chrome.sh && \
    echo '  --disable-extensions \' >> /start-chrome.sh && \
    echo '  --disable-plugins \' >> /start-chrome.sh && \
    echo '  --disable-images ' >> /start-chrome.sh && \
    chmod +x /start-chrome.sh

USER chrome
EXPOSE 9222

# Ultra-fast startup - use exec to avoid shell overhead
ENTRYPOINT ["/start-chrome.sh"]