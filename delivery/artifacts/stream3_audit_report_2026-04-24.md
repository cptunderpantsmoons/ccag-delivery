# Stream 3 Audit Report - 2026-04-24

## Scope
Rollout-readiness audit for:
- `services/adapter`
- `services/orchestrator`
- `services/vector-store`
- deployment surface in `docker-compose.yml`

## Evidence Snapshot
- `services/orchestrator`: `pytest -q` passed (`180 passed`).
- `services/adapter`: `pytest -q` failed during collection due to runtime import error.
- `services/vector-store`:
  - `pytest -q` showed `ModuleNotFoundError: No module named 'app'` (entrypoint inconsistency).
  - `python -m pytest -q tests/test_vector_store.py` showed missing runtime dependency (`fastembed`).

## Findings (Severity Ordered)

### P0 - Adapter runtime import contract is broken (startup/test blocker)
- Evidence:
  - `services/adapter/app/runtime/__init__.py:24` imports `create_benchmark_agent`.
  - `services/adapter/app/runtime/__init__.py:47` exports `create_benchmark_agent` in `__all__`.
  - `services/adapter/app/runtime/agents.py` does not define `create_benchmark_agent`.
  - Result: adapter tests fail at import time before execution.
- Impact:
  - Adapter service cannot reliably start in validated test mode.
  - Blocks Stream 3 "rollout-ready" criterion.
- Recommended fix:
  1. Add `create_benchmark_agent` implementation, or
  2. Remove stale import/export references and align all call sites.

### P1 - Internal error details are returned directly to API consumers
- Evidence:
  - `services/adapter/app/main.py:165`
  - `services/adapter/app/main.py:223`
  - `services/vector-store/app/main.py:87`
  - `services/vector-store/app/main.py:105`
  - `services/vector-store/app/main.py:120`
  - `services/vector-store/app/main.py:133`
  - `services/vector-store/app/main.py:144`
- Impact:
  - Upstream clients can receive exception internals.
  - Increases information disclosure risk in production incidents.
- Recommended fix:
  1. Return generic error messages to clients.
  2. Keep exception details only in structured logs (with trace/request IDs).

### P1 - Vector store write/destructive endpoints are unauthenticated
- Evidence:
  - `services/vector-store/app/main.py:90` (`/add`)
  - `services/vector-store/app/main.py:123` (`/delete`)
  - `services/vector-store/app/main.py:136` (`/clear`)
  - No auth dependency is attached to these routes.
- Impact:
  - Any network-reachable caller in the service mesh can mutate or wipe embeddings.
  - Weakens tenant isolation and blast-radius control.
- Recommended fix:
  1. Require service-to-service auth (`x-internal-token` or mTLS/JWT).
  2. Enforce tenant/user scope validation server-side on all write operations.
  3. Gate `/clear` behind admin-only control or remove in production.

### P1 - Host port exposure plus weak default credentials in compose
- Evidence:
  - `docker-compose.yml:20` exposes Postgres `5432:5432`.
  - `docker-compose.yml:37` exposes Redis `6379:6379`.
  - `docker-compose.yml:15` default DB password fallback is `changeme`.
- Impact:
  - Misconfigured environments can expose data plane services externally.
  - Raises unauthorized access risk.
- Recommended fix:
  1. Remove host `ports` for Postgres/Redis in production.
  2. Use strong secret-only credentials (no insecure defaults).
  3. Add environment validation to fail fast on default passwords.

### P2 - Vector-store test execution is not environment-robust
- Evidence:
  - Test invocation behavior differs between `pytest` and `python -m pytest`.
  - `python -m pytest` requires `fastembed`, which may be absent in base dev env.
- Impact:
  - Non-deterministic developer/CI test behavior.
  - Slows validation loops.
- Recommended fix:
  1. Standardize test invocation in docs/CI (`python -m pytest`).
  2. Add explicit test dependency bootstrap.
  3. Add test-level shim or fixture strategy for optional heavy embedding deps.

## Rollout Readiness Verdict
- Current verdict: **NOT rollout-ready**.
- Blocking conditions: remaining P1 hardening items.
- High-priority hardening required: vector-store auth boundary and compose network/secret tightening.

## Remediation Update (2026-04-24, Wave 1)
- Resolved:
  1. P0 adapter runtime import/export mismatch fixed (`services/adapter/app/runtime/__init__.py`).
  2. API error-detail leakage reduced in adapter and vector-store handlers.
  3. Adapter auth rotation behavior corrected when fake-store mode is active.
  4. Vector-store test harness stabilized (`pytest.ini`, test import shim).
- Verification:
  - `services/adapter`: `85 passed`
  - `services/orchestrator`: `180 passed`
  - `services/vector-store`: `4 passed`
- Still open:
  1. Vector-store write/destructive endpoint authentication.
  2. Compose exposure/default-secret hardening for production posture.

## Remediation Sequence (Execution Order)
1. Fix P0 adapter runtime export/import mismatch.
2. Implement generic API error responses + trace ID propagation.
3. Add vector-store auth and tenant-scope enforcement.
4. Harden compose networking and secret policy.
5. Normalize vector-store test harness/invocation.

## Compliance Hooks
- Confidentiality: no production data inspected during audit.
- IP assignment: this report is generated work product for Company.
- Variation check: all findings are within existing Stream 3 objective scope.

// ASSUMPTION: this audit reflects repository state as of 2026-04-24 and local environment package availability.

## Provenance
- Data-driven:
  - static code inspection and direct file references
  - executed test commands and observed failures/success
- Heuristic:
  - severity ranking and remediation order
- Contract-mandated:
  - rollout-readiness gating, compliance-hook framing, and Stream 3 focus
