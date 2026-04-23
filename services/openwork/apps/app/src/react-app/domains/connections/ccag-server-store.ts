import { useSyncExternalStore } from "react";

import { t, currentLocale } from "../../../i18n";
import type { StartupPreference, WorkspaceDisplay } from "../../../app/types";
import { isDesktopRuntime } from "../../../app/utils";
import {
  ccagServerInfo,
  ccagServerRestart,
  opencodeRouterInfo,
  orchestratorStatus,
  type OpenCodeRouterInfo,
  type CcagServerInfo,
  type OrchestratorStatus,
} from "../../../app/lib/desktop";
import {
  clearCcagServerSettings,
  createCcagServerClient,
  normalizeCcagServerUrl,
  readCcagServerSettings,
  writeCcagServerSettings,
  type CcagAuditEntry,
  type CcagServerCapabilities,
  type CcagServerClient,
  type CcagServerDiagnostics,
  type CcagServerError,
  type CcagServerSettings,
  type CcagServerStatus,
} from "../../../app/lib/ccag-server";

type SetStateAction<T> = T | ((current: T) => T);

type RemoteWorkspaceInput = {
  ccagHostUrl: string;
  ccagToken?: string | null;
  directory?: string | null;
  displayName?: string | null;
};

export type CcagServerStoreSnapshot = {
  ccagServerSettings: CcagServerSettings;
  shareRemoteAccessBusy: boolean;
  shareRemoteAccessError: string | null;
  ccagServerUrl: string;
  ccagServerBaseUrl: string;
  ccagServerAuth: { token?: string; hostToken?: string };
  ccagServerClient: CcagServerClient | null;
  ccagServerStatus: CcagServerStatus;
  ccagServerCapabilities: CcagServerCapabilities | null;
  ccagServerReady: boolean;
  ccagServerWorkspaceReady: boolean;
  resolvedCcagCapabilities: CcagServerCapabilities | null;
  ccagServerCanWriteSkills: boolean;
  ccagServerCanWritePlugins: boolean;
  ccagServerHostInfo: CcagServerInfo | null;
  ccagServerDiagnostics: CcagServerDiagnostics | null;
  ccagReconnectBusy: boolean;
  opencodeRouterInfoState: OpenCodeRouterInfo | null;
  orchestratorStatusState: OrchestratorStatus | null;
  ccagAuditEntries: CcagAuditEntry[];
  ccagAuditStatus: "idle" | "loading" | "error";
  ccagAuditError: string | null;
  devtoolsWorkspaceId: string | null;
};

export type CcagServerStore = ReturnType<typeof createCcagServerStore>;

type CreateCcagServerStoreOptions = {
  startupPreference: () => StartupPreference | null;
  documentVisible: () => boolean;
  developerMode: () => boolean;
  runtimeWorkspaceId: () => string | null;
  activeClient: () => unknown | null;
  selectedWorkspaceDisplay: () => WorkspaceDisplay;
  restartLocalServer: () => Promise<boolean>;
  createRemoteWorkspaceFlow: (input: RemoteWorkspaceInput) => Promise<boolean>;
};

type MutableState = {
  ccagServerSettings: CcagServerSettings;
  shareRemoteAccessBusy: boolean;
  shareRemoteAccessError: string | null;
  ccagServerUrl: string;
  ccagServerStatus: CcagServerStatus;
  ccagServerCapabilities: CcagServerCapabilities | null;
  ccagServerCheckedAt: number | null;
  ccagServerHostInfo: CcagServerInfo | null;
  ccagServerHostInfoReady: boolean;
  ccagServerDiagnostics: CcagServerDiagnostics | null;
  ccagReconnectBusy: boolean;
  opencodeRouterInfoState: OpenCodeRouterInfo | null;
  orchestratorStatusState: OrchestratorStatus | null;
  ccagAuditEntries: CcagAuditEntry[];
  ccagAuditStatus: "idle" | "loading" | "error";
  ccagAuditError: string | null;
  devtoolsWorkspaceId: string | null;
};

const applyStateAction = <T,>(current: T, next: SetStateAction<T>) =>
  typeof next === "function" ? (next as (value: T) => T)(current) : next;

