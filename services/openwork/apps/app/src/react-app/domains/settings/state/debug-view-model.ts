/** @jsxImportSource react */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  appBuildInfo as appBuildInfoCmd,
  engineInfo as engineInfoCmd,
  engineStart as engineStartCmd,
  nukeCcagAndOpencodeConfigAndExit,
  ccagServerInfo as ccagServerInfoCmd,
  ccagServerRestart as ccagServerRestartCmd,
  opencodeRouterInfo as opencodeRouterInfoCmd,
  opencodeRouterRestart as opencodeRouterRestartCmd,
  opencodeRouterStop as opencodeRouterStopCmd,
  orchestratorStatus as orchestratorStatusCmd,
  pickFile,
  resetCcagState,
  sandboxDebugProbe as sandboxDebugProbeCmd,
  workspaceBootstrap as workspaceBootstrapCmd,
  type AppBuildInfo,
  type EngineInfo,
  type OpenCodeRouterInfo,
  type CcagServerInfo,
  type OrchestratorStatus,
  type SandboxDebugProbeResult,
} from "../../../../app/lib/desktop";
import {
  writeCcagServerSettings,
} from "../../../../app/lib/ccag-server";
import {
  clearStartupPreference,
  isDesktopRuntime,
  safeStringify,
} from "../../../../app/utils";
import { t } from "../../../../i18n";
import type { DebugViewProps } from "../pages/debug-view";
import type { CcagServerStore, CcagServerStoreSnapshot } from "../../connections/ccag-server-store";

const STARTUP_PREFERENCE_KEY = "ccag.startupPreference";
const ENGINE_SOURCE_KEY = "ccag.engineSource";
const ENGINE_RUNTIME_KEY = "ccag.engineRuntime";
const ENGINE_CUSTOM_BIN_KEY = "ccag.engineCustomBinPath";
const OPENCODE_ENABLE_EXA_KEY = "ccag.opencodeEnableExa";

type ResetModalMode = "onboarding" | "all";

type UseDebugViewModelOptions = {
  developerMode: boolean;
  ccagServerStore: CcagServerStore;
  ccagServerSnapshot: CcagServerStoreSnapshot;
  runtimeWorkspaceId: string | null;
  selectedWorkspaceRoot: string;
  setRouteError: (value: string | null) => void;
};

function readStoredString(key: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  try {
    return window.localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function writeStoredString(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore persistence failures
  }
}

function clearStoredString(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore persistence failures
  }
}

function downloadTextAsFile(filename: string, content: string, mimeType: string) {
  if (typeof window === "undefined") return;
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}

function readEngineSource(): "path" | "sidecar" | "custom" {
  const raw = readStoredString(ENGINE_SOURCE_KEY, "sidecar");
  return raw === "path" || raw === "sidecar" || raw === "custom" ? raw : "sidecar";
}

function readEngineRuntime(): "direct" | "ccag-orchestrator" {
  const raw = readStoredString(ENGINE_RUNTIME_KEY, "ccag-orchestrator");
  return raw === "direct" ? "direct" : "ccag-orchestrator";
}

function readOpencodeEnableExa(): boolean {
  return readStoredString(OPENCODE_ENABLE_EXA_KEY, "0") === "1";
}

function statusPill(
  running: boolean,
  connectedLabel?: string,
  disconnectedLabel?: string,
): { label: string; className: string } {
  return running
    ? {
        label: connectedLabel ?? t("status.connected"),
        className: "border-green-7/30 bg-green-7/10 text-green-11",
      }
    : {
        label: disconnectedLabel ?? t("status.disconnected_label"),
        className: "border-gray-7/30 bg-gray-4/50 text-gray-11",
      };
}

