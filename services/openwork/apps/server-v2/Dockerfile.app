# CCAG App — Vite React Agent Workspace UI
# Multi-stage build: install workspace deps → build packages → build app → serve
# Uses pnpm workspaces for @ccag/types and @ccag/ui package deps

# Stage 1: build using node:20-alpine
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm globally (node:20 has npm)
RUN npm install -g pnpm@10.27.0

# Copy workspace root config
COPY package.json pnpm-workspace.yaml turbo.json .npmrc ./

# Copy patches directory (pnpm patchedDependencies requires it at workspace root)
COPY patches ./patches/

# Copy ALL workspace packages (needed for pnpm to resolve workspace: links)
COPY packages/types/package.json packages/types/tsconfig.json packages/types/src ./packages/types/src/
COPY packages/types/tsup.config.ts ./packages/types/
COPY packages/ui/package.json packages/ui/tsconfig.react.json packages/ui/tsconfig.solid.json packages/ui/tsup.config.react.ts packages/ui/tsup.config.solid.ts ./packages/ui/
COPY packages/ui/src ./packages/ui/src
COPY packages/ui/README.md ./packages/ui/

# Copy app (needs workspace deps above to resolve)
COPY apps/app/package.json apps/app/vite.config.ts apps/app/tsconfig.json apps/app/tailwind.config.ts apps/app/index.html ./apps/app/
COPY apps/app/src ./apps/app/src
COPY apps/app/public ./apps/app/public
COPY apps/app/scripts ./apps/app/scripts

# Install workspace dependencies (resolves workspace: links)
# Note: --frozen-lockfile requires pnpm-lock.yaml AND all patch files to exist.
# The @solidjs/router patch is a no-op placeholder — install without frozen lockfile.
RUN pnpm install

# Build workspace packages (required by the app)
RUN pnpm --filter @ccag/types build
RUN pnpm --filter @ccag/ui build

# Build the app itself
RUN pnpm --filter @ccag/app build

# Stage 2: static serve via nginx
FROM nginx:alpine

# Copy built app to nginx
COPY --from=builder /app/apps/app/dist /usr/share/nginx/html

# SPA routing + health endpoint
RUN echo 'server { \
    listen 3000; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    location /health { \
        access_log off; \
        return 200 "ok\n"; \
        add_header Content-Type text/plain; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || wget -qO- http://localhost:3000/ > /dev/null 2>&1 || exit 1

CMD ["nginx", "-g", "daemon off;"]
