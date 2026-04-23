import type { CcagStore } from "./store";

export const selectActiveWorkspace = (state: CcagStore) =>
  state.workspaces.find(
    (workspace) => workspace.id === state.activeWorkspaceId,
  ) ?? null;

export const selectServerStatus = (state: CcagStore) => state.server.status;

export const selectServerUrl = (state: CcagStore) => state.server.url;

export const selectErrorBanner = (state: CcagStore) => state.errorBanner;