function auditStatusPill(status: "idle" | "loading" | "error"): {
  label: string;
  className: string;
} {
  if (status === "loading") {
    return {
      label: t("settings.loading"),
      className: "border-blue-7/30 bg-blue-7/10 text-blue-11",
    };
  }
  if (status === "error") {
    return {
      label: t("settings.error"),
      className: "border-red-7/30 bg-red-7/10 text-red-11",
    };
  }
  return {
    label: t("settings.idle"),
    className: "border-gray-7/30 bg-gray-4/50 text-gray-11",
  };
}

function describeEngine(info: EngineInfo | null) {
  const running = Boolean(info?.running);
  return {
    ...statusPill(running),
    lines: [
      t("settings.debug_base_url", undefined, { url: info?.baseUrl ?? "—" }),
      t("settings.debug_runtime", undefined, { runtime: info?.runtime ?? "—" }),
      t("settings.debug_pid", undefined, { pid: info?.pid ? String(info.pid) : "—" }),
      t("settings.debug_hostname", undefined, { hostname: info?.hostname ?? "—" }),
      t("settings.debug_port", undefined, { port: info?.port ? String(info.port) : "—" }),
    ],
    stdout: info?.lastStdout ?? null,
    stderr: info?.lastStderr ?? null,
    error: null as string | null,
  };
}

function describeOrchestrator(status: OrchestratorStatus | null) {
  const running = Boolean(status?.running);
  return {
    ...statusPill(running),
    lines: [
      t("settings.debug_data_dir", undefined, { path: status?.dataDir ?? "—" }),
      t("settings.debug_daemon_url", undefined, { url: status?.daemon?.baseUrl ?? "—" }),
      t("settings.debug_daemon_pid", undefined, { pid: status?.daemon?.pid ? String(status.daemon.pid) : "—" }),
      t("settings.debug_opencode_url", undefined, { url: status?.opencode?.baseUrl ?? "—" }),
      t("settings.debug_opencode_pid", undefined, { pid: status?.opencode?.pid ? String(status.opencode.pid) : "—" }),
      t("settings.debug_cli_version", undefined, { version: status?.cliVersion ?? "—" }),
    ],
    binaryTitle: status?.binaries?.opencode?.path ?? null,
    error: status?.lastError ?? null,
  };
}

function describeCcagServer(info: CcagServerInfo | null) {
  const running = Boolean(info?.running);
  return {
    ...statusPill(running),
    lines: [
      t("settings.debug_base_url", undefined, { url: info?.baseUrl ?? "—" }),
      t("settings.debug_connect_url", undefined, { url: info?.connectUrl ?? "—" }),
      t("settings.debug_lan_url", undefined, { url: info?.lanUrl ?? "—" }),
      t("settings.debug_mdns_url", undefined, { url: info?.mdnsUrl ?? "—" }),
      t("settings.debug_pid", undefined, { pid: info?.pid ? String(info.pid) : "—" }),
      t("settings.debug_remote_access", undefined, {
        value: info?.remoteAccessEnabled ? t("settings.on") : t("settings.off"),
      }),
    ],
    stdout: info?.lastStdout ?? null,
    stderr: info?.lastStderr ?? null,
    error: null as string | null,
  };
}

function describeOpencodeRouter(info: OpenCodeRouterInfo | null) {
  const running = Boolean(info?.running);
  return {
    ...statusPill(running),
    lines: [
      t("settings.debug_workspace_path", undefined, { path: info?.workspacePath ?? "—" }),
      t("settings.debug_opencode_url", undefined, { url: info?.opencodeUrl ?? "—" }),
      t("settings.debug_health_port", undefined, {
        port: info?.healthPort ? String(info.healthPort) : "—",
      }),
      t("settings.debug_pid", undefined, { pid: info?.pid ? String(info.pid) : "—" }),
      t("settings.debug_router_version", undefined, { version: info?.version ?? "—" }),
    ],
    stdout: info?.lastStdout ?? null,
    stderr: info?.lastStderr ?? null,
    running,
    error: null as string | null,
  };
}

