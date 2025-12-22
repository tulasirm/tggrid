# Ultra-lightweight Firefox container (based on Alpine)
FROM alpine:edge

# Install minimal Firefox
RUN apk add --no-cache \
    firefox-esr \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    dbus \
    && rm -rf /var/cache/apk/*

# Create non-root user
RUN addgroup -g 1000 -S firefox && \
    adduser -u 1000 -S firefox -G firefox

# Set up environment
ENV FIREFOX_BIN=/usr/bin/firefox-esr \
    DISPLAY=:99

# Create startup script
RUN echo '#!/bin/sh' > /start-firefox.sh && \
    echo 'exec ${FIREFOX_BIN} \' >> /start-firefox.sh && \
    echo '  --headless \' >> /start-firefox.sh && \
    echo '  --no-remote \' >> /start-firefox.sh && \
    echo '  --safe-mode \' >> /start-firefox.sh && \
    echo '  --disable-extensions \' >> /start-firefox.sh && \
    echo '  --disable-plugins \' >> /start-firefox.sh && \
    echo '  --disable-images \' >> /start-firefox.sh && \
    echo '  --start-debugger-server=9222 \' >> /start-firefox.sh && \
    echo '  --remote-debugging-port=9222 ' >> /start-firefox.sh && \
    chmod +x /start-firefox.sh

USER firefox
EXPOSE 9222

ENTRYPOINT ["/start-firefox.sh"]