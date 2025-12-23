# Multi-stage build for UFBrowsers Next.js App
FROM oven/bun:latest as builder

WORKDIR /app

# Copy package files
COPY package.json ./
COPY bun.lock* ./

# Install dependencies
RUN bun install --production

# Copy source code
COPY . .

# Build Next.js app
RUN bun run build

# Production stage
FROM oven/bun:latest

WORKDIR /app

# Install curl for health checks
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Copy from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json .
COPY --from=builder /app/next.config.ts ./

# Create logs and downloads directories
RUN mkdir -p /app/logs /app/downloads

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/ || exit 1

# Set environment
ENV NODE_ENV=production

# Start the application
CMD ["bun", "start"]