function describeOpencodeConnect(engine: EngineInfo | null) {
  const running = Boolean(engine?.baseUrl);
  return {
    ...statusPill(running),
    lines: [
      t("settings.debug_base_url", undefined, { url: engine?.baseUrl ?? "—" }),
      t("settings.debug_project_dir", undefined, { path: engine?.projectDir ?? "—" }),
      t("settings.debug_runtime", undefined, { runtime: engine?.runtime ?? "—" }),
    ],
    metricsLines: [] as string[],
    error: null as string | null,
  };
}

export function useDebugViewModel(options: UseDebugViewModelOptions) {
  const {
    developerMode,
    ccagServerStore,
    ccagServerSnapshot,
    runtimeWorkspaceId,
    selectedWorkspaceRoot,
    setRouteError,
  } = options;

  const optionsRef = useRef(options);
  optionsRef.current = options;

  const [engineInfoState, setEngineInfoState] = useState<EngineInfo | null>(null);
  const [appBuild, setAppBuild] = useState<AppBuildInfo | null>(null);
  const [runtimeDebugStatus, setRuntimeDebugStatus] = useState<string | null>(null);
  const [sandboxProbeBusy, setSandboxProbeBusy] = useState(false);
  const [sandboxProbeResult, setSandboxProbeResult] = useState<SandboxDebugProbeResult | null>(null);
  const [sandboxProbeStatus, setSandboxProbeStatus] = useState<string | null>(null);
  const [ccagRestartBusy, setCcagRestartBusy] = useState(false);
  const [opencodeRestarting, setOpencodeRestarting] = useState(false);
  const [ccagServerRestarting, setCcagServerRestarting] = useState(false);
  const [opencodeRouterRestarting, setOpencodeRouterRestarting] = useState(false);
  const [ccagRestartStatus, setCcagRestartStatus] = useState<string | null>(null);
  const [serviceRestartError, setServiceRestartError] = useState<string | null>(null);
  const [resetModalBusy, setResetModalBusy] = useState(false);
  const [nukeConfigBusy, setNukeConfigBusy] = useState(false);
  const [nukeConfigStatus, setNukeConfigStatus] = useState<string | null>(null);
  const [engineSource, setEngineSourceState] = useState<"path" | "sidecar" | "custom">(readEngineSource);
  const [engineRuntime, setEngineRuntimeState] = useState<"direct" | "ccag-orchestrator">(readEngineRuntime);
  const [engineCustomBinPath, setEngineCustomBinPath] = useState<string>(() =>
    readStoredString(ENGINE_CUSTOM_BIN_KEY, ""),
  );
  const [developerLog, setDeveloperLog] = useState<string[]>([]);
  const [developerLogStatus, setDeveloperLogStatus] = useState<string | null>(null);

  const refreshEngineInfo = useCallback(async () => {
    if (!isDesktopRuntime()) return;
    try {
      const info = await engineInfoCmd();
      setEngineInfoState(info);
    } catch {
      setEngineInfoState(null);
    }
  }, []);

  useEffect(() => {
    if (!developerMode) return;
    void (async () => {
      if (!isDesktopRuntime()) return;
      try {
        const build = await appBuildInfoCmd();
        setAppBuild(build);
      } catch {
        setAppBuild(null);
      }
    })();
  }, [developerMode]);

  useEffect(() => {
    if (!developerMode) return;
    void refreshEngineInfo();
    const interval = window.setInterval(() => {
      void refreshEngineInfo();
    }, 10_000);
    return () => window.clearInterval(interval);
  }, [developerMode, refreshEngineInfo]);

  const pushDeveloperLog = useCallback((message: string) => {
    const timestamp = new Date().toISOString();
    setDeveloperLog((current) => {
      const next = [...current, `${timestamp} ${message}`];
      return next.length > 500 ? next.slice(next.length - 500) : next;
    });
  }, []);

  const runtimeSummary = useMemo(
    () => ({
      appVersionLabel: appBuild?.version ?? "—",
      appCommitLabel: appBuild?.gitSha ?? "—",
      orchestratorVersionLabel:
        ccagServerSnapshot.orchestratorStatusState?.cliVersion ?? "—",
      opencodeVersionLabel:
        ccagServerSnapshot.orchestratorStatusState?.binaries?.opencode?.actualVersion ?? "—",
      ccagServerVersionLabel: ccagServerSnapshot.ccagServerDiagnostics?.version ?? "—",
      opencodeRouterVersionLabel: ccagServerSnapshot.opencodeRouterInfoState?.version ?? "—",
    }),
    [
      appBuild?.gitSha,
      appBuild?.version,
      ccagServerSnapshot.opencodeRouterInfoState?.version,
      ccagServerSnapshot.ccagServerDiagnostics?.version,
      ccagServerSnapshot.orchestratorStatusState?.binaries?.opencode?.actualVersion,
      ccagServerSnapshot.orchestratorStatusState?.cliVersion,
    ],
  );

  const runtimeDebugReport = useMemo(() => {
    return {
      collectedAt: new Date().toISOString(),
      app: appBuild ?? null,
      engine: engineInfoState,
      orchestrator: ccagServerSnapshot.orchestratorStatusState,
      ccagServer: {
        hostInfo: ccagServerSnapshot.ccagServerHostInfo,
        diagnostics: ccagServerSnapshot.ccagServerDiagnostics,
        capabilities: ccagServerSnapshot.ccagServerCapabilities,
        settings: ccagServerSnapshot.ccagServerSettings,
        status: ccagServerSnapshot.ccagServerStatus,
        url: ccagServerSnapshot.ccagServerUrl,
      },
      opencodeRouter: ccagServerSnapshot.opencodeRouterInfoState,
      runtimeWorkspaceId,
      selectedWorkspaceRoot,
    };
  }, [
    appBuild,
    engineInfoState,
    ccagServerSnapshot.opencodeRouterInfoState,
    ccagServerSnapshot.ccagServerCapabilities,
    ccagServerSnapshot.ccagServerDiagnostics,
    ccagServerSnapshot.ccagServerHostInfo,
    ccagServerSnapshot.ccagServerSettings,
    ccagServerSnapshot.ccagServerStatus,
    ccagServerSnapshot.ccagServerUrl,
    ccagServerSnapshot.orchestratorStatusState,
    runtimeWorkspaceId,
    selectedWorkspaceRoot,
  ]);

  const runtimeDebugReportJson = useMemo(
    () => safeStringify(runtimeDebugReport),
    [runtimeDebugReport],
  );

  const engineCard = useMemo(() => describeEngine(engineInfoState), [engineInfoState]);
  const orchestratorCard = useMemo(
    () => describeOrchestrator(ccagServerSnapshot.orchestratorStatusState),
    [ccagServerSnapshot.orchestratorStatusState],
  );
  const ccagCard = useMemo(
    () => describeCcagServer(ccagServerSnapshot.ccagServerHostInfo),
    [ccagServerSnapshot.ccagServerHostInfo],
  );
  const opencodeRouterCard = useMemo(
    () => describeOpencodeRouter(ccagServerSnapshot.opencodeRouterInfoState),
    [ccagServerSnapshot.opencodeRouterInfoState],
  );
  const opencodeConnectCard = useMemo(
    () => describeOpencodeConnect(engineInfoState),
    [engineInfoState],
  );

  const onCopyRuntimeDebugReport = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(runtimeDebugReportJson);
      setRuntimeDebugStatus(t("settings.copied_debug_report"));
    } catch (error) {
      setRuntimeDebugStatus(error instanceof Error ? error.message : safeStringify(error));
    }
  }, [runtimeDebugReportJson]);

  const onExportRuntimeDebugReport = useCallback(async () => {
    try {
      downloadTextAsFile(
        `ccag-runtime-${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
        runtimeDebugReportJson,
        "application/json",
      );
      setRuntimeDebugStatus(t("settings.exported_debug_report"));
    } catch (error) {
      setRuntimeDebugStatus(error instanceof Error ? error.message : safeStringify(error));
    }
  }, [runtimeDebugReportJson]);

  const onClearDeveloperLog = useCallback(() => {
    setDeveloperLog([]);
    setDeveloperLogStatus("Cleared developer log.");
  }, []);

  const onCopyDeveloperLog = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(developerLog.join("\n"));
      setDeveloperLogStatus("Copied developer log to clipboard.");
    } catch (error) {
      setDeveloperLogStatus(error instanceof Error ? error.message : safeStringify(error));
    }
  }, [developerLog]);

  const onExportDeveloperLog = useCallback(async () => {
    try {
      downloadTextAsFile(
        `ccag-developer-${new Date().toISOString().replace(/[:.]/g, "-")}.log`,
        developerLog.join("\n"),
        "text/plain",
      );
      setDeveloperLogStatus("Exported developer log.");
    } catch (error) {
      setDeveloperLogStatus(error instanceof Error ? error.message : safeStringify(error));
    }
  }, [developerLog]);

  const onRunSandboxDebugProbe = useCallback(async () => {
    if (!isDesktopRuntime()) return;
    setSandboxProbeBusy(true);
    setSandboxProbeStatus(null);
    try {
      const result = await sandboxDebugProbeCmd();
      setSandboxProbeResult(result);
      setSandboxProbeStatus(
        result.ready
          ? t("settings.sandbox_probe_success")
          : (result.error ?? t("settings.sandbox_error")),
      );
      pushDeveloperLog(`sandbox probe ready=${String(result.ready)}`);
    } catch (error) {
      setSandboxProbeStatus(error instanceof Error ? error.message : safeStringify(error));
    } finally {
      setSandboxProbeBusy(false);
    }
  }, [pushDeveloperLog]);

  const onStopHost = useCallback(async () => {
    clearStartupPreference();
    setCcagRestartStatus(t("settings.startup_reset_hint"));
  }, []);

  const onResetStartupPreference = useCallback(async () => {
    clearStartupPreference();
    setCcagRestartStatus(t("settings.startup_reset_hint"));
  }, []);

  const onSetEngineSource = useCallback((value: "path" | "sidecar" | "custom") => {
    setEngineSourceState(value);
    writeStoredString(ENGINE_SOURCE_KEY, value);
  }, []);

  const onSetEngineRuntime = useCallback(
    (value: "direct" | "ccag-orchestrator") => {
      setEngineRuntimeState(value);
      writeStoredString(ENGINE_RUNTIME_KEY, value);
    },
    [],
  );

  const onPickEngineBinary = useCallback(async () => {
    if (!isDesktopRuntime()) {
      setServiceRestartError(t("settings.sandbox_requires_desktop"));
      return;
    }
    try {
      const target = await pickFile({ title: t("settings.custom_binary_label"), multiple: false });
      if (typeof target === "string" && target.trim()) {
        setEngineCustomBinPath(target);
        writeStoredString(ENGINE_CUSTOM_BIN_KEY, target);
      }
    } catch (error) {
      setServiceRestartError(error instanceof Error ? error.message : safeStringify(error));
    }
  }, []);

  const onClearEngineCustomBinPath = useCallback(() => {
    setEngineCustomBinPath("");
    clearStoredString(ENGINE_CUSTOM_BIN_KEY);
  }, []);

  const bootFullEngineStack = useCallback(async () => {
    const workspacePath = optionsRef.current.selectedWorkspaceRoot.trim();
    if (!workspacePath) {
      throw new Error(
        "Select a local workspace before starting the orchestrator/engine.",
      );
    }

    // Collect ALL local workspace paths so ccag-server is started with
    // --workspace <path> for every registered local workspace. Mirrors the
    // Solid reference (context/workspace.ts::resolveWorkspacePaths) so that
    // `client.listWorkspaces()` later returns the full set, not just the
    // active one.
    const workspacePaths = [workspacePath];
    try {
      const list = await workspaceBootstrapCmd();
      for (const entry of list?.workspaces ?? []) {
        if (entry.workspaceType === "remote") continue;
        const path = entry.path?.trim() ?? "";
        if (path && !workspacePaths.includes(path)) workspacePaths.push(path);
      }
    } catch {
      // best-effort: fall back to just the active workspace path
    }

    const info = await engineStartCmd(workspacePath, {
      runtime: "ccag-orchestrator",
      workspacePaths,
      opencodeEnableExa: readOpencodeEnableExa(),
      ccagRemoteAccess:
        optionsRef.current.ccagServerSnapshot.ccagServerSettings
          .remoteAccessEnabled === true,
    });

    // engine_start restarts ccag-server on a NEW port with --opencode-base-url
    // attached. Re-read host info and persist the new base URL + token so the
    // React route listeners pick up the fresh connection instead of the stale one.
    try {
      const hostInfo = await ccagServerInfoCmd();
      if (hostInfo?.baseUrl) {
        writeCcagServerSettings({
          urlOverride: hostInfo.baseUrl,
          token: hostInfo.ownerToken?.trim() || hostInfo.clientToken?.trim() || undefined,
          portOverride: hostInfo.port ?? undefined,
          remoteAccessEnabled: hostInfo.remoteAccessEnabled === true,
        });
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("ccag-server-settings-changed"));
        }
      }
    } catch {
      // best-effort: if this fails, the host-info poller will catch up in ~10s.
    }

    await ccagServerStore.reconnectCcagServer();
    await refreshEngineInfo();
    return info;
  }, [ccagServerStore, refreshEngineInfo]);

  const onRestartLocalServer = useCallback(async () => {
    if (!isDesktopRuntime()) return;
    setCcagRestartBusy(true);
    setServiceRestartError(null);
    setCcagRestartStatus(null);
    try {
      await bootFullEngineStack();
      setCcagRestartStatus(t("settings.restart_orchestrator"));
      pushDeveloperLog("Started orchestrator + OpenCode stack via engine_start");
    } catch (error) {
      setServiceRestartError(error instanceof Error ? error.message : safeStringify(error));
    } finally {
      setCcagRestartBusy(false);
    }
  }, [bootFullEngineStack, pushDeveloperLog]);

  const onRestartOpencode = useCallback(async () => {
    if (!isDesktopRuntime()) return;
    setOpencodeRestarting(true);
    setServiceRestartError(null);
    setCcagRestartStatus(null);
    try {
      await bootFullEngineStack();
      setCcagRestartStatus(t("settings.restart_opencode"));
      pushDeveloperLog("Restarted OpenCode via engine_start");
    } catch (error) {
      setServiceRestartError(error instanceof Error ? error.message : safeStringify(error));
    } finally {
      setOpencodeRestarting(false);
    }
  }, [bootFullEngineStack, pushDeveloperLog]);

  const onRestartCcagServer = useCallback(async () => {
    if (!isDesktopRuntime()) return;
    setCcagServerRestarting(true);
    setServiceRestartError(null);
    setCcagRestartStatus(null);
    try {
      await ccagServerRestartCmd({
        remoteAccessEnabled: ccagServerSnapshot.ccagServerSettings.remoteAccessEnabled === true,
      });
      setCcagRestartStatus(t("settings.restart_ccag_server"));
      pushDeveloperLog("Restarted ccag-server");
      await ccagServerStore.reconnectCcagServer();
    } catch (error) {
      setServiceRestartError(error instanceof Error ? error.message : safeStringify(error));
    } finally {
      setCcagServerRestarting(false);
    }
  }, [
    ccagServerSnapshot.ccagServerSettings.remoteAccessEnabled,
    ccagServerStore,
    pushDeveloperLog,
  ]);

  const onRestartOpencodeRouter = useCallback(async () => {
    if (!isDesktopRuntime()) return;
    const workspacePath = optionsRef.current.selectedWorkspaceRoot.trim();
    if (!workspacePath) {
      setServiceRestartError("Select a workspace before restarting the OpenCode Router.");
      return;
    }
    setOpencodeRouterRestarting(true);
    setServiceRestartError(null);
    setCcagRestartStatus(null);
    try {
      const info = await opencodeRouterInfoCmd().catch(() => null);
      await opencodeRouterRestartCmd({
        workspacePath,
        opencodeUrl: info?.opencodeUrl ?? undefined,
      });
      setCcagRestartStatus(t("settings.restart_opencode_router"));
      pushDeveloperLog("Restarted opencode-router");
    } catch (error) {
      setServiceRestartError(error instanceof Error ? error.message : safeStringify(error));
    } finally {
      setOpencodeRouterRestarting(false);
    }
  }, [pushDeveloperLog]);

  const onStopOpencodeRouter = useCallback(async () => {
    if (!isDesktopRuntime()) return;
    try {
      await opencodeRouterStopCmd();
      pushDeveloperLog("Stopped opencode-router");
    } catch (error) {
      setServiceRestartError(error instanceof Error ? error.message : safeStringify(error));
    }
  }, [pushDeveloperLog]);

  const onOpenResetModal = useCallback(
    (mode: ResetModalMode) => {
      if (!isDesktopRuntime()) return;
      const message =
        mode === "all"
          ? "Reset ALL CCAG app data? Open sessions and workspaces will be removed."
          : "Reset onboarding state only?";
      if (typeof window !== "undefined" && !window.confirm(message)) {
        return;
      }
      setResetModalBusy(true);
      void resetCcagState(mode)
        .then(() => {
          setCcagRestartStatus(
            mode === "all"
              ? "Reset CCAG state. Restart the app to see changes."
              : "Reset onboarding state.",
          );
          pushDeveloperLog(`reset_ccag_state mode=${mode}`);
        })
        .catch((error) => {
          setRouteError(error instanceof Error ? error.message : safeStringify(error));
        })
        .finally(() => {
          setResetModalBusy(false);
        });
    },
    [pushDeveloperLog, setRouteError],
  );

  const onNukeCcagAndOpencodeConfig = useCallback(async () => {
    if (!isDesktopRuntime()) return;
    const confirmed =
      typeof window === "undefined"
        ? true
        : window.confirm(
            "Delete ALL local CCAG + OpenCode config and quit? This cannot be undone.",
          );
    if (!confirmed) return;
    setNukeConfigBusy(true);
    setNukeConfigStatus(null);
    try {
      await nukeCcagAndOpencodeConfigAndExit();
    } catch (error) {
      setNukeConfigStatus(error instanceof Error ? error.message : safeStringify(error));
    } finally {
      setNukeConfigBusy(false);
    }
  }, []);

  const onClearWorkspaceDebugEvents = useCallback(async () => {
    setCcagRestartStatus("Workspace debug events are not retained in the React route yet.");
  }, []);

  const debugProps: DebugViewProps = useMemo(
    () => ({
      developerMode,
      busy: false,
      anyActiveRuns: false,
      startupPreference: "server",
      startupLabel:
        ccagServerSnapshot.ccagServerStatus === "connected"
          ? t("settings.ccag_server_label")
          : t("status.disconnected_label"),
      runtimeSummary,
      runtimeDebugReportJson,
      runtimeDebugStatus,
      onCopyRuntimeDebugReport,
      onExportRuntimeDebugReport,
      developerLogRecordCount: developerLog.length,
      developerLogText: developerLog.join("\n"),
      developerLogStatus,
      onClearDeveloperLog,
      onCopyDeveloperLog,
      onExportDeveloperLog,
      sandboxProbeBusy,
      sandboxProbeResult,
      sandboxProbeStatus,
      onRunSandboxDebugProbe,
      onStopHost,
      onResetStartupPreference,
      engineSource,
      onSetEngineSource,
      engineCustomBinPath,
      engineCustomBinPathLabel: engineCustomBinPath.trim() || t("settings.no_custom_path_set"),
      onPickEngineBinary,
      onClearEngineCustomBinPath,
      engineRuntime,
      onSetEngineRuntime,
      onOpenResetModal,
      resetModalBusy,
      ccagRestartBusy,
      opencodeRestarting,
      ccagServerRestarting,
      opencodeRouterRestarting,
      ccagRestartStatus,
      serviceRestartError,
      onRestartLocalServer,
      onRestartOpencode,
      onRestartCcagServer,
      onRestartOpencodeRouter,
      engineCard,
      orchestratorCard,
      opencodeConnectCard,
      ccagCard,
      opencodeRouterCard,
      onStopOpencodeRouter,
      ccagServerDiagnostics: ccagServerSnapshot.ccagServerDiagnostics,
      runtimeWorkspaceId,
      ccagServerCapabilities: ccagServerSnapshot.ccagServerCapabilities,
      pendingPermissions: {},
      events: [],
      workspaceDebugEvents: [],
      safeStringify,
      onClearWorkspaceDebugEvents,
      ccagAuditEntries: ccagServerSnapshot.ccagAuditEntries,
      ccagAuditStatus: auditStatusPill(ccagServerSnapshot.ccagAuditStatus),
      ccagAuditError: ccagServerSnapshot.ccagAuditError,
      opencodeConnectStatus: null,
      orchestratorStatus: ccagServerSnapshot.orchestratorStatusState,
      opencodeDevModeEnabled: appBuild?.ccagDevMode === true,
      nukeConfigBusy,
      nukeConfigStatus,
      onNukeCcagAndOpencodeConfig,
    }),
    [
      appBuild?.ccagDevMode,
      developerLog,
      developerLogStatus,
      developerMode,
      engineCard,
      engineCustomBinPath,
      engineRuntime,
      engineSource,
      nukeConfigBusy,
      nukeConfigStatus,
      onClearDeveloperLog,
      onClearEngineCustomBinPath,
      onClearWorkspaceDebugEvents,
      onCopyDeveloperLog,
      onCopyRuntimeDebugReport,
      onExportDeveloperLog,
      onExportRuntimeDebugReport,
      onNukeCcagAndOpencodeConfig,
      onOpenResetModal,
      onPickEngineBinary,
      onResetStartupPreference,
      onRestartLocalServer,
      onRestartOpencode,
      onRestartOpencodeRouter,
      onRestartCcagServer,
      onRunSandboxDebugProbe,
      onSetEngineRuntime,
      onSetEngineSource,
      onStopHost,
      onStopOpencodeRouter,
      opencodeConnectCard,
      opencodeRestarting,
      opencodeRouterCard,
      opencodeRouterRestarting,
      ccagCard,
      ccagRestartBusy,
      ccagRestartStatus,
      ccagServerRestarting,
      ccagServerSnapshot.ccagAuditEntries,
      ccagServerSnapshot.ccagAuditError,
      ccagServerSnapshot.ccagAuditStatus,
      ccagServerSnapshot.ccagServerCapabilities,
      ccagServerSnapshot.ccagServerDiagnostics,
      ccagServerSnapshot.ccagServerStatus,
      ccagServerSnapshot.orchestratorStatusState,
      orchestratorCard,
      resetModalBusy,
      runtimeDebugReportJson,
      runtimeDebugStatus,
      runtimeSummary,
      runtimeWorkspaceId,
      sandboxProbeBusy,
      sandboxProbeResult,
      sandboxProbeStatus,
      serviceRestartError,
    ],
  );

  return debugProps;
}
