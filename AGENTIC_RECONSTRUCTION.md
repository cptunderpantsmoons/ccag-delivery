# CCAG Delivery Agentic Reconstruction Baseline

This document is the phase-0 corridor artifact for rebuilding and operating this repository at a production bar.

## 1. Corridor Statement

CCAG Delivery owns a multi-service agent platform for legal and operations workflows. The repo controls orchestration, tool execution, policy enforcement, UI surfaces, and operator packaging. Side effects are routed through explicit service boundaries, credentials are injected by environment contracts, and deployments are supported for both single-host and clustered on-prem runtimes.

## 2. Invariants

1. Orchestration and execution planes stay separated (orchestrator, adapter, vector store, UI services).
2. Every external side effect is behind a service API or explicit runtime adapter.
3. Auth and policy gates are mandatory at ingress (`Clerk`, API keys, middleware policy checks).
4. Runtime state is explicit (Postgres, Redis, vector persistence, workspace data volumes).
5. Readiness and health are exposed as HTTP probes (`/health`, `/readyz`, `/metrics` where available).
6. Deployment concerns stay in `docker-compose.yml` and `deploy/*`, not inside domain logic.
7. Secrets come from environment variables only, never from committed literals.

## 3. Out Of Scope

1. Rewriting the stack into a single language/runtime.
2. Collapsing all services into one process.
3. Replacing Clerk auth domain model in this phase.
4. Introducing hosted-only dependencies for baseline operation.

## 4. Top-Level Module Boundaries

| Boundary | Ownership | Responsibility |
| --- | --- | --- |
| `services/orchestrator` | Control plane API | User/session lifecycle, policy middleware, task scheduling, tenant routing, platform APIs |
| `services/adapter` | Model execution gateway | OpenAI-compatible and internal runtime API, provider routing, streamed responses |
| `services/vector-store` | Retrieval subsystem | Embedding-backed document indexing/search/delete |
| `services/contract-hub` | Legal workflow app | Contract/matter/document dashboard and APIs |
| `services/dashboard` | Platform dashboard | Operational UI, auth-gated frontend surfaces |
| `services/openwork` | Agent workspace | CCAG server runtime plus workspace UI and orchestration tooling |
| `services/postgres` | Persistence layer | SQL data and initialization scripts |
| Root `docker-compose.yml` | Runtime assembly | Service wiring, env contract, health checks, shared network/volumes |
| `deploy/*` | Operator layer | Host boot, runbooks, clustered deployment guidance |

## 5. Tool And Permission Model

1. Tool execution is service-scoped:
   - orchestrator handles platform management and policy-aware workflows
   - adapter handles provider/model calls and normalization
   - vector-store handles retrieval primitives
2. External API access is env-gated (`LLM_API_KEY`, Clerk keys, integration keys).
3. Internal trust boundaries rely on network segmentation (`ccag-net`) and internal token exchange.
4. Destructive or privileged behavior remains middleware/policy mediated (rate limit middleware, auth dependencies, admin routes).

## 6. Session And State Model

1. Durable state:
   - Postgres for relational entities and audit data
   - Redis for shared runtime cache/session support
   - Chroma/vector data in `vector_data` volume
   - OpenWork runtime state in `ccag_workspace_data`
2. Session lifecycle:
   - orchestrator session manager tracks active sessions and cleanup
   - background scheduler performs health, analytics, and cleanup loops
3. Resume model:
   - service restarts recover from persisted stores and mounted volumes
   - no in-memory-only critical business state is required to resume

## 7. Prompt Assembly Boundary

Prompt and model selection logic is isolated in adapter runtime modules (`services/adapter/app/runtime/*`) and provider wrappers. Orchestrator remains the policy/control surface and does not embed provider-specific prompt orchestration logic.

## 8. Observability Surface

1. Health probes: `/health` and `/readyz` on core Python APIs.
2. Metrics: `/metrics` exposed by orchestrator and adapter.
3. Structured logs: `structlog` in Python services; app/service logs through container runtime.
4. Compose-level visibility: `docker compose ps`, `docker compose logs -f <service>`.
5. Required operator smoke probes (after boot):
   - `http://localhost:8000/readyz` (orchestrator)
   - `http://localhost:8001/readyz` (adapter)
   - `http://localhost:8000/health` from vector-store container network
   - `http://localhost:3000` dashboard
   - `http://localhost:3002/api/health` contract-hub

## 9. On-Prem Launch Plan

The required deployment paths are captured in `deploy/ONPREM_RUNBOOK.md`:

1. Path A (single host/VM): Docker Compose baseline.
2. Path A.1 (host boot): systemd wrapper for Compose (`deploy/systemd/ccag-delivery-compose.service`).
3. Path B (cluster): Kubernetes/Helm migration plan and operational gate checklist.
4. Upgrade and rollback stories for each path.
5. Secrets contract and health/readiness verification for each path.

## 10. Verification Gates

Do not mark production-ready until all gates pass:

1. Fresh checkout boot succeeds.
2. Compose boot succeeds with all health checks green.
3. systemd-managed Compose starts and survives reboot.
4. Kubernetes/Helm dry-run passes and manifests are operator-validated.
5. Health/readiness probes are green for core services.
6. Happy path and failure path tests run in CI/local.
7. Rollback test is documented and executed.
8. No secrets leak in logs or source.

## 11. Quality Stack Checklist

The quality-stack categories from the skill are mapped here for execution discipline:

1. Discovery and corridor definition: complete (this document).
2. Planning and isolation: use branch/worktree discipline before subsystem rewrites.
3. Parallel implementation: split by service boundary, never by shared file hot spots.
4. Test-first verification: expand tests for every readiness/policy boundary touched.
5. Debugging and slop prevention: root-cause before patching behavior.
6. Security and threat modeling: enforce auth, token boundaries, and SSRF-safe patterns.
7. Release and rollback: preserve explicit runbook steps before merge.
8. Memory and operator docs: update runbook and reconstruction docs with every material change.

## 12. Repo-Specific Folder And Subsystem Map

1. Root:
   - `docker-compose.yml`
   - `.env.example`
2. Runtime services:
   - `services/orchestrator`
   - `services/adapter`
   - `services/vector-store`
   - `services/contract-hub`
   - `services/dashboard`
   - `services/openwork`
3. Infra services:
   - `services/postgres`
4. Deployment and operations:
   - `deploy/ONPREM_RUNBOOK.md`
   - `deploy/systemd/ccag-delivery-compose.service`
   - `deploy/kubernetes/README.md`

## 13. Fresh Recreation Build Order

Use this order for a clean-room recreation:

1. Corridor, invariants, and module boundaries.
2. Environment contract and secret categories.
3. Data services (`postgres`, `redis`, vector persistence contract).
4. Orchestrator control plane boot and health/readiness.
5. Adapter runtime boot and provider wiring.
6. Vector-store boot and retrieval APIs.
7. Frontend/service integration (`dashboard`, `contract-hub`, `openwork`).
8. Observability, metrics, and trace/log standards.
9. Compose packaging and deterministic boot.
10. systemd host-boot management.
11. Kubernetes/Helm deployment path.
12. Smoke tests, rollback rehearsal, and release checklist sign-off.

