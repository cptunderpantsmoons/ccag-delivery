# Multi-stage Next.js build for optimal production image
FROM node:20-alpine@sha256:fb4cd12c85ee03686f6af5362a0b0d56d50c58a04632e6c0fb8363f609372293 AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source
COPY . .

# Build Next.js application
RUN npm run build

# Production stage
FROM node:20-alpine@sha256:fb4cd12c85ee03686f6af5362a0b0d56d50c58a04632e6c0fb8363f609372293

WORKDIR /app

# Install runtime tools:
# - tini: proper signal handling
# - curl: health checks
# - openssh-client: admin-agent SSH execution
RUN apk add --no-cache tini curl openssh-client

# Create non-root user
RUN addgroup -g 1001 appuser && adduser -D -u 1001 -G appuser appuser

# Copy package.json for runtime dependencies
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy built application from builder
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

# Set ownership
RUN chown -R appuser:appuser /app

USER appuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3000 || exit 1

ENTRYPOINT ["/sbin/tini", "--"]

CMD ["npm", "start"]
