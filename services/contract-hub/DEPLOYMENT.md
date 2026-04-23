# Deployment Guide - intelligencehub.cloud

## Overview

This guide covers deploying the Contract Hub application to **intelligencehub.cloud**.

## Prerequisites

- [ ] Domain DNS configured (intelligencehub.cloud → your server)
- [ ] SSL/TLS certificate configured
- [ ] PostgreSQL database provisioned
- [ ] Server with Node.js 20.9.0+ or Docker support
- [ ] Clerk production account with custom domain configured

## Required Environment Variables

### Core Infrastructure
```bash
# Database
DATABASE_URL=postgresql://user:password@host:port/contracthub

# Authentication (Clerk Production Keys)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxx
CLERK_SECRET_KEY=sk_live_xxx
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/dashboard

# Production URL
NEXT_PUBLIC_APP_URL=https://intelligencehub.cloud
```

### AI & Integrations
```bash
# OpenRouter (for AI features)
OPENROUTER_API_KEY=sk-or-v1-xxx
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1

# Carbon RAG Platform
CARBON_RAG_BASE_URL=https://your-carbon-platform.up.railway.app

# Inngest (for background jobs)
INNGEST_EVENT_KEY=xxx
INNGEST_SIGNING_KEY=xxx
```

## Deployment Methods

### Option 1: Docker Deployment (Recommended)

```bash
# 1. Clone and build
git clone <repository-url>
cd contract-hub

# 2. Create production environment file
cp .env.production .env.local
# Edit .env.local with your production values

# 3. Build and run with Docker Compose
docker-compose -f docker-compose.yml up -d

# 4. Run database migrations
docker-compose exec contract-hub npm run db:migrate
```

### Option 2: Railway Deployment

```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Login and link project
railway login
railway link

# 3. Set environment variables
railway variables set DATABASE_URL="postgresql://..."
railway variables set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_live_xxx"
railway variables set CLERK_SECRET_KEY="sk_live_xxx"

# 4. Deploy
railway up
```

### Option 3: Manual Server Deployment

```bash
# 1. Build locally
npm ci --legacy-peer-deps
npm run build

# 2. Upload to server
rsync -avz --exclude=node_modules --exclude=.git . user@intelligencehub.cloud:/var/www/contract-hub

# 3. Install dependencies on server
ssh user@intelligencehub.cloud "cd /var/www/contract-hub && npm ci --production"

# 4. Run migrations
ssh user@intelligencehub.cloud "cd /var/www/contract-hub && npm run db:migrate"

# 5. Start with PM2
ssh user@intelligencehub.cloud "cd /var/www/contract-hub && pm2 start npm --name 'contract-hub' -- start"
```

## DNS Configuration

Configure your DNS records:

```
Type: A
Name: @
Value: <your-server-ip>
TTL: 3600
```

For www redirect:
```
Type: CNAME
Name: www
Value: intelligencehub.cloud
TTL: 3600
```

## SSL/TLS Configuration

### Using Let's Encrypt (Recommended)

```bash
# Install certbot
sudo apt-get install certbot

# Obtain certificate
sudo certbot certonly --standalone -d intelligencehub.cloud -d www.intelligencehub.cloud

# Auto-renewal
echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo crontab -
```

### Using Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name intelligencehub.cloud www.intelligencehub.cloud;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name intelligencehub.cloud www.intelligencehub.cloud;

    ssl_certificate /etc/letsencrypt/live/intelligencehub.cloud/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/intelligencehub.cloud/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Clerk Configuration for Production

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Select your application
3. Navigate to **Settings → Domains**
4. Add `intelligencehub.cloud` and `www.intelligencehub.cloud`
5. Update environment variables with production keys
6. Configure webhook endpoints if needed

## Database Setup

### PostgreSQL Installation

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib

# Create database and user
sudo -u postgres psql -c "CREATE DATABASE contracthub;"
sudo -u postgres psql -c "CREATE USER contracthub WITH PASSWORD 'your-secure-password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE contracthub TO contracthub;"
```

### Run Migrations

```bash
# Local
npm run db:migrate

# Docker
docker-compose exec contract-hub npm run db:migrate

# Production server
DATABASE_URL=postgresql://contracthub:password@localhost:5432/contracthub npx drizzle-kit migrate
```

## Health Monitoring

The application includes a health check endpoint:

```bash
curl https://intelligencehub.cloud/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "database": "connected"
}
```

## Post-Deployment Checklist

- [ ] Application loads at https://intelligencehub.cloud
- [ ] SSL certificate is valid
- [ ] Authentication works (sign in/up)
- [ ] Database connections are stable
- [ ] API routes return expected responses
- [ ] File uploads work (if SharePoint/local storage configured)
- [ ] AI features respond (if OpenRouter configured)
- [ ] Background jobs process (if Inngest configured)
- [ ] Error monitoring is active
- [ ] Backup strategy is in place

## Troubleshooting

### Build Failures
```bash
# Clear cache
rm -rf .next node_modules
npm ci --legacy-peer-deps
npm run build
```

### Database Connection Issues
```bash
# Test connection
psql $DATABASE_URL -c "SELECT 1;"

# Check migrations
npx drizzle-kit check
```

### Port Already in Use
```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>
```

## Support

For deployment issues, check:
1. Application logs: `npm run start` or `docker-compose logs`
2. Health endpoint: `/api/health`
3. Environment validation on startup

## Security Notes

- All secrets should be managed via platform secret management (not in files)
- Enable 2FA on all service accounts
- Regularly rotate API keys
- Monitor access logs
- Keep dependencies updated
