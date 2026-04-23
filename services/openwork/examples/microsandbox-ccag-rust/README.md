# Microsandbox CCAG Rust Example

Small standalone Rust example that starts the CCAG micro-sandbox image with the `microsandbox` SDK, publishes the CCAG server on a host port, persists `/workspace` and `/data` with host bind mounts, verifies `/health`, checks that `/workspaces` is `401` without a token and `200` with the client token, then keeps the sandbox alive until `Ctrl+C` while streaming the sandbox logs to your terminal.

## Run

```bash
cargo run --manifest-path examples/microsandbox-ccag-rust/Cargo.toml
```

Useful environment overrides:

- `CCAG_MICROSANDBOX_IMAGE` - OCI image reference to boot. Defaults to `ccag-microsandbox:dev`.
- `CCAG_MICROSANDBOX_NAME` - sandbox name. Defaults to `ccag-microsandbox-rust`.
- `CCAG_MICROSANDBOX_WORKSPACE_DIR` - host directory bind-mounted at `/workspace`. Defaults to `examples/microsandbox-ccag-rust/.state/<sandbox-name>/workspace`.
- `CCAG_MICROSANDBOX_DATA_DIR` - host directory bind-mounted at `/data`. Defaults to `examples/microsandbox-ccag-rust/.state/<sandbox-name>/data`.
- `CCAG_MICROSANDBOX_REPLACE` - set to `1` or `true` to replace the sandbox instead of reusing persistent state. Defaults to off.
- `CCAG_MICROSANDBOX_PORT` - published host port. Defaults to `8787`.
- `CCAG_CONNECT_HOST` - hostname you want clients to use. Defaults to `127.0.0.1`.
- `CCAG_TOKEN` - remote-connect client token. Defaults to `microsandbox-token`.
- `CCAG_HOST_TOKEN` - host/admin token. Defaults to `microsandbox-host-token`.

Example:

```bash
CCAG_MICROSANDBOX_IMAGE=ghcr.io/example/ccag-microsandbox:dev \
CCAG_MICROSANDBOX_WORKSPACE_DIR="$PWD/examples/microsandbox-ccag-rust/.state/demo/workspace" \
CCAG_MICROSANDBOX_DATA_DIR="$PWD/examples/microsandbox-ccag-rust/.state/demo/data" \
CCAG_CONNECT_HOST=127.0.0.1 \
CCAG_TOKEN=some-shared-secret \
CCAG_HOST_TOKEN=some-owner-secret \
cargo run --manifest-path examples/microsandbox-ccag-rust/Cargo.toml
```

## Test

The crate includes an ignored end-to-end smoke test that:

- boots the microsandbox image
- waits for `/health`
- verifies unauthenticated `/workspaces` returns `401`
- verifies authenticated `/workspaces` returns `200`
- creates an OpenCode session through `/w/:workspaceId/opencode/session`
- fetches the created session and its messages

Run it explicitly:

```bash
CCAG_MICROSANDBOX_IMAGE=ttl.sh/ccag-microsandbox-11559:1d \
cargo test --manifest-path examples/microsandbox-ccag-rust/Cargo.toml -- --ignored --nocapture
```

## Persistence behavior

By default, the example creates and reuses two host directories under `examples/microsandbox-ccag-rust/.state/<sandbox-name>/`:

- `/workspace`
- `/data`

That keeps CCAG and OpenCode state around across sandbox restarts, while using normal host filesystem semantics instead of managed microsandbox named volumes.

If you want a clean reset, either:

- change the sandbox name or bind mount paths, or
- set `CCAG_MICROSANDBOX_REPLACE=1`

## Note on local Docker images

`microsandbox` expects an OCI image reference. If `ccag-microsandbox:dev` only exists in your local Docker daemon, the SDK may not be able to resolve it directly. In that case, push the image to a registry or otherwise make it available as a pullable OCI image reference first, then set `CCAG_MICROSANDBOX_IMAGE` to that ref.