export function createCcagServerStore(options: CreateCcagServerStoreOptions) {
  const bootStartedAt = Date.now();
  const listeners = new Set<() => void>();
  const intervals = new Map<string, number>();

  let clientCacheKey = "";
  let clientCacheValue: CcagServerClient | null = null;
  let started = false;
  let disposed = false;
  let healthTimeoutId: number | null = null;
  let healthBusy = false;
  let healthDelayMs = 10_000;
  let snapshot: CcagServerStoreSnapshot;

  let state: MutableState = {
    ccagServerSettings: readCcagServerSettings(),
    shareRemoteAccessBusy: false,
    shareRemoteAccessError: null,
    ccagServerUrl: "",
    ccagServerStatus: "disconnected",
    ccagServerCapabilities: null,
    ccagServerCheckedAt: null,
    ccagServerHostInfo: null,
    ccagServerHostInfoReady: !isDesktopRuntime(),
    ccagServerDiagnostics: null,
    ccagReconnectBusy: false,
    opencodeRouterInfoState: null,
    orchestratorStatusState: null,
    ccagAuditEntries: [],
    ccagAuditStatus: "idle",
    ccagAuditError: null,
    devtoolsWorkspaceId: null,
  };

  const emitChange = () => {
    for (const listener of listeners) listener();
  };

  const getBaseUrl = () => {
    const pref = options.startupPreference();
    const hostInfo = state.ccagServerHostInfo;
    const settingsUrl = normalizeCcagServerUrl(state.ccagServerSettings.urlOverride ?? "") ?? "";

    if (pref === "local") return hostInfo?.baseUrl ?? "";
    if (pref === "server") return settingsUrl;
    return hostInfo?.baseUrl ?? settingsUrl;
  };

  const getAuth = () => {
    const pref = options.startupPreference();
    const hostInfo = state.ccagServerHostInfo;
    const settingsToken = state.ccagServerSettings.token?.trim() ?? "";
    const clientToken = hostInfo?.clientToken?.trim() ?? "";
    const hostToken = hostInfo?.hostToken?.trim() ?? "";

    if (pref === "local") {
      return { token: clientToken || undefined, hostToken: hostToken || undefined };
    }
    if (pref === "server") {
      return { token: settingsToken || undefined, hostToken: undefined };
    }
    if (hostInfo?.baseUrl) {
      return { token: clientToken || undefined, hostToken: hostToken || undefined };
    }
    return { token: settingsToken || undefined, hostToken: undefined };
  };

  const getClient = () => {
    const baseUrl = getBaseUrl().trim();
    if (!baseUrl) {
      clientCacheKey = "";
      clientCacheValue = null;
      return null;
    }

    const auth = getAuth();
    const key = `${baseUrl}::${auth.token ?? ""}::${auth.hostToken ?? ""}`;
    if (key !== clientCacheKey) {
      clientCacheKey = key;
      clientCacheValue = createCcagServerClient({
        baseUrl,
        token: auth.token,
        hostToken: auth.hostToken,
      });
    }
    return clientCacheValue;
  };

  const refreshSnapshot = () => {
    const ccagServerBaseUrl = getBaseUrl().trim();
    const ccagServerAuth = getAuth();
    const ccagServerClient = getClient();
    const ccagServerReady = state.ccagServerStatus === "connected";
    const ccagServerWorkspaceReady = Boolean(options.runtimeWorkspaceId());
    const resolvedCcagCapabilities = state.ccagServerCapabilities;

    const pref = options.startupPreference();
    const info = state.ccagServerHostInfo;
    const hostUrl = info?.connectUrl ?? info?.lanUrl ?? info?.mdnsUrl ?? info?.baseUrl ?? "";
    const settingsUrl = normalizeCcagServerUrl(state.ccagServerSettings.urlOverride ?? "") ?? "";

    let ccagServerUrl = hostUrl || settingsUrl;
    if (pref === "local") ccagServerUrl = hostUrl;
    if (pref === "server") ccagServerUrl = settingsUrl;
    state.ccagServerUrl = ccagServerUrl;

    snapshot = {
      ccagServerSettings: state.ccagServerSettings,
      shareRemoteAccessBusy: state.shareRemoteAccessBusy,
      shareRemoteAccessError: state.shareRemoteAccessError,
      ccagServerUrl,
      ccagServerBaseUrl,
      ccagServerAuth,
      ccagServerClient,
      ccagServerStatus: state.ccagServerStatus,
      ccagServerCapabilities: state.ccagServerCapabilities,
      ccagServerReady,
      ccagServerWorkspaceReady,
      resolvedCcagCapabilities,
      ccagServerCanWriteSkills:
        ccagServerReady &&
        ccagServerWorkspaceReady &&
        (resolvedCcagCapabilities?.skills?.write ?? false),
      ccagServerCanWritePlugins:
        ccagServerReady &&
        ccagServerWorkspaceReady &&
        (resolvedCcagCapabilities?.plugins?.write ?? false),
      ccagServerHostInfo: state.ccagServerHostInfo,
      ccagServerDiagnostics: state.ccagServerDiagnostics,
      ccagReconnectBusy: state.ccagReconnectBusy,
      opencodeRouterInfoState: state.opencodeRouterInfoState,
      orchestratorStatusState: state.orchestratorStatusState,
      ccagAuditEntries: state.ccagAuditEntries,
      ccagAuditStatus: state.ccagAuditStatus,
      ccagAuditError: state.ccagAuditError,
      devtoolsWorkspaceId: state.devtoolsWorkspaceId,
    };
  };

  const mutateState = (updater: (current: MutableState) => MutableState) => {
    state = updater(state);
    refreshSnapshot();
    emitChange();
  };

  const setStateField = <K extends keyof MutableState>(key: K, value: MutableState[K]) => {
    if (Object.is(state[key], value)) return;
    mutateState((current) => ({ ...current, [key]: value }));
  };

  const setCcagServerSettings = (next: SetStateAction<CcagServerSettings>) => {
    const resolved = applyStateAction(state.ccagServerSettings, next);
    mutateState((current) => ({ ...current, ccagServerSettings: resolved }));
    queueHealthCheck(0);
  };

  const updateCcagServerSettings = (next: CcagServerSettings) => {
    const stored = writeCcagServerSettings(next);
    mutateState((current) => ({ ...current, ccagServerSettings: stored }));
    queueHealthCheck(0);
  };

  const resetCcagServerSettings = () => {
    clearCcagServerSettings();
    mutateState((current) => ({ ...current, ccagServerSettings: {} }));
    queueHealthCheck(0);
  };

  const shouldWaitForLocalHostInfo = () =>
    isDesktopRuntime() &&
    options.startupPreference() !== "server" &&
    !state.ccagServerHostInfoReady;

  const shouldRetryStartupCheck = (status: CcagServerStatus) =>
    status !== "connected" &&
    isDesktopRuntime() &&
    options.startupPreference() !== "server" &&
    Date.now() - bootStartedAt < 5_000;

  const checkCcagServer = async (url: string, token?: string, hostToken?: string) => {
    const client = createCcagServerClient({ baseUrl: url, token, hostToken });
    try {
      await client.health();
    } catch (error) {
      const resolved = error as CcagServerError | Error;
      if ("status" in resolved && (resolved.status === 401 || resolved.status === 403)) {
        return { status: "limited" as CcagServerStatus, capabilities: null };
      }
      return { status: "disconnected" as CcagServerStatus, capabilities: null };
    }

    if (!token) {
      return { status: "limited" as CcagServerStatus, capabilities: null };
    }

    try {
      const capabilities = await client.capabilities();
      return { status: "connected" as CcagServerStatus, capabilities };
    } catch (error) {
      const resolved = error as CcagServerError | Error;
      if ("status" in resolved && (resolved.status === 401 || resolved.status === 403)) {
        return { status: "limited" as CcagServerStatus, capabilities: null };
      }
      return { status: "disconnected" as CcagServerStatus, capabilities: null };
    }
  };

  const clearHealthTimeout = () => {
    if (healthTimeoutId !== null) {
      window.clearTimeout(healthTimeoutId);
      healthTimeoutId = null;
    }
  };

  const queueHealthCheck = (delayMs: number) => {
    if (disposed || typeof window === "undefined") return;
    clearHealthTimeout();
    healthTimeoutId = window.setTimeout(() => {
      healthTimeoutId = null;
      void runHealthCheck();
    }, Math.max(0, delayMs));
  };

  const runHealthCheck = async () => {
    if (disposed || typeof window === "undefined") return;
    if (!options.documentVisible()) return;
    if (shouldWaitForLocalHostInfo()) return;
    if (healthBusy) return;

    const url = getBaseUrl().trim();
    const auth = getAuth();
    if (!url) {
      mutateState((current) => ({
        ...current,
        ccagServerStatus: "disconnected",
        ccagServerCapabilities: null,
        ccagServerCheckedAt: Date.now(),
      }));
      return;
    }

    healthBusy = true;
    try {
      let result = await checkCcagServer(url, auth.token, auth.hostToken);

      if (shouldRetryStartupCheck(result.status)) {
        await new Promise<void>((resolve) => window.setTimeout(resolve, 250));
        if (disposed) return;

        try {
          const info = await ccagServerInfo();
          if (disposed) return;

          mutateState((current) => ({
            ...current,
            ccagServerHostInfo: info,
            ccagServerHostInfoReady: true,
          }));

          const retryUrl = info.baseUrl?.trim() ?? "";
          const retryToken = info.clientToken?.trim() || undefined;
          const retryHostToken = info.hostToken?.trim() || undefined;
          if (retryUrl) {
            result = await checkCcagServer(retryUrl, retryToken, retryHostToken);
          }
        } catch {
          // Preserve the original check result when the retry probe fails.
        }
      }

      if (disposed) return;
      healthDelayMs =
        result.status === "connected" || result.status === "limited"
          ? 10_000
          : Math.min(healthDelayMs * 2, 60_000);

      mutateState((current) => ({
        ...current,
        ccagServerStatus: result.status,
        ccagServerCapabilities: result.capabilities,
        ccagServerCheckedAt: Date.now(),
      }));
    } catch {
      healthDelayMs = Math.min(healthDelayMs * 2, 60_000);
      mutateState((current) => ({
        ...current,
        ccagServerCheckedAt: Date.now(),
      }));
    } finally {
      healthBusy = false;
      if (!disposed) queueHealthCheck(healthDelayMs);
    }
  };

  const syncFromOptions = () => {
    refreshSnapshot();
    emitChange();

    if (!isDesktopRuntime()) return;
    const port = state.ccagServerHostInfo?.port;
    if (!port) return;
    if (state.ccagServerSettings.portOverride === port) return;

    updateCcagServerSettings({
      ...state.ccagServerSettings,
      portOverride: port,
    });
  };

  const startInterval = (key: string, fn: () => void, ms: number) => {
    if (typeof window === "undefined") return;
    if (intervals.has(key)) return;
    intervals.set(key, window.setInterval(fn, ms));
  };

  const stopInterval = (key: string) => {
    const id = intervals.get(key);
    if (id === undefined) return;
    window.clearInterval(id);
    intervals.delete(key);
  };

  const start = () => {
    if (typeof window === "undefined") return;
    if (started) return;
    // Allow restart after a prior dispose() (React 18 StrictMode double-mounts
    // each effect in dev: mount → dispose → re-mount). If we early-return when
    // `disposed` is true, the real mount never arms polling and the UI stays
    // on stale/empty state forever.
    disposed = false;
    started = true;

    syncFromOptions();
    queueHealthCheck(0);

    const refreshHostInfo = () => {
      if (!isDesktopRuntime()) return;
      if (!options.documentVisible()) return;
      void (async () => {
        try {
          const info = await ccagServerInfo();
          if (disposed) return;
          mutateState((current) => ({
            ...current,
            ccagServerHostInfo: info,
            ccagServerHostInfoReady: true,
          }));
        } catch {
          if (disposed) return;
          mutateState((current) => ({
            ...current,
            ccagServerHostInfo: null,
            ccagServerHostInfoReady: true,
          }));
        }
      })();
    };
    refreshHostInfo();
    startInterval("hostInfo", refreshHostInfo, 10_000);

    const refreshDiagnostics = () => {
      if (!options.documentVisible()) return;
      if (!options.developerMode()) {
        setStateField("ccagServerDiagnostics", null);
        return;
      }

      const client = getClient();
      if (!client || state.ccagServerStatus === "disconnected") {
        setStateField("ccagServerDiagnostics", null);
        return;
      }

      void (async () => {
        try {
          const status = await client.status();
          if (!disposed) setStateField("ccagServerDiagnostics", status);
        } catch {
          if (!disposed) setStateField("ccagServerDiagnostics", null);
        }
      })();
    };
    refreshDiagnostics();
    startInterval("diagnostics", refreshDiagnostics, 10_000);

    const refreshRouterInfo = () => {
      if (!isDesktopRuntime()) return;
      if (!options.documentVisible()) return;
      if (!options.developerMode()) {
        setStateField("opencodeRouterInfoState", null);
        return;
      }

      void (async () => {
        try {
          const info = await opencodeRouterInfo();
          if (!disposed) setStateField("opencodeRouterInfoState", info);
        } catch {
          if (!disposed) setStateField("opencodeRouterInfoState", null);
        }
      })();
    };
    refreshRouterInfo();
    startInterval("router", refreshRouterInfo, 10_000);

    const refreshOrchestratorStatus = () => {
      if (!isDesktopRuntime()) return;
      if (!options.documentVisible()) return;
      if (!options.developerMode()) {
        setStateField("orchestratorStatusState", null);
        return;
      }

      void (async () => {
        try {
          const status = await orchestratorStatus();
          if (!disposed) setStateField("orchestratorStatusState", status);
        } catch {
          if (!disposed) setStateField("orchestratorStatusState", null);
        }
      })();
    };
    refreshOrchestratorStatus();
    startInterval("orchestrator", refreshOrchestratorStatus, 10_000);

    const refreshDevtoolsWorkspace = () => {
      if (!options.documentVisible()) return;
      if (!options.developerMode()) {
        setStateField("devtoolsWorkspaceId", null);
        return;
      }

      const client = getClient();
      if (!client) {
        setStateField("devtoolsWorkspaceId", null);
        return;
      }

      void (async () => {
        try {
          const response = await client.listWorkspaces();
          if (disposed) return;
          const items = Array.isArray(response.items) ? response.items : [];
          const activeMatch = response.activeId
            ? items.find((item) => item.id === response.activeId)
            : null;
          setStateField("devtoolsWorkspaceId", activeMatch?.id ?? items[0]?.id ?? null);
        } catch {
          if (!disposed) setStateField("devtoolsWorkspaceId", null);
        }
      })();
    };
    refreshDevtoolsWorkspace();
    startInterval("devtoolsWorkspace", refreshDevtoolsWorkspace, 20_000);

    const refreshAudit = () => {
      if (!options.documentVisible()) return;
      if (!options.developerMode()) {
        mutateState((current) => ({
          ...current,
          ccagAuditEntries: [],
          ccagAuditStatus: "idle",
          ccagAuditError: null,
        }));
        return;
      }

      const client = getClient();
      const workspaceId = state.devtoolsWorkspaceId;
      if (!client || !workspaceId) {
        mutateState((current) => ({
          ...current,
          ccagAuditEntries: [],
          ccagAuditStatus: "idle",
          ccagAuditError: null,
        }));
        return;
      }

      mutateState((current) => ({
        ...current,
        ccagAuditStatus: "loading",
        ccagAuditError: null,
      }));

      void (async () => {
        try {
          const result = await client.listAudit(workspaceId, 50);
          if (disposed) return;
          mutateState((current) => ({
            ...current,
            ccagAuditEntries: Array.isArray(result.items) ? result.items : [],
            ccagAuditStatus: "idle",
          }));
        } catch (error) {
          if (disposed) return;
          mutateState((current) => ({
            ...current,
            ccagAuditEntries: [],
            ccagAuditStatus: "error",
            ccagAuditError:
              error instanceof Error
                ? error.message
                : t("app.error_audit_load", currentLocale()),
          }));
        }
      })();
    };
    refreshAudit();
    startInterval("audit", refreshAudit, 15_000);
  };

  const dispose = () => {
    disposed = true;
    started = false;
    clearHealthTimeout();
    for (const key of [...intervals.keys()]) stopInterval(key);
  };

  const testCcagServerConnection = async (next: CcagServerSettings) => {
    const derived = normalizeCcagServerUrl(next.urlOverride ?? "");
    if (!derived) {
      mutateState((current) => ({
        ...current,
        ccagServerStatus: "disconnected",
        ccagServerCapabilities: null,
        ccagServerCheckedAt: Date.now(),
      }));
      return false;
    }

    const result = await checkCcagServer(derived, next.token);
    mutateState((current) => ({
      ...current,
      ccagServerStatus: result.status,
      ccagServerCapabilities: result.capabilities,
      ccagServerCheckedAt: Date.now(),
    }));

    const ok = result.status === "connected" || result.status === "limited";
    if (ok && !isDesktopRuntime()) {
      const active = options.selectedWorkspaceDisplay();
      const shouldAttach =
        !options.activeClient() ||
        active.workspaceType !== "remote" ||
        active.remoteType !== "ccag";
      if (shouldAttach) {
        await options
          .createRemoteWorkspaceFlow({
            ccagHostUrl: derived,
            ccagToken: next.token ?? null,
          })
          .catch(() => undefined);
      }
    }
    return ok;
  };

  const reconnectCcagServer = async () => {
    if (state.ccagReconnectBusy) return false;
    setStateField("ccagReconnectBusy", true);

    try {
      let hostInfo = state.ccagServerHostInfo;
      if (isDesktopRuntime()) {
        try {
          hostInfo = await ccagServerInfo();
          mutateState((current) => ({ ...current, ccagServerHostInfo: hostInfo }));
        } catch {
          hostInfo = null;
          setStateField("ccagServerHostInfo", null);
        }
      }

      if (hostInfo?.clientToken?.trim() && options.startupPreference() !== "server") {
        const liveToken = hostInfo.clientToken.trim();
        const settings = state.ccagServerSettings;
        if ((settings.token?.trim() ?? "") !== liveToken) {
          updateCcagServerSettings({ ...settings, token: liveToken });
        }
      }

      const url = getBaseUrl().trim();
      const auth = getAuth();
      if (!url) {
        mutateState((current) => ({
          ...current,
          ccagServerStatus: "disconnected",
          ccagServerCapabilities: null,
          ccagServerCheckedAt: Date.now(),
        }));
        return false;
      }

      const result = await checkCcagServer(url, auth.token, auth.hostToken);
      mutateState((current) => ({
        ...current,
        ccagServerStatus: result.status,
        ccagServerCapabilities: result.capabilities,
        ccagServerCheckedAt: Date.now(),
      }));
      return result.status === "connected" || result.status === "limited";
    } finally {
      setStateField("ccagReconnectBusy", false);
    }
  };

  async function ensureLocalCcagServerClient(): Promise<CcagServerClient | null> {
    let hostInfo = state.ccagServerHostInfo;
    if (hostInfo?.baseUrl?.trim() && hostInfo.clientToken?.trim()) {
      const existing = createCcagServerClient({
        baseUrl: hostInfo.baseUrl.trim(),
        token: hostInfo.clientToken.trim(),
        hostToken: hostInfo.hostToken?.trim() || undefined,
      });
      try {
        await existing.health();
        if (options.startupPreference() !== "server") {
          await reconnectCcagServer();
        }
        return existing;
      } catch {
        // Fall through to a local restart.
      }
    }

    if (!isDesktopRuntime()) return null;

    try {
      hostInfo = await ccagServerRestart({
        remoteAccessEnabled: state.ccagServerSettings.remoteAccessEnabled === true,
      });
      mutateState((current) => ({ ...current, ccagServerHostInfo: hostInfo }));
    } catch {
      return null;
    }

    const baseUrl = hostInfo?.baseUrl?.trim() ?? "";
    const token = hostInfo?.clientToken?.trim() ?? "";
    const hostToken = hostInfo?.hostToken?.trim() ?? "";
    if (!baseUrl || !token) return null;

    if (options.startupPreference() !== "server") {
      await reconnectCcagServer();
    }

    return createCcagServerClient({
      baseUrl,
      token,
      hostToken: hostToken || undefined,
    });
  }

  const saveShareRemoteAccess = async (enabled: boolean) => {
    if (state.shareRemoteAccessBusy) return;
    const previous = state.ccagServerSettings;
    const next: CcagServerSettings = {
      ...previous,
      remoteAccessEnabled: enabled,
    };

    mutateState((current) => ({
      ...current,
      shareRemoteAccessBusy: true,
      shareRemoteAccessError: null,
    }));
    updateCcagServerSettings(next);

    try {
      if (isDesktopRuntime() && options.selectedWorkspaceDisplay().workspaceType === "local") {
        const restarted = await options.restartLocalServer();
        if (!restarted) {
          throw new Error(t("app.error_restart_local_worker", currentLocale()));
        }
        await reconnectCcagServer();
      }
    } catch (error) {
      updateCcagServerSettings(previous);
      mutateState((current) => ({
        ...current,
        shareRemoteAccessError:
          error instanceof Error
            ? error.message
            : t("app.error_remote_access", currentLocale()),
      }));
      return;
    } finally {
      setStateField("shareRemoteAccessBusy", false);
    }
  };

  refreshSnapshot();

  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };

  const getSnapshot = () => snapshot;

  return {
    subscribe,
    getSnapshot,
    start,
    dispose,
    syncFromOptions,
    setCcagServerSettings,
    updateCcagServerSettings,
    resetCcagServerSettings,
    saveShareRemoteAccess,
    checkCcagServer,
    testCcagServerConnection,
    reconnectCcagServer,
    ensureLocalCcagServerClient,
  };
}

export function useCcagServerStoreSnapshot(store: CcagServerStore) {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}
