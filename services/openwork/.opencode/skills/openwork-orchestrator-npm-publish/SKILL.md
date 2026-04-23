---
name: ccag-orchestrator-npm-publish
description: |
  Publish the ccag-orchestrator npm package with clean git hygiene.

  Triggers when user mentions:
  - "ccag-orchestrator npm publish"
  - "publish ccag-orchestrator"
  - "bump ccag-orchestrator"
---

## Quick usage (already configured)

1. Ensure you are on the default branch and the tree is clean.
2. Bump versions via the shared release bump (this keeps `ccag-orchestrator` aligned with the app/desktop release).

```bash
pnpm bump:patch
# or: pnpm bump:minor
# or: pnpm bump:major
# or: pnpm bump:set -- X.Y.Z
```

3. Commit the bump.
4. Preferred: publish via the "Release App" GitHub Actions workflow by tagging `vX.Y.Z`.

Manual recovery path (sidecars + npm) below.

```bash
pnpm --filter ccag-orchestrator build:sidecars
gh release create ccag-orchestrator-vX.Y.Z packages/orchestrator/dist/sidecars/* \
  --repo different-ai/ccag \
  --title "ccag-orchestrator vX.Y.Z sidecars" \
  --notes "Sidecar binaries and manifest for ccag-orchestrator vX.Y.Z"
```

5. Build ccag-orchestrator binaries for all supported platforms.

```bash
pnpm --filter ccag-orchestrator build:bin:all
```

6. Publish `ccag-orchestrator` as a meta package + platform packages (optionalDependencies).

```bash
node packages/orchestrator/scripts/publish-npm.mjs
```

7. Verify the published version.

```bash
npm view ccag-orchestrator version
```

---

## Scripted publish

```bash
./.opencode/skills/ccag-orchestrator-npm-publish/scripts/publish-ccag-orchestrator.sh
```

---

## First-time setup (if not configured)

Authenticate with npm before publishing.

```bash
npm login
```

Alternatively, export an npm token in your environment (see `.env.example`).

---

## Notes

- `ccag-orchestrator` is published as:
  - `ccag-orchestrator` (wrapper + optionalDependencies)
  - `ccag-orchestrator-darwin-arm64`, `ccag-orchestrator-darwin-x64`, `ccag-orchestrator-linux-arm64`, `ccag-orchestrator-linux-x64`, `ccag-orchestrator-windows-x64` (platform binaries)
- `ccag-orchestrator` is versioned in lockstep with CCAG app/desktop releases.
- ccag-orchestrator downloads sidecars from `ccag-orchestrator-vX.Y.Z` release assets by default.
