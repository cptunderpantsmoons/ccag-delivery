# CCAG Orchestrator

Host orchestrator for opencode + CCAG server + opencode-router. This is a CLI-first way to run host mode without the desktop UI.

Published on npm as `ccag-orchestrator` and installs the `ccag` command.

## Quick start

```bash
npm install -g ccag-orchestrator
ccag start --workspace /path/to/workspace --approval auto
```

When run in a TTY, `ccag` shows an interactive status dashboard with service health, ports, and
connection details. Use `ccag serve` or `--no-tui` for log-only mode.

```bash
ccag serve --workspace /path/to/workspace
```

`ccag` ships as a compiled binary, so Bun is not required at runtime.

If npm skips the optional platform package, `postinstall` falls back to downloading the matching
binary from the `ccag-orchestrator-v<version>` GitHub release. Override the download host with
`CCAG_ORCHESTRATOR_DOWNLOAD_BASE_URL` when you need to use a mirror.

`ccag` downloads and caches the `ccag-server`, `opencode-router`, and `opencode` sidecars on
first run using a SHA-256 manifest. Use `--sidecar-dir` or `CCAG_SIDECAR_DIR` to control the
cache location, and `--sidecar-base-url` / `--sidecar-manifest` to point at a custom host.

Use `--sidecar-source` to control where `ccag-server` and `opencode-router` are resolved
(`auto` | `bundled` | `downloaded` | `external`), and `--opencode-source` to control
`opencode` resolution. Set `CCAG_SIDECAR_SOURCE` / `CCAG_OPENCODE_SOURCE` to
apply the same policies via env vars.

By default the manifest is fetched from
`https://github.com/different-ai/ccag/releases/download/ccag-orchestrator-v<version>/ccag-orchestrator-sidecars.json`.

OpenCode Router is optional. If it exits, `ccag` continues running unless you pass
`--opencode-router-required` or set `CCAG_OPENCODE_ROUTER_REQUIRED=1`.

For development overrides only, set `CCAG_ALLOW_EXTERNAL=1` or pass `--allow-external` to use
locally installed `ccag-server` or `opencode-router` binaries.

Add `--verbose` (or `CCAG_VERBOSE=1`) to print extra diagnostics about resolved binaries.

OpenCode hot reload is enabled by default when launched via `ccag`.
Tune it with:

- `--opencode-hot-reload` / `--no-opencode-hot-reload`
- `--opencode-hot-reload-debounce-ms <ms>`
- `--opencode-hot-reload-cooldown-ms <ms>`

Equivalent env vars:

- `CCAG_OPENCODE_HOT_RELOAD` (router mode)
- `CCAG_OPENCODE_HOT_RELOAD_DEBOUNCE_MS`
- `CCAG_OPENCODE_HOT_RELOAD_COOLDOWN_MS`
- `CCAG_OPENCODE_HOT_RELOAD` (start/serve mode)
- `CCAG_OPENCODE_HOT_RELOAD_DEBOUNCE_MS`
- `CCAG_OPENCODE_HOT_RELOAD_COOLDOWN_MS`

Or from source:

```bash
pnpm --filter ccag-orchestrator dev -- \
  start --workspace /path/to/workspace --approval auto --allow-external
```

When `CCAG_DEV_MODE=1` is set, orchestrator uses an isolated OpenCode dev state for config, auth, data, cache, and state. CCAG's repo-level `pnpm dev` commands enable this automatically so local development does not reuse your personal OpenCode environment.

The command prints pairing URLs by default and withholds live credentials from stdout to avoid leaking them into shell history or collected logs. Use `--json` only when you explicitly need the raw pairing secrets in command output.

Use `--detach` to keep services running and exit the dashboard. The detach summary includes the
CCAG URL and a redacted `opencode attach` command, while keeping live credentials out of the detached summary.

## Sandbox mode (Docker / Apple container)

`ccag` can run the sidecars inside a Linux container boundary while still mounting your workspace
from the host.

```bash
# Auto-pick sandbox backend (prefers Apple container on supported Macs)
ccag start --sandbox auto --workspace /path/to/workspace --approval auto

# Explicit backends
ccag start --sandbox docker --workspace /path/to/workspace --approval auto
ccag start --sandbox container --workspace /path/to/workspace --approval auto
```

