# Stream 3 Codebase Audit Plan

## Scope
Audit the existing Carbon Agent platform toward rollout readiness.

## Initial System Map
- `services/adapter`: API adapter and integration boundary
- `services/orchestrator`: orchestration, policy, scheduling, session flow
- `services/vector-store`: vector search/indexing runtime
- `services/contract-hub`: contract-focused web application
- `services/dashboard`: UI/operations surface
- `services/postgres`: data bootstrap
- `services/openwork`: high-volume supporting code and dependencies

## Audit Tracks
1. Runtime stability and failure handling
2. Security controls and access boundaries
3. Observability and operational metrics
4. Deployment readiness and runbook completeness
5. Test coverage and regression risk hotspots

## Deliverables
- Audit findings report with severity levels
- Enhancement shortlist for rollout-readiness
- Validation checklist mapped to deployment runbook

## Provenance
- Data-driven: current repository service inventory.
- Heuristic: rollout-readiness categories and sequencing.
- Contract-mandated: Stream 3 objective and value demonstration requirement.
