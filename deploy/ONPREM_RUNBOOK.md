# CCAG Delivery On-Prem Runbook

This runbook defines the two supported on-prem deployment paths and their operator commands.

## 1. Shared Runtime Contract

1. Source environment from `.env` (copied from `.env.example`) with production secrets populated.
2. Keep secrets outside images and git history.
3. Validate required auth/model/database values before startup.
4. Use health/readiness probes for go/no-go:
   - orchestrator: `/health`, `/readyz`
   - adapter: `/health`, `/readyz`
   - vector-store: `/health`, `/readyz`
   - contract-hub: `/api/health`

## 2. Path A: Single Host Or VM (Docker Compose)

### Boot

```bash
cp .env.example .env
docker compose pull
docker compose up -d --build
docker compose ps
```

### Smoke Checks

```bash
# Backend health
curl -fsS http://localhost:8002/health
curl -fsS http://localhost:8002/readyz
curl -fsS http://localhost:8001/health
curl -fsS http://localhost:8001/readyz
curl -fsS http://localhost:8000/health

# Frontend health
curl -fsS http://localhost:3000/health
curl -fsS http://localhost:3002/api/health
curl -fsS http://localhost:3003/health

# CCAG Workspace (Bun server)
curl -fsS http://localhost:3100/health

# Aggregated smoke
docker compose ps
docker compose logs --tail=200 orchestrator adapter postgres
```

### Upgrade

```bash
docker compose pull
docker compose up -d --build
```

### Rollback

```bash
docker compose down
git checkout <known-good-tag-or-commit>
docker compose up -d --build
```

## 3. Path A.1: systemd-Managed Host Boot

Service unit file:

- `deploy/systemd/ccag-delivery-compose.service`

Install:

```bash
sudo cp deploy/systemd/ccag-delivery-compose.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now ccag-delivery-compose.service
sudo systemctl status ccag-delivery-compose.service
```

Logs:

```bash
sudo journalctl -u ccag-delivery-compose.service -f
```

Rollback:

```bash
sudo systemctl stop ccag-delivery-compose.service
git checkout <known-good-tag-or-commit>
sudo systemctl start ccag-delivery-compose.service
```

## 4. Path B: Kubernetes/Helm

Current repo status: compose-first baseline is implemented; cluster manifests are tracked as the next packaging milestone.

Planning and readiness checklist:

1. Container images are built and pushed to internal registry.
2. ConfigMap and Secret objects map 1:1 with `.env.example` contract.
3. Every service has liveness and readiness probes.
4. Persistent volumes are defined for Postgres, vector data, and workspace state.
5. Horizontal scaling is enabled only for stateless services.
6. Rollout and rollback commands are rehearsed.

Recommended command skeleton:

```bash
helm upgrade --install ccag-delivery ./deploy/helm/ccag-delivery -f values.yaml
kubectl rollout status deploy/ccag-orchestrator
kubectl rollout status deploy/ccag-adapter
helm rollback ccag-delivery <revision>
```

## 5. Secrets And Data Handling

1. Rotate `LLM_API_KEY`, Clerk secrets, and internal tokens on schedule.
2. Back up Postgres and vector persistence volumes before upgrades.
3. Keep workspace volume backups for OpenWork state continuity.

## 6. Troubleshooting Quick Commands

```bash
docker compose ps
docker compose logs -f orchestrator
docker compose logs -f adapter
docker compose logs -f vector-store
docker compose logs -f contract-hub
docker compose logs -f dashboard
docker compose logs -f ccag-workspace
docker compose logs -f ccag-workspace-ui
```

## 7. Full-Stack Service Map

| Service | Port | Health | Purpose |
|---------|------|--------|---------|
| postgres | 5432 | `pg_isready` | All databases |
| redis | 6379 | `redis-cli ping` | Session/state cache |
| orchestrator | 8002 | `/health`, `/readyz` | User mgmt, Clerk webhooks, RAG gateway |
| adapter | 8001 | `/health`, `/readyz` | LLM inference proxy (pydantic-ai) |
| vector-store | 8000 | `/health`, `/readyz` | ChromaDB embeddings |
| dashboard | 3000 | `/` | Intelligence Hub frontend |
| contract-hub | 3002 | `/api/health` | LawVu replacement — contracts, matters, docs |
| ccag-workspace | 3100 | `/health` | OpenCode Engine API (Bun/Hono) |
| ccag-workspace-ui | 3003 | `/` | Agent workspace React UI (static nginx) |

