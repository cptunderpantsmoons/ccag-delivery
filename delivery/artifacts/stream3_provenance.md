# Stream 3 Provenance Log

- Data-driven decisions:
  - Service-level tests executed for adapter, orchestrator, and vector-store.
  - Code-level findings captured with file+line references.
  - Remediation validation confirmed with passing test suites:
    - adapter: 85 passed
    - orchestrator: 180 passed
    - vector-store: 4 passed
- Heuristic decisions:
  - Severity ranking and remediation sequencing (P0/P1/P2).
- Contract-mandated decisions:
  - Rollout readiness blocked until objective evidence supports exit criterion.
  - Compliance hook statements included in audit report.

// ASSUMPTION: current repository represents the baseline Carbon Agent POC.
