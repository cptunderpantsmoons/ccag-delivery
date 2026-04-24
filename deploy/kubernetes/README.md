# Kubernetes Delivery Plan

This directory is reserved for the cluster deployment path of CCAG Delivery.

## Target Artifacts

1. `base/` manifests or Helm chart templates for:
   - orchestrator
   - adapter
   - vector-store
   - dashboard
   - contract-hub
   - ccag-workspace
   - ccag-workspace-ui
2. Stateful resources:
   - Postgres PVC + deployment/statefulset
   - vector persistence PVC
   - workspace persistence PVC
3. Config and secret overlays for environments (dev/stage/prod).

## Required Probe Paths

1. `/health` for liveness
2. `/readyz` for readiness (Python APIs)
3. `/api/health` for contract-hub readiness

## Suggested Validation Commands

```bash
kubectl apply --dry-run=server -f deploy/kubernetes
kubectl get pods -n ccag
kubectl describe pod <pod-name> -n ccag
```