Notes:

- `--sandbox auto` prefers Apple `container` on supported Macs (arm64), otherwise Docker.
- Docker backend requires `docker` on your PATH.
- Apple container backend requires the `container` CLI (https://github.com/apple/container).
- In sandbox mode, sidecars are resolved for a Linux target (and `--sidecar-source` / `--opencode-source`
  are effectively `downloaded`).
- Custom `--*-bin` overrides are not supported in sandbox mode yet.
- Use `--sandbox-image` to pick an image with the toolchain you want available to OpenCode.
- Use `--sandbox-persist-dir` to control the host directory mounted at `/persist` inside the container.

### Extra mounts (allowlisted)

You can add explicit, validated mounts into `/workspace/extra/*`:

```bash
ccag start --sandbox auto --sandbox-mount "/path/on/host:datasets:ro" --workspace /path/to/workspace
```

Additional mounts are blocked unless you create an allowlist at:

- `~/.config/ccag/sandbox-mount-allowlist.json`

Override with `CCAG_SANDBOX_MOUNT_ALLOWLIST`.

## Logging

`ccag` emits a unified log stream from OpenCode, CCAG server, and opencode-router. Use JSON format for
structured, OpenTelemetry-friendly logs and a stable run id for correlation.

```bash
CCAG_LOG_FORMAT=json ccag start --workspace /path/to/workspace
```

Use `--run-id` or `CCAG_RUN_ID` to supply your own correlation id.

CCAG server logs every request with method, path, status, and duration. Disable this when running
`ccag-server` directly by setting `CCAG_LOG_REQUESTS=0` or passing `--no-log-requests`.

## Router daemon (multi-workspace)

The router keeps a single OpenCode process alive and switches workspaces JIT using the `directory` parameter.

```bash
ccag daemon start
ccag workspace add /path/to/workspace-a
ccag workspace add /path/to/workspace-b
ccag workspace list --json
ccag workspace path <id>
ccag instance dispose <id>
```

Use `CCAG_DATA_DIR` or `--data-dir` to isolate router state in tests.

## Pairing notes

- Use the **CCAG connect URL** and **client token** to connect a remote CCAG client.
- The CCAG server advertises the **OpenCode connect URL** plus optional basic auth credentials to the client.

## Approvals (manual mode)

```bash
ccag approvals list \
  --ccag-url http://<host>:8787 \
  --host-token <token>

ccag approvals reply <id> --allow \
  --ccag-url http://<host>:8787 \
  --host-token <token>
```

## Health checks

```bash
ccag status \
  --ccag-url http://<host>:8787 \
  --opencode-url http://<host>:4096
```

## File sessions (JIT catalog + batch read/write)

Create a short-lived workspace file session and sync files in batches:

```bash
# Create writable session
ccag files session create \
  --ccag-url http://<host>:8787 \
  --token <client-token> \
  --workspace-id <workspace-id> \
  --write \
  --json

# Fetch catalog snapshot
ccag files catalog <session-id> \
  --ccag-url http://<host>:8787 \
  --token <client-token> \
  --limit 200 \
  --json

# Read one or more files
ccag files read <session-id> \
  --ccag-url http://<host>:8787 \
  --token <client-token> \
  --paths "README.md,notes/todo.md" \
  --json

# Write a file (inline content or --file)
ccag files write <session-id> \
  --ccag-url http://<host>:8787 \
  --token <client-token> \
  --path notes/todo.md \
  --content "hello from ccag" \
  --json

# Watch change events and close session
ccag files events <session-id> --ccag-url http://<host>:8787 --token <client-token> --since 0 --json
ccag files session close <session-id> --ccag-url http://<host>:8787 --token <client-token> --json
```

## Smoke checks

```bash
ccag start --workspace /path/to/workspace --check --check-events
```

This starts the services, verifies health + SSE events, then exits cleanly.

## Local development

Point to source CLIs for fast iteration:

```bash
ccag start \
  --workspace /path/to/workspace \
  --allow-external \
  --ccag-server-bin apps/server/src/cli.ts \
  --opencode-router-bin apps/opencode-router/dist/cli.js
```
