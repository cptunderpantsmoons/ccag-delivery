# CCAG App — Vite React Agent Workspace UI
# Multi-stage build: workspace deps → app build → static serve

FROM node:20-alpine AS builder

WORKDIR /workspace

# Install pnpm
RUN npm install -g pnpm@10.27.0

# Copy workspace root config
COPY package.json pnpm-workspace.yaml turbo.json .npmrc ./

# Copy workspace packages (needed by app)
COPY packages/types/package.json packages/types/tsconfig.json packages/types/tsup.config.ts ./packages/types/
COPY packages/types/src ./packages/types/src

COPY packages/ui/package.json packages/ui/tsconfig.react.json packages/ui/tsconfig.solid.json packages/ui/tsup.config.react.ts packages/ui/tsup.config.solid.ts ./packages/ui/
COPY packages/ui/src ./packages/ui/src
COPY packages/ui/README.md ./packages/ui/

# Copy app
COPY apps/app/package.json apps/app/vite.config.ts apps/app/tsconfig.json apps/app/tailwind.config.ts apps/app/index.html ./apps/app/
COPY apps/app/src ./apps/app/src
COPY apps/app/public ./apps/app/public
COPY apps/app/scripts ./apps/app/scripts

# Install workspace dependencies
RUN pnpm install --frozen-lockfile

# Build workspace packages
RUN pnpm --filter @ccag/types build
RUN pnpm --filter @ccag/ui build

# Build the app
RUN pnpm --filter @ccag/app build

# ── Production stage ─────────────────────────────────────────────────────────
FROM nginx:alpine

# Copy built app to nginx
COPY --from=builder /workspace/apps/app/dist /usr/share/nginx/html

# Copy custom nginx config for SPA routing
RUN echo 'server { \
    listen 3000; \
    root /usr/share/nginx/html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    location /health { \
        access_log off; \
        return 200 "ok"; \
        add_header Content-Type text/plain; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || wget -qO- http://localhost:3000/ > /dev/null 2>&1 || exit 1

CMD ["nginx", "-g", "daemon off;"]
