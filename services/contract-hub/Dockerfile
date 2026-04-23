# Contract Hub – Production Dockerfile
# Multi-stage build: builder → runner
# Node 20 LTS (matches engines requirement)

# ── Stage 1: deps ────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

# Install build tools (needed by some native addons)
RUN apk add --no-cache libc6-compat python3 make g++

COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

# ── Stage 2: builder ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Disable Next.js telemetry
ENV NEXT_TELEMETRY_DISABLED=1

# Build (environment stubs – real values injected at runtime)
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_build_placeholder
ENV NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
ENV NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
ENV NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard
ENV NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/dashboard
ENV DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder

RUN npm run build

# ── Stage 3: runner ───────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nextjs

# Copy built artefacts
COPY --from=builder /app/public        ./public
COPY --from=builder /app/.next         ./.next
COPY --from=builder /app/node_modules  ./node_modules
COPY --from=builder /app/package.json  ./package.json

# Drizzle schema (for migrations at startup if desired)
COPY --from=builder /app/lib/db        ./lib/db
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts

RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health 2>/dev/null | grep -q ok || \
      wget -qO- http://localhost:3000/ > /dev/null 2>&1

CMD ["npm", "run", "start"]
