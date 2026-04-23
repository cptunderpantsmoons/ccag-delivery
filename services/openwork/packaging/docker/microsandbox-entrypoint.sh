#!/usr/bin/env sh
set -eu

CCAG_WORKSPACE="${CCAG_WORKSPACE:-/workspace}"
CCAG_DATA_DIR="${CCAG_DATA_DIR:-/data/ccag-orchestrator}"
CCAG_SIDECAR_DIR="${CCAG_SIDECAR_DIR:-/data/sidecars}"
CCAG_PORT="${CCAG_PORT:-8787}"
CCAG_OPENCODE_PORT="${CCAG_OPENCODE_PORT:-4096}"
CCAG_TOKEN="${CCAG_TOKEN:-microsandbox-token}"
CCAG_HOST_TOKEN="${CCAG_HOST_TOKEN:-microsandbox-host-token}"
CCAG_APPROVAL_MODE="${CCAG_APPROVAL_MODE:-auto}"
CCAG_CORS_ORIGINS="${CCAG_CORS_ORIGINS:-*}"
CCAG_CONNECT_HOST="${CCAG_CONNECT_HOST:-127.0.0.1}"
HOME="${HOME:-/root}"
USER="${USER:-root}"
SHELL="${SHELL:-/bin/sh}"
XDG_CONFIG_HOME="${XDG_CONFIG_HOME:-$HOME/.config}"
XDG_CACHE_HOME="${XDG_CACHE_HOME:-$HOME/.cache}"
XDG_DATA_HOME="${XDG_DATA_HOME:-$HOME/.local/share}"
XDG_STATE_HOME="${XDG_STATE_HOME:-$HOME/.local/state}"

if [ "$HOME" = "/" ]; then
  HOME=/root
  XDG_CONFIG_HOME="$HOME/.config"
  XDG_CACHE_HOME="$HOME/.cache"
  XDG_DATA_HOME="$HOME/.local/share"
  XDG_STATE_HOME="$HOME/.local/state"
fi

export HOME USER SHELL XDG_CONFIG_HOME XDG_CACHE_HOME XDG_DATA_HOME XDG_STATE_HOME

mkdir -p "$CCAG_WORKSPACE" "$CCAG_DATA_DIR" "$CCAG_SIDECAR_DIR"
mkdir -p "$HOME" "$XDG_CONFIG_HOME" "$XDG_CACHE_HOME" "$XDG_DATA_HOME" "$XDG_STATE_HOME"

printf '%s\n' "Starting CCAG micro-sandbox"
printf '%s\n' "- workspace: $CCAG_WORKSPACE"
printf '%s\n' "- home: $HOME"
printf '%s\n' "- ccag url: http://$CCAG_CONNECT_HOST:$CCAG_PORT"
printf '%s\n' "- client token: $CCAG_TOKEN"
printf '%s\n' "- host token: $CCAG_HOST_TOKEN"
printf '%s\n' "- health: curl http://$CCAG_CONNECT_HOST:$CCAG_PORT/health"
printf '%s\n' "- auth test: curl -H \"Authorization: Bearer $CCAG_TOKEN\" http://$CCAG_CONNECT_HOST:$CCAG_PORT/workspaces"

exec ccag serve \
  --workspace "$CCAG_WORKSPACE" \
  --remote-access \
  --ccag-port "$CCAG_PORT" \
  --opencode-host 127.0.0.1 \
  --opencode-port "$CCAG_OPENCODE_PORT" \
  --ccag-token "$CCAG_TOKEN" \
  --ccag-host-token "$CCAG_HOST_TOKEN" \
  --approval "$CCAG_APPROVAL_MODE" \
  --cors "$CCAG_CORS_ORIGINS" \
  --connect-host "$CCAG_CONNECT_HOST" \
  --allow-external \
  --sidecar-source external \
  --opencode-source external \
  --ccag-server-bin /usr/local/bin/ccag-server \
  --opencode-bin /usr/local/bin/opencode \
  --no-opencode-router
