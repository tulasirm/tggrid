# Multi-stage build for browser-pool service
FROM oven/bun:latest as builder

WORKDIR /app

# Copy package files
COPY package.json bun.lock ./

# Install dependencies
RUN bun install --production

# Copy source code
COPY index.ts .

# Build the application
RUN bun build ./index.ts --outdir ./dist --target bun

# Production stage
FROM oven/bun:latest

WORKDIR /app

# Install Docker CLI (needed to communicate with Docker daemon)
RUN apt-get update && apt-get install -y docker.io && rm -rf /var/lib/apt/lists/*

# Copy from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/index.ts .
COPY package.json .

# Create logs directory
RUN mkdir -p /app/logs

# Expose ports
EXPOSE 3002 3003

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3002/health || exit 1

# Start the service
CMD ["bun", "index.ts"]
