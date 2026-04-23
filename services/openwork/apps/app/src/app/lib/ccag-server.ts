import type { Message, Part, Session, Todo } from "@opencode-ai/sdk/v2/client";
import { desktopFetch } from "./desktop";
import { isDesktopRuntime } from "../utils";
import type { ExecResult, OpencodeConfigFile, ScheduledJob, WorkspaceInfo, WorkspaceList } from "./desktop";

export type CcagServerCapabilities = {
  skills: { read: boolean; write: boolean; source: "ccag" | "opencode" };
  hub?: {
    skills?: {
      read: boolean;
      install: boolean;
      repo?: { owner: string; name: string; ref: string };
    };
  };
  plugins: { read: boolean; write: boolean };
  mcp: { read: boolean; write: boolean };
  commands: { read: boolean; write: boolean };
  config: { read: boolean; write: boolean };
  sandbox?: { enabled: boolean; backend: "none" | "docker" | "container" };
  proxy?: { opencode: boolean; opencodeRouter: boolean };
  toolProviders?: {
    browser?: {
      enabled: boolean;
      placement: "in-sandbox" | "host-machine" | "client-machine" | "external";
      mode: "none" | "headless" | "interactive";
    };
    files?: {
      injection: boolean;
      outbox: boolean;
      inboxPath: string;
      outboxPath: string;
      maxBytes: number;
    };
  };
};

export type CcagServerStatus = "connected" | "disconnected" | "limited";

export type CcagServerDiagnostics = {
  ok: boolean;
  version: string;
  uptimeMs: number;
  readOnly: boolean;
  approval: { mode: "manual" | "auto"; timeoutMs: number };
  corsOrigins: string[];
  workspaceCount: number;
  activeWorkspaceId?: string | null;
  selectedWorkspaceId?: string | null;
  workspace: CcagWorkspaceInfo | null;
  authorizedRoots: string[];
  server: { host: string; port: number; configPath?: string | null };
  tokenSource: { client: string; host: string };
};

export type CcagRuntimeServiceName = "ccag-server" | "opencode" | "opencode-router";

export type CcagRuntimeServiceSnapshot = {
  name: CcagRuntimeServiceName;
  enabled: boolean;
  running: boolean;
  targetVersion: string | null;
  actualVersion: string | null;
  upgradeAvailable: boolean;
};

export type CcagRuntimeSnapshot = {
  ok: boolean;
  orchestrator?: {
    version: string;
    startedAt: number;
  };
  worker?: {
    workspace: string;
    sandboxMode: string;
  };
  upgrade?: {
    status: "idle" | "running" | "failed";
    startedAt: number | null;
    finishedAt: number | null;
    error: string | null;
    operationId: string | null;
    services: CcagRuntimeServiceName[];
  };
  services: CcagRuntimeServiceSnapshot[];
};

export type CcagServerSettings = {
  urlOverride?: string;
  portOverride?: number;
  token?: string;
  remoteAccessEnabled?: boolean;
};

export type CcagWorkspaceInfo = WorkspaceInfo & {
  opencode?: {
    baseUrl?: string;
    directory?: string;
    username?: string;
    password?: string;
  };
};

export type CcagWorkspaceList = {
  items: CcagWorkspaceInfo[];
  workspaces?: WorkspaceInfo[];
  activeId?: string | null;
};

export type CcagSessionMessage = {
  info: Message;
  parts: Part[];
};

export type CcagSessionSnapshot = {
  session: Session;
  messages: CcagSessionMessage[];
  todos: Todo[];
  status:
    | { type: "idle" }
    | { type: "busy" }
    | { type: "retry"; attempt: number; message: string; next: number };
};

export type CcagPluginItem = {
  spec: string;
  source: "config" | "dir.project" | "dir.global";
  scope: "project" | "global";
  path?: string;
};

export type CcagSkillItem = {
  name: string;
  path: string;
  description: string;
  scope: "project" | "global";
  trigger?: string;
};

export type CcagSkillContent = {
  item: CcagSkillItem;
  content: string;
};

export type CcagHubSkillItem = {
  name: string;
  description: string;
  trigger?: string;
  source: {
    owner: string;
    repo: string;
    ref: string;
    path: string;
  };
};

export type CcagHubRepo = {
  owner?: string;
  repo?: string;
  ref?: string;
};

export type CcagWorkspaceFileContent = {
  path: string;
  content: string;
  bytes: number;
  updatedAt: number;
};

export type CcagWorkspaceFileWriteResult = {
  ok: boolean;
  path: string;
  bytes: number;
  updatedAt: number;
  revision?: string;
};

export type CcagCommandItem = {
  name: string;
  description?: string;
  template: string;
  agent?: string;
  model?: string | null;
  subtask?: boolean;
  scope: "workspace" | "global";
};

export type CcagMcpItem = {
  name: string;
  config: Record<string, unknown>;
  source: "config.project" | "config.global" | "config.remote";
  disabledByTools?: boolean;
};

export type CcagOpenCodeRouterTelegramResult = {
  ok: boolean;
  persisted?: boolean;
  applied?: boolean;
  applyError?: string;
  applyStatus?: number;
  telegram?: {
    configured: boolean;
    enabled: boolean;
    applied?: boolean;
    starting?: boolean;
    error?: string;
  };
};

export type CcagOpenCodeRouterSlackResult = {
  ok: boolean;
  persisted?: boolean;
  applied?: boolean;
  applyError?: string;
  applyStatus?: number;
  slack?: {
    configured: boolean;
    enabled: boolean;
    applied?: boolean;
    starting?: boolean;
    error?: string;
  };
};

export type CcagOpenCodeRouterTelegramBotInfo = {
  id: number;
  username?: string;
  name?: string;
};

export type CcagOpenCodeRouterTelegramInfo = {
  ok: boolean;
  configured: boolean;
  enabled: boolean;
  bot: CcagOpenCodeRouterTelegramBotInfo | null;
};

export type CcagOpenCodeRouterTelegramEnabledResult = {
  ok: boolean;
  persisted?: boolean;
  enabled: boolean;
  applied?: boolean;
  applyError?: string;
  applyStatus?: number;
};

export type CcagOpenCodeRouterHealthSnapshot = {
  ok: boolean;
  opencode: {
    url: string;
    healthy: boolean;
    version?: string;
  };
  channels: {
    telegram: boolean;
    whatsapp: boolean;
    slack: boolean;
  };
  config: {
    groupsEnabled: boolean;
  };
  activity?: {
    dayStart: number;
    inboundToday: number;
    outboundToday: number;
    lastInboundAt?: number;
    lastOutboundAt?: number;
    lastMessageAt?: number;
  };
  agent?: {
    scope: "workspace";
    path: string;
    loaded: boolean;
    selected?: string;
  };
};

export type CcagOpenCodeRouterBindingItem = {
  channel: string;
  identityId: string;
  peerId: string;
  directory: string;
  updatedAt?: number;
};

export type CcagOpenCodeRouterBindingsResult = {
  ok: boolean;
  items: CcagOpenCodeRouterBindingItem[];
};

export type CcagOpenCodeRouterBindingUpdateResult = {
  ok: boolean;
};

export type CcagOpenCodeRouterSendResult = {
  ok: boolean;
  channel: string;
  identityId?: string;
  directory: string;
  peerId?: string;
  attempted: number;
  sent: number;
  failures?: Array<{ identityId: string; peerId: string; error: string }>;
  reason?: string;
};

export type CcagOpenCodeRouterIdentityItem = {
  id: string;
  enabled: boolean;
  running: boolean;
  access?: "public" | "private";
  pairingRequired?: boolean;
};

export type CcagOpenCodeRouterTelegramIdentitiesResult = {
  ok: boolean;
  items: CcagOpenCodeRouterIdentityItem[];
};

export type CcagOpenCodeRouterSlackIdentitiesResult = {
  ok: boolean;
  items: CcagOpenCodeRouterIdentityItem[];
};

export type CcagOpenCodeRouterTelegramIdentityUpsertResult = {
  ok: boolean;
  persisted?: boolean;
  applied?: boolean;
  applyError?: string;
  applyStatus?: number;
  telegram?: {
    id: string;
    enabled: boolean;
    access?: "public" | "private";
    pairingRequired?: boolean;
    pairingCode?: string;
    applied?: boolean;
    starting?: boolean;
    error?: string;
    bot?: CcagOpenCodeRouterTelegramBotInfo | null;
  };
};

export type CcagOpenCodeRouterSlackIdentityUpsertResult = {
  ok: boolean;
  persisted?: boolean;
  applied?: boolean;
  applyError?: string;
  applyStatus?: number;
  slack?: {
    id: string;
    enabled: boolean;
    applied?: boolean;
    starting?: boolean;
    error?: string;
  };
};

export type CcagOpenCodeRouterTelegramIdentityDeleteResult = {
  ok: boolean;
  persisted?: boolean;
  deleted?: boolean;
  applied?: boolean;
  applyError?: string;
  applyStatus?: number;
  telegram?: {
    id: string;
    deleted: boolean;
  };
};

export type CcagOpenCodeRouterSlackIdentityDeleteResult = {
  ok: boolean;
  persisted?: boolean;
  deleted?: boolean;
  applied?: boolean;
  applyError?: string;
  applyStatus?: number;
  slack?: {
    id: string;
    deleted: boolean;
  };
};

export type CcagWorkspaceExport = {
  workspaceId: string;
  exportedAt: number;
  opencode?: Record<string, unknown>;
  ccag?: Record<string, unknown>;
  skills?: Array<{ name: string; description?: string; trigger?: string; content: string }>;
  commands?: Array<{ name: string; description?: string; template?: string }>;
  files?: Array<{ path: string; content: string }>;
};

export type CcagWorkspaceExportSensitiveMode = "auto" | "include" | "exclude";

export type CcagWorkspaceExportWarning = {
  id: string;
  label: string;
  detail: string;
};

export type CcagBlueprintSessionsMaterializeResult = {
  ok: boolean;
  created: Array<{ templateId: string; sessionId: string; title: string }>;
  existing: Array<{ templateId: string; sessionId: string }>;
  openSessionId: string | null;
};

export type CcagArtifactItem = {
  id: string;
  name?: string;
  path?: string;
  size?: number;
  createdAt?: number;
  updatedAt?: number;
  mime?: string;
};

export type CcagArtifactList = {
  items: CcagArtifactItem[];
};

export type CcagInboxItem = {
  id: string;
  name?: string;
  path?: string;
  size?: number;
  updatedAt?: number;
};

export type CcagInboxList = {
  items: CcagInboxItem[];
};

export type CcagInboxUploadResult = {
  ok: boolean;
  path: string;
  bytes: number;
};

type RawJsonResponse<T> = {
  ok: boolean;
  status: number;
  json: T | null;
};

export type CcagActor = {
  type: "remote" | "host";
  clientId?: string;
  tokenHash?: string;
};

export type CcagAuditEntry = {
  id: string;
  workspaceId: string;
  actor: CcagActor;
  action: string;
  target: string;
  summary: string;
  timestamp: number;
};

export type CcagReloadTrigger = {
  type: "skill" | "plugin" | "config" | "mcp" | "agent" | "command";
  name?: string;
  action?: "added" | "removed" | "updated";
  path?: string;
};

export type CcagReloadEvent = {
  id: string;
  seq: number;
  workspaceId: string;
  reason: "plugins" | "skills" | "mcp" | "config" | "agents" | "commands";
  trigger?: CcagReloadTrigger;
  timestamp: number;
};

// Fallback for explicit server-mode URL derivation. Desktop local workers replace this
// with the persisted runtime-discovered port once the host reports it.
export const DEFAULT_CCAG_SERVER_PORT = 8787;

const STORAGE_URL_OVERRIDE = "ccag.server.urlOverride";
const STORAGE_PORT_OVERRIDE = "ccag.server.port";
const STORAGE_TOKEN = "ccag.server.token";
const STORAGE_REMOTE_ACCESS = "ccag.server.remoteAccessEnabled";

export function normalizeCcagServerUrl(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const withProtocol = /^https?:\/\//.test(trimmed) ? trimmed : `http://${trimmed}`;
  return withProtocol.replace(/\/+$/, "");
}

export function parseCcagWorkspaceIdFromUrl(input: string) {
  const normalized = normalizeCcagServerUrl(input) ?? "";
  if (!normalized) return null;

  try {
    const url = new URL(normalized);
    const segments = url.pathname.split("/").filter(Boolean);
    const last = segments[segments.length - 1] ?? "";
    const prev = segments[segments.length - 2] ?? "";
    if (prev !== "w" || !last) return null;
    return decodeURIComponent(last);
  } catch {
    const match = normalized.match(/\/w\/([^/?#]+)/);
    if (!match?.[1]) return null;
    try {
      return decodeURIComponent(match[1]);
    } catch {
      return match[1];
    }
  }
}

export function buildCcagWorkspaceBaseUrl(hostUrl: string, workspaceId?: string | null) {
  const normalized = normalizeCcagServerUrl(hostUrl) ?? "";
  if (!normalized) return null;

  try {
    const url = new URL(normalized);
    const segments = url.pathname.split("/").filter(Boolean);
    const last = segments[segments.length - 1] ?? "";
    const prev = segments[segments.length - 2] ?? "";
    const alreadyMounted = prev === "w" && Boolean(last);
    if (alreadyMounted) {
      return url.toString().replace(/\/+$/, "");
    }

    const id = (workspaceId ?? "").trim();
    if (!id) return url.toString().replace(/\/+$/, "");

    const basePath = url.pathname.replace(/\/+$/, "");
    url.pathname = `${basePath}/w/${encodeURIComponent(id)}`;
    return url.toString().replace(/\/+$/, "");
  } catch {
    const id = (workspaceId ?? "").trim();
    if (!id) return normalized;
    return `${normalized.replace(/\/+$/, "")}/w/${encodeURIComponent(id)}`;
  }
}

const CCAG_INVITE_PARAM_URL = "ow_url";
const CCAG_INVITE_PARAM_TOKEN = "ow_token";
const CCAG_INVITE_PARAM_STARTUP = "ow_startup";
const CCAG_INVITE_PARAM_AUTO_CONNECT = "ow_auto_connect";

export type CcagConnectInvite = {
  url: string;
  token?: string;
  startup?: "server";
  autoConnect?: boolean;
};

export function readCcagConnectInviteFromSearch(input: string | URLSearchParams) {
  const search =
    typeof input === "string"
      ? new URLSearchParams(input.startsWith("?") ? input.slice(1) : input)
      : input;

  const rawUrl = search.get(CCAG_INVITE_PARAM_URL)?.trim() ?? "";
  const url = normalizeCcagServerUrl(rawUrl);
  if (!url) return null;

  const token = search.get(CCAG_INVITE_PARAM_TOKEN)?.trim() ?? "";
  const startupRaw = search.get(CCAG_INVITE_PARAM_STARTUP)?.trim() ?? "";
  const startup = startupRaw === "server" ? "server" : undefined;
  const autoConnect = search.get(CCAG_INVITE_PARAM_AUTO_CONNECT)?.trim() === "1";

  return {
    url,
    token: token || undefined,
    startup,
    autoConnect: autoConnect || undefined,
  } satisfies CcagConnectInvite;
}

export function stripCcagConnectInviteFromUrl(input: string) {
  try {
    const url = new URL(input);
    url.searchParams.delete(CCAG_INVITE_PARAM_URL);
    url.searchParams.delete(CCAG_INVITE_PARAM_TOKEN);
    url.searchParams.delete(CCAG_INVITE_PARAM_STARTUP);
    url.searchParams.delete(CCAG_INVITE_PARAM_AUTO_CONNECT);
    return url.toString();
  } catch {
    return input;
  }
}

export function readCcagServerSettings(): CcagServerSettings {
  if (typeof window === "undefined") return {};
  try {
    const urlOverride = normalizeCcagServerUrl(
      window.localStorage.getItem(STORAGE_URL_OVERRIDE) ?? "",
    );
    const portRaw = window.localStorage.getItem(STORAGE_PORT_OVERRIDE) ?? "";
    const portOverride = portRaw ? Number(portRaw) : undefined;
    const token = window.localStorage.getItem(STORAGE_TOKEN) ?? undefined;
    const remoteAccessRaw = window.localStorage.getItem(STORAGE_REMOTE_ACCESS) ?? "";
    return {
      urlOverride: urlOverride ?? undefined,
      portOverride: Number.isNaN(portOverride) ? undefined : portOverride,
      token: token?.trim() || undefined,
      remoteAccessEnabled: remoteAccessRaw === "1",
    };
  } catch {
    return {};
  }
}

export function writeCcagServerSettings(next: CcagServerSettings): CcagServerSettings {
  if (typeof window === "undefined") return next;
  try {
    const urlOverride = normalizeCcagServerUrl(next.urlOverride ?? "");
    const portOverride = typeof next.portOverride === "number" ? next.portOverride : undefined;
    const token = next.token?.trim() || undefined;
    const remoteAccessEnabled = next.remoteAccessEnabled === true;

    if (urlOverride) {
      window.localStorage.setItem(STORAGE_URL_OVERRIDE, urlOverride);
    } else {
      window.localStorage.removeItem(STORAGE_URL_OVERRIDE);
    }

    if (typeof portOverride === "number" && !Number.isNaN(portOverride)) {
      window.localStorage.setItem(STORAGE_PORT_OVERRIDE, String(portOverride));
    } else {
      window.localStorage.removeItem(STORAGE_PORT_OVERRIDE);
    }

    if (token) {
      window.localStorage.setItem(STORAGE_TOKEN, token);
    } else {
      window.localStorage.removeItem(STORAGE_TOKEN);
    }

    if (remoteAccessEnabled) {
      window.localStorage.setItem(STORAGE_REMOTE_ACCESS, "1");
    } else {
      window.localStorage.removeItem(STORAGE_REMOTE_ACCESS);
    }

    return readCcagServerSettings();
  } catch {
    return next;
  }
}

export function hydrateCcagServerSettingsFromEnv() {
  if (typeof window === "undefined") return;

  const envUrl = typeof import.meta.env?.VITE_CCAG_URL === "string"
    ? import.meta.env.VITE_CCAG_URL.trim()
    : "";
  const envPort = typeof import.meta.env?.VITE_CCAG_PORT === "string"
    ? import.meta.env.VITE_CCAG_PORT.trim()
    : "";
  const envToken = typeof import.meta.env?.VITE_CCAG_TOKEN === "string"
    ? import.meta.env.VITE_CCAG_TOKEN.trim()
    : "";

  if (!envUrl && !envPort && !envToken) return;

  try {
    const current = readCcagServerSettings();
    const next: CcagServerSettings = { ...current };
    let changed = false;

    if (!current.urlOverride && envUrl) {
      next.urlOverride = normalizeCcagServerUrl(envUrl) ?? undefined;
      changed = true;
    }

    if (!current.portOverride && envPort) {
      const parsed = Number(envPort);
      if (Number.isFinite(parsed) && parsed > 0) {
        next.portOverride = parsed;
        changed = true;
      }
    }

    if (!current.token && envToken) {
      next.token = envToken;
      changed = true;
    }

    if (changed) {
      writeCcagServerSettings(next);
    }
  } catch {
    // ignore
  }
}

export function clearCcagServerSettings() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_URL_OVERRIDE);
    window.localStorage.removeItem(STORAGE_PORT_OVERRIDE);
    window.localStorage.removeItem(STORAGE_TOKEN);
    window.localStorage.removeItem(STORAGE_REMOTE_ACCESS);
  } catch {
    // ignore
  }
}

export class CcagServerError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function buildHeaders(
  token?: string,
  hostToken?: string,
  extra?: Record<string, string>,
) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (hostToken) {
    headers["X-CCAG-Host-Token"] = hostToken;
  }
  if (extra) {
    Object.assign(headers, extra);
  }
  return headers;
}

function buildAuthHeaders(token?: string, hostToken?: string, extra?: Record<string, string>) {
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (hostToken) {
    headers["X-CCAG-Host-Token"] = hostToken;
  }
  if (extra) {
    Object.assign(headers, extra);
  }
  return headers;
}

// Use Tauri's fetch when running in the desktop app to avoid CORS issues.
// Stream URLs (SSE) bypass the plugin because its `fetch_read_body` IPC call
// blocks until the body closes — that freezes the webview for infinite bodies.
const CCAG_STREAM_URL_RE = /\/events(\b|\?)|\/event-stream\b|\/stream\b/;

function isStreamUrl(url: string): boolean {
  return CCAG_STREAM_URL_RE.test(url);
}

const resolveFetch = (url?: string) => {
  if (!isDesktopRuntime()) return globalThis.fetch;
  if (url && isStreamUrl(url)) {
    return typeof window !== "undefined" ? window.fetch.bind(window) : globalThis.fetch;
  }
  return desktopFetch;
};

const DEFAULT_CCAG_SERVER_TIMEOUT_MS = 10_000;

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

async function fetchWithTimeout(
  fetchImpl: FetchLike,
  url: string,
  init: RequestInit,
  timeoutMs: number,
) {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return fetchImpl(url, init);
  }

  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const signal = controller?.signal;
  const initWithSignal = signal && !init.signal ? { ...init, signal } : init;

  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      try {
        controller?.abort();
      } catch {
        // ignore
      }
      reject(new Error("Request timed out."));
    }, timeoutMs);
  });

  try {
    return await Promise.race([fetchImpl(url, initWithSignal), timeoutPromise]);
  } catch (error) {
    const name = (error && typeof error === "object" && "name" in error ? (error as any).name : "") as string;
    if (name === "AbortError") {
      throw new Error("Request timed out.");
    }
    throw error;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

async function requestJson<T>(
  baseUrl: string,
  path: string,
  options: { method?: string; token?: string; hostToken?: string; body?: unknown; timeoutMs?: number } = {},
): Promise<T> {
  const url = `${baseUrl}${path}`;
  const fetchImpl = resolveFetch(url);
  const response = await fetchWithTimeout(
    fetchImpl,
    url,
    {
      method: options.method ?? "GET",
      headers: buildHeaders(options.token, options.hostToken),
      body: options.body ? JSON.stringify(options.body) : undefined,
    },
    options.timeoutMs ?? DEFAULT_CCAG_SERVER_TIMEOUT_MS,
  );

  const text = await response.text();
  const json = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const code = typeof json?.code === "string" ? json.code : "request_failed";
    const message = typeof json?.message === "string" ? json.message : response.statusText;
    throw new CcagServerError(response.status, code, message, json?.details);
  }

  return json as T;
}

async function requestJsonRaw<T>(
  baseUrl: string,
  path: string,
  options: { method?: string; token?: string; hostToken?: string; body?: unknown; timeoutMs?: number } = {},
): Promise<RawJsonResponse<T>> {
  const url = `${baseUrl}${path}`;
  const fetchImpl = resolveFetch(url);
  const response = await fetchWithTimeout(
    fetchImpl,
    url,
    {
      method: options.method ?? "GET",
      headers: buildHeaders(options.token, options.hostToken),
      body: options.body ? JSON.stringify(options.body) : undefined,
    },
    options.timeoutMs ?? DEFAULT_CCAG_SERVER_TIMEOUT_MS,
  );

  const text = await response.text();
  let json: T | null = null;
  try {
    json = text ? (JSON.parse(text) as T) : null;
  } catch {
    json = null;
  }

  return { ok: response.ok, status: response.status, json };
}

async function requestMultipartRaw(
  baseUrl: string,
  path: string,
  options: { method?: string; token?: string; hostToken?: string; body?: FormData; timeoutMs?: number } = {},
): Promise<{ ok: boolean; status: number; text: string }>{
  const url = `${baseUrl}${path}`;
  const fetchImpl = resolveFetch(url);
  const response = await fetchWithTimeout(
    fetchImpl,
    url,
    {
      method: options.method ?? "POST",
      headers: buildAuthHeaders(options.token, options.hostToken),
      body: options.body,
    },
    options.timeoutMs ?? DEFAULT_CCAG_SERVER_TIMEOUT_MS,
  );
  const text = await response.text();
  return { ok: response.ok, status: response.status, text };
}

async function requestBinary(
  baseUrl: string,
  path: string,
  options: { method?: string; token?: string; hostToken?: string; timeoutMs?: number } = {},
): Promise<{ data: ArrayBuffer; contentType: string | null; filename: string | null }>{
  const url = `${baseUrl}${path}`;
  const fetchImpl = resolveFetch(url);
  const response = await fetchWithTimeout(
    fetchImpl,
    url,
    {
      method: options.method ?? "GET",
      headers: buildAuthHeaders(options.token, options.hostToken),
    },
    options.timeoutMs ?? DEFAULT_CCAG_SERVER_TIMEOUT_MS,
  );

  if (!response.ok) {
    const text = await response.text();
    let json: any = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    const code = typeof json?.code === "string" ? json.code : "request_failed";
    const message = typeof json?.message === "string" ? json.message : response.statusText;
    throw new CcagServerError(response.status, code, message, json?.details);
  }

  const contentType = response.headers.get("content-type");
  const disposition = response.headers.get("content-disposition") ?? "";
  const filenameMatch = disposition.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i);
  const filenameRaw = filenameMatch?.[1] ?? filenameMatch?.[2] ?? null;
  const filename = filenameRaw ? decodeURIComponent(filenameRaw) : null;
  const data = await response.arrayBuffer();
  return { data, contentType, filename };
}

export function createCcagServerClient(options: { baseUrl: string; token?: string; hostToken?: string }) {
  const baseUrl = options.baseUrl.replace(/\/+$/, "");
  const token = options.token;
  const hostToken = options.hostToken;

  const timeouts = {
    health: 3_000,
    capabilities: 6_000,
    listWorkspaces: 8_000,
    activateWorkspace: 10_000,
    deleteWorkspace: 10_000,
    deleteSession: 12_000,
    sessionRead: 12_000,
    status: 6_000,
    config: 10_000,
    opencodeRouter: 10_000,
    workspaceExport: 30_000,
    workspaceImport: 30_000,
    shareBundle: 20_000,
    binary: 60_000,
  };

  return {
    baseUrl,
    token,
    health: () =>
      requestJson<{ ok: boolean; version: string; uptimeMs: number }>(baseUrl, "/health", { token, hostToken, timeoutMs: timeouts.health }),
    runtimeVersions: () =>
      requestJson<CcagRuntimeSnapshot>(baseUrl, "/runtime/versions", { token, hostToken, timeoutMs: timeouts.status }),
    status: () => requestJson<CcagServerDiagnostics>(baseUrl, "/status", { token, hostToken, timeoutMs: timeouts.status }),
    capabilities: () => requestJson<CcagServerCapabilities>(baseUrl, "/capabilities", { token, hostToken, timeoutMs: timeouts.capabilities }),
    opencodeRouterHealth: () =>
      requestJsonRaw<CcagOpenCodeRouterHealthSnapshot>(baseUrl, "/opencode-router/health", { token, hostToken, timeoutMs: timeouts.opencodeRouter }),
    getOpenCodeRouterHealth: (workspaceId: string) =>
      requestJsonRaw<CcagOpenCodeRouterHealthSnapshot>(
        baseUrl,
        `/workspace/${encodeURIComponent(workspaceId)}/opencode-router/health`,
        { token, hostToken, timeoutMs: timeouts.opencodeRouter },
      ),
    opencodeRouterBindings: (filters?: { channel?: string; identityId?: string }) => {
      const search = new URLSearchParams();
      if (filters?.channel?.trim()) search.set("channel", filters.channel.trim());
      if (filters?.identityId?.trim()) search.set("identityId", filters.identityId.trim());
      const suffix = search.toString();
      const path = suffix ? `/opencode-router/bindings?${suffix}` : "/opencode-router/bindings";
      return requestJsonRaw<CcagOpenCodeRouterBindingsResult>(baseUrl, path, { token, hostToken, timeoutMs: timeouts.opencodeRouter });
    },
    opencodeRouterTelegramIdentities: () =>
      requestJsonRaw<CcagOpenCodeRouterTelegramIdentitiesResult>(baseUrl, "/opencode-router/identities/telegram", { token, hostToken, timeoutMs: timeouts.opencodeRouter }),
    opencodeRouterSlackIdentities: () =>
      requestJsonRaw<CcagOpenCodeRouterSlackIdentitiesResult>(baseUrl, "/opencode-router/identities/slack", { token, hostToken, timeoutMs: timeouts.opencodeRouter }),
    listWorkspaces: () => requestJson<CcagWorkspaceList>(baseUrl, "/workspaces", { token, hostToken, timeoutMs: timeouts.listWorkspaces }),
    createLocalWorkspace: (payload: { folderPath: string; name: string; preset: string }) =>
      requestJson<WorkspaceList>(baseUrl, "/workspaces/local", {
        token,
        hostToken,
        method: "POST",
        body: payload,
        timeoutMs: timeouts.activateWorkspace,
      }),
    updateWorkspaceDisplayName: (workspaceId: string, displayName: string | null) =>
      requestJson<WorkspaceList>(baseUrl, `/workspaces/${encodeURIComponent(workspaceId)}/display-name`, {
        token,
        hostToken,
        method: "PATCH",
        body: { displayName },
        timeoutMs: timeouts.activateWorkspace,
      }),
    activateWorkspace: (workspaceId: string) =>
      requestJson<{ activeId: string; workspace: CcagWorkspaceInfo }>(
        baseUrl,
        `/workspaces/${encodeURIComponent(workspaceId)}/activate`,
        { token, hostToken, method: "POST", timeoutMs: timeouts.activateWorkspace },
      ),
    deleteWorkspace: (workspaceId: string) =>
      requestJson<{ ok: boolean; deleted: boolean; persisted: boolean; activeId: string | null; items: CcagWorkspaceInfo[]; workspaces?: WorkspaceInfo[] }>(
        baseUrl,
        `/workspaces/${encodeURIComponent(workspaceId)}`,
        { token, hostToken, method: "DELETE", timeoutMs: timeouts.deleteWorkspace },
      ),
    deleteSession: (workspaceId: string, sessionId: string) =>
      requestJson<{ ok: boolean }>(
        baseUrl,
        `/workspace/${encodeURIComponent(workspaceId)}/sessions/${encodeURIComponent(sessionId)}`,
        { token, hostToken, method: "DELETE", timeoutMs: timeouts.deleteSession },
      ),
    listSessions: (
      workspaceId: string,
      options?: { roots?: boolean; start?: number; search?: string; limit?: number },
    ) => {
      const query = new URLSearchParams();
      if (typeof options?.roots === "boolean") query.set("roots", String(options.roots));
      if (typeof options?.start === "number") query.set("start", String(options.start));
      if (options?.search?.trim()) query.set("search", options.search.trim());
      if (typeof options?.limit === "number") query.set("limit", String(options.limit));
      const suffix = query.size ? `?${query.toString()}` : "";
      return requestJson<{ items: Session[] }>(
        baseUrl,
        `/workspace/${encodeURIComponent(workspaceId)}/sessions${suffix}`,
        { token, hostToken, timeoutMs: timeouts.sessionRead },
      );
    },
    getSession: (workspaceId: string, sessionId: string) =>
      requestJson<{ item: Session }>(
        baseUrl,
        `/workspace/${encodeURIComponent(workspaceId)}/sessions/${encodeURIComponent(sessionId)}`,
        { token, hostToken, timeoutMs: timeouts.sessionRead },
      ),
    getSessionMessages: (workspaceId: string, sessionId: string, options?: { limit?: number }) => {
      const query = new URLSearchParams();
      if (typeof options?.limit === "number") query.set("limit", String(options.limit));
      const suffix = query.size ? `?${query.toString()}` : "";
      return requestJson<{ items: CcagSessionMessage[] }>(
        baseUrl,
        `/workspace/${encodeURIComponent(workspaceId)}/sessions/${encodeURIComponent(sessionId)}/messages${suffix}`,
        { token, hostToken, timeoutMs: timeouts.sessionRead },
      );
    },
    getSessionSnapshot: (workspaceId: string, sessionId: string, options?: { limit?: number }) => {
      const query = new URLSearchParams();
      if (typeof options?.limit === "number") query.set("limit", String(options.limit));
      const suffix = query.size ? `?${query.toString()}` : "";
      return requestJson<{ item: CcagSessionSnapshot }>(
        baseUrl,
        `/workspace/${encodeURIComponent(workspaceId)}/sessions/${encodeURIComponent(sessionId)}/snapshot${suffix}`,
        { token, hostToken, timeoutMs: timeouts.sessionRead },
      );
    },
    exportWorkspace: (
      workspaceId: string,
      options?: { sensitiveMode?: CcagWorkspaceExportSensitiveMode },
    ) => {
      const query = new URLSearchParams();
      if (options?.sensitiveMode) {
        query.set("sensitive", options.sensitiveMode);
      }
      const suffix = query.size ? `?${query.toString()}` : "";
      return requestJson<CcagWorkspaceExport>(baseUrl, `/workspace/${encodeURIComponent(workspaceId)}/export${suffix}`, {
        token,
        hostToken,
        timeoutMs: timeouts.workspaceExport,
      });
    },
    importWorkspace: (workspaceId: string, payload: Record<string, unknown>) =>
      requestJson<{ ok: boolean }>(baseUrl, `/workspace/${encodeURIComponent(workspaceId)}/import`, {
        token,
        hostToken,
        method: "POST",
        body: payload,
        timeoutMs: timeouts.workspaceImport,
      }),
    materializeBlueprintSessions: (workspaceId: string) =>
      requestJson<CcagBlueprintSessionsMaterializeResult>(
        baseUrl,
        `/workspace/${encodeURIComponent(workspaceId)}/blueprint/sessions/materialize`,
        {
          token,
          hostToken,
          method: "POST",
          timeoutMs: timeouts.workspaceImport,
        },
      ),
    publishBundle: (payload: unknown, bundleType: "skill" | "workspace-profile" | "skills-set", options?: { name?: string; timeoutMs?: number }) =>
      requestJson<{ url: string }>(baseUrl, "/share/bundles/publish", {
        token,
        hostToken,
        method: "POST",
        body: {
          payload,
          bundleType,
          name: options?.name,
          timeoutMs: options?.timeoutMs,
        },
        timeoutMs: options?.timeoutMs ?? timeouts.shareBundle,
      }),
    fetchBundle: (bundleUrl: string, options?: { timeoutMs?: number }) =>
      requestJson<Record<string, unknown>>(baseUrl, "/share/bundles/fetch", {
        token,
        hostToken,
        method: "POST",
        body: {
          bundleUrl,
          timeoutMs: options?.timeoutMs,
        },
        timeoutMs: options?.timeoutMs ?? timeouts.shareBundle,
      }),
    getConfig: (workspaceId: string) =>
      requestJson<{ opencode: Record<string, unknown>; ccag: Record<string, unknown>; updatedAt?: number | null }>(
        baseUrl,
        `/workspace/${workspaceId}/config`,
        { token, hostToken, timeoutMs: timeouts.config },
      ),
    setOpenCodeRouterTelegramToken: (
      workspaceId: string,
      tokenValue: string,
    ) =>
      requestJson<CcagOpenCodeRouterTelegramResult>(
        baseUrl,
        `/workspace/${encodeURIComponent(workspaceId)}/opencode-router/telegram-token`,
        {
          token,
          hostToken,
          method: "POST",
          body: { token: tokenValue },
          timeoutMs: timeouts.opencodeRouter,
        },
      ),
    setOpenCodeRouterSlackTokens: (
      workspaceId: string,
      botToken: string,
      appToken: string,
    ) =>
      requestJson<CcagOpenCodeRouterSlackResult>(
        baseUrl,
        `/workspace/${encodeURIComponent(workspaceId)}/opencode-router/slack-tokens`,
        {
          token,
          hostToken,
          method: "POST",
          body: { botToken, appToken },
          timeoutMs: timeouts.opencodeRouter,
        },
      ),
    getOpenCodeRouterTelegram: (workspaceId: string) =>
      requestJson<CcagOpenCodeRouterTelegramInfo>(
        baseUrl,
        `/workspace/${encodeURIComponent(workspaceId)}/opencode-router/telegram`,
        { token, hostToken, timeoutMs: timeouts.opencodeRouter },
      ),
    getOpenCodeRouterTelegramIdentities: (workspaceId: string) =>
      requestJson<CcagOpenCodeRouterTelegramIdentitiesResult>(
        baseUrl,
        `/workspace/${encodeURIComponent(workspaceId)}/opencode-router/identities/telegram`,
        { token, hostToken, timeoutMs: timeouts.opencodeRouter },
      ),
    upsertOpenCodeRouterTelegramIdentity: (
      workspaceId: string,
      input: { id?: string; token: string; enabled?: boolean; access?: "public" | "private"; pairingCode?: string },
    ) =>
      requestJson<CcagOpenCodeRouterTelegramIdentityUpsertResult>(
        baseUrl,
        `/workspace/${encodeURIComponent(workspaceId)}/opencode-router/identities/telegram`,
        {
          token,
          hostToken,
          method: "POST",
          body: {
            ...(input.id?.trim() ? { id: input.id.trim() } : {}),
            token: input.token,
            ...(typeof input.enabled === "boolean" ? { enabled: input.enabled } : {}),
            ...(input.access ? { access: input.access } : {}),
            ...(input.pairingCode?.trim() ? { pairingCode: input.pairingCode.trim() } : {}),
          },
        },
      ),
    deleteOpenCodeRouterTelegramIdentity: (workspaceId: string, identityId: string) =>
      requestJson<CcagOpenCodeRouterTelegramIdentityDeleteResult>(
        baseUrl,
        `/workspace/${encodeURIComponent(workspaceId)}/opencode-router/identities/telegram/${encodeURIComponent(identityId)}`,
        { token, hostToken, method: "DELETE" },
      ),
    getOpenCodeRouterSlackIdentities: (workspaceId: string) =>
      requestJson<CcagOpenCodeRouterSlackIdentitiesResult>(
        baseUrl,
        `/workspace/${encodeURIComponent(workspaceId)}/opencode-router/identities/slack`,
        { token, hostToken },
      ),
    upsertOpenCodeRouterSlackIdentity: (
      workspaceId: string,
      input: { id?: string; botToken: string; appToken: string; enabled?: boolean },
    ) =>
      requestJson<CcagOpenCodeRouterSlackIdentityUpsertResult>(
        baseUrl,
        `/workspace/${encodeURIComponent(workspaceId)}/opencode-router/identities/slack`,
        {
          token,
          hostToken,
          method: "POST",
          body: {
            ...(input.id?.trim() ? { id: input.id.trim() } : {}),
            botToken: input.botToken,
            appToken: input.appToken,
            ...(typeof input.enabled === "boolean" ? { enabled: input.enabled } : {}),
          },
        },
      ),
    deleteOpenCodeRouterSlackIdentity: (workspaceId: string, identityId: string) =>
      requestJson<CcagOpenCodeRouterSlackIdentityDeleteResult>(
        baseUrl,
        `/workspace/${encodeURIComponent(workspaceId)}/opencode-router/identities/slack/${encodeURIComponent(identityId)}`,
        { token, hostToken, method: "DELETE" },
      ),
    getOpenCodeRouterBindings: (
      workspaceId: string,
      filters?: { channel?: string; identityId?: string },
    ) => {
      const search = new URLSearchParams();
      if (filters?.channel?.trim()) search.set("channel", filters.channel.trim());
      if (filters?.identityId?.trim()) search.set("identityId", filters.identityId.trim());
      const suffix = search.toString();
      return requestJson<CcagOpenCodeRouterBindingsResult>(
        baseUrl,
        `/workspace/${encodeURIComponent(workspaceId)}/opencode-router/bindings${suffix ? `?${suffix}` : ""}`,
        { token, hostToken },
      );
    },
    setOpenCodeRouterBinding: (
      workspaceId: string,
      input: { channel: string; identityId?: string; peerId: string; directory?: string },
    ) =>
      requestJson<CcagOpenCodeRouterBindingUpdateResult>(
        baseUrl,
        `/workspace/${encodeURIComponent(workspaceId)}/opencode-router/bindings`,
        {
          token,
          hostToken,
          method: "POST",
          body: {
            channel: input.channel,
            ...(input.identityId?.trim() ? { identityId: input.identityId.trim() } : {}),
            peerId: input.peerId,
            ...(input.directory?.trim() ? { directory: input.directory.trim() } : {}),
          },
        },
      ),
    sendOpenCodeRouterMessage: (
      workspaceId: string,
      input: {
        channel: "telegram" | "slack";
        text: string;
        identityId?: string;
        directory?: string;
        peerId?: string;
        autoBind?: boolean;
      },
    ) => {
      const payload = {
        channel: input.channel,
        text: input.text,
        ...(input.identityId?.trim() ? { identityId: input.identityId.trim() } : {}),
        ...(input.directory?.trim() ? { directory: input.directory.trim() } : {}),
        ...(input.peerId?.trim() ? { peerId: input.peerId.trim() } : {}),
        ...(input.autoBind === true ? { autoBind: true } : {}),
      };

      const primaryPath = `/workspace/${encodeURIComponent(workspaceId)}/opencode-router/send`;
      const mountedWorkspaceId = parseCcagWorkspaceIdFromUrl(baseUrl);
      const fallbackPath =
        mountedWorkspaceId && mountedWorkspaceId === workspaceId
          ? `/opencode-router/send`
          : `/w/${encodeURIComponent(workspaceId)}/opencode-router/send`;

      return requestJson<CcagOpenCodeRouterSendResult>(baseUrl, primaryPath, {
        token,
        hostToken,
        method: "POST",
        body: payload,
        timeoutMs: timeouts.opencodeRouter,
      }).catch(async (error) => {
        if (!(error instanceof CcagServerError) || error.status !== 404) {
          throw error;
        }
        return requestJson<CcagOpenCodeRouterSendResult>(baseUrl, fallbackPath, {
          token,
          hostToken,
          method: "POST",
          body: payload,
          timeoutMs: timeouts.opencodeRouter,
        });
      });
    },
    setOpenCodeRouterTelegramEnabled: (
      workspaceId: string,
      enabled: boolean,
      options?: { clearToken?: boolean },
    ) =>
      requestJson<CcagOpenCodeRouterTelegramEnabledResult>(
        baseUrl,
        `/workspace/${encodeURIComponent(workspaceId)}/opencode-router/telegram-enabled`,
        {
          token,
          hostToken,
          method: "POST",
          body: { enabled, clearToken: options?.clearToken ?? false },
        },
      ),
    patchConfig: (workspaceId: string, payload: { opencode?: Record<string, unknown>; ccag?: Record<string, unknown> }) =>
      requestJson<{ updatedAt?: number | null }>(baseUrl, `/workspace/${workspaceId}/config`, {
        token,
        hostToken,
        method: "PATCH",
        body: payload,
      }),
    readOpencodeConfigFile: (workspaceId: string, scope: "project" | "global" = "project") => {
      const query = `?scope=${scope}`;
      return requestJson<OpencodeConfigFile>(baseUrl, `/workspace/${encodeURIComponent(workspaceId)}/opencode-config${query}`, {
        token,
        hostToken,
      });
    },
    writeOpencodeConfigFile: (workspaceId: string, scope: "project" | "global", content: string) =>
      requestJson<ExecResult>(baseUrl, `/workspace/${encodeURIComponent(workspaceId)}/opencode-config`, {
        token,
        hostToken,
        method: "POST",
        body: { scope, content },
      }),
    listReloadEvents: (workspaceId: string, options?: { since?: number }) => {
      const query = typeof options?.since === "number" ? `?since=${options.since}` : "";
      return requestJson<{ items: CcagReloadEvent[]; cursor?: number }>(
        baseUrl,
        `/workspace/${workspaceId}/events${query}`,
        { token, hostToken },
      );
    },
    reloadEngine: (workspaceId: string) =>
      requestJson<{ ok: boolean; reloadedAt?: number }>(baseUrl, `/workspace/${workspaceId}/engine/reload`, {
        token,
        hostToken,
        method: "POST",
      }),
    listPlugins: (workspaceId: string, options?: { includeGlobal?: boolean }) => {
      const query = options?.includeGlobal ? "?includeGlobal=true" : "";
      return requestJson<{ items: CcagPluginItem[]; loadOrder: string[] }>(
        baseUrl,
        `/workspace/${workspaceId}/plugins${query}`,
        { token, hostToken },
      );
    },
    addPlugin: (workspaceId: string, spec: string) =>
      requestJson<{ items: CcagPluginItem[]; loadOrder: string[] }>(
        baseUrl,
        `/workspace/${workspaceId}/plugins`,
        { token, hostToken, method: "POST", body: { spec } },
      ),
    removePlugin: (workspaceId: string, name: string) =>
      requestJson<{ items: CcagPluginItem[]; loadOrder: string[] }>(
        baseUrl,
        `/workspace/${workspaceId}/plugins/${encodeURIComponent(name)}`,
        { token, hostToken, method: "DELETE" },
      ),
    listSkills: (workspaceId: string, options?: { includeGlobal?: boolean }) => {
      const query = options?.includeGlobal ? "?includeGlobal=true" : "";
      return requestJson<{ items: CcagSkillItem[] }>(
        baseUrl,
        `/workspace/${workspaceId}/skills${query}`,
        { token, hostToken },
      );
    },
    listHubSkills: (options?: { repo?: CcagHubRepo }) => {
      const params = new URLSearchParams();
      const owner = options?.repo?.owner?.trim();
      const repo = options?.repo?.repo?.trim();
      const ref = options?.repo?.ref?.trim();
      if (owner) params.set("owner", owner);
      if (repo) params.set("repo", repo);
      if (ref) params.set("ref", ref);
      const query = params.size ? `?${params.toString()}` : "";
      return requestJson<{ items: CcagHubSkillItem[] }>(baseUrl, `/hub/skills${query}`, {
        token,
        hostToken,
      });
    },
    installHubSkill: (
      workspaceId: string,
      name: string,
      options?: { overwrite?: boolean; repo?: { owner?: string; repo?: string; ref?: string } },
    ) =>
      requestJson<{ ok: boolean; name: string; path: string; action: "added" | "updated"; written: number; skipped: number }>(
        baseUrl,
        `/workspace/${workspaceId}/skills/hub/${encodeURIComponent(name)}`,
        {
          token,
          hostToken,
          method: "POST",
          body: {
            ...(options?.overwrite ? { overwrite: true } : {}),
            ...(options?.repo ? { repo: options.repo } : {}),
          },
        },
      ),
    getSkill: (workspaceId: string, name: string, options?: { includeGlobal?: boolean }) => {
      const query = options?.includeGlobal ? "?includeGlobal=true" : "";
      return requestJson<CcagSkillContent>(
        baseUrl,
        `/workspace/${workspaceId}/skills/${encodeURIComponent(name)}${query}`,
        { token, hostToken },
      );
    },
    upsertSkill: (workspaceId: string, payload: { name: string; content: string; description?: string }) =>
      requestJson<CcagSkillItem>(baseUrl, `/workspace/${workspaceId}/skills`, {
        token,
        hostToken,
        method: "POST",
        body: payload,
      }),
    deleteSkill: (workspaceId: string, name: string) =>
      requestJson<{ path: string }>(
        baseUrl,
        `/workspace/${workspaceId}/skills/${encodeURIComponent(name)}`,
        {
          token,
          hostToken,
          method: "DELETE",
        },
      ),
    listMcp: (workspaceId: string) =>
      requestJson<{ items: CcagMcpItem[] }>(baseUrl, `/workspace/${workspaceId}/mcp`, { token, hostToken }),
    addMcp: (workspaceId: string, payload: { name: string; config: Record<string, unknown> }) =>
      requestJson<{ items: CcagMcpItem[] }>(baseUrl, `/workspace/${workspaceId}/mcp`, {
        token,
        hostToken,
        method: "POST",
        body: payload,
      }),
    removeMcp: (workspaceId: string, name: string) =>
      requestJson<{ items: CcagMcpItem[] }>(baseUrl, `/workspace/${workspaceId}/mcp/${encodeURIComponent(name)}`, {
        token,
        hostToken,
        method: "DELETE",
      }),

    logoutMcpAuth: (workspaceId: string, name: string) =>
      requestJson<{ ok: true }>(baseUrl, `/workspace/${workspaceId}/mcp/${encodeURIComponent(name)}/auth`, {
        token,
        hostToken,
        method: "DELETE",
      }),

    listCommands: (workspaceId: string, scope: "workspace" | "global" = "workspace") =>
      requestJson<{ items: CcagCommandItem[] }>(
        baseUrl,
        `/workspace/${workspaceId}/commands?scope=${scope}`,
        { token, hostToken },
      ),
    listAudit: (workspaceId: string, limit = 50) =>
      requestJson<{ items: CcagAuditEntry[] }>(
        baseUrl,
        `/workspace/${workspaceId}/audit?limit=${limit}`,
        { token, hostToken },
      ),
    upsertCommand: (
      workspaceId: string,
      payload: { name: string; description?: string; template: string; agent?: string; model?: string | null; subtask?: boolean },
    ) =>
      requestJson<{ items: CcagCommandItem[] }>(baseUrl, `/workspace/${workspaceId}/commands`, {
        token,
        hostToken,
        method: "POST",
        body: payload,
      }),
    deleteCommand: (workspaceId: string, name: string) =>
      requestJson<{ ok: boolean }>(baseUrl, `/workspace/${workspaceId}/commands/${encodeURIComponent(name)}`, {
        token,
        hostToken,
        method: "DELETE",
      }),
    listScheduledJobs: (workspaceId: string) =>
      requestJson<{ items: ScheduledJob[] }>(baseUrl, `/workspace/${workspaceId}/scheduler/jobs`, { token, hostToken }),
    deleteScheduledJob: (workspaceId: string, name: string) =>
      requestJson<{ job: ScheduledJob }>(baseUrl, `/workspace/${workspaceId}/scheduler/jobs/${encodeURIComponent(name)}`,
        {
          token,
          hostToken,
          method: "DELETE",
        },
      ),

    uploadInbox: async (workspaceId: string, file: File, options?: { path?: string }) => {
      const id = workspaceId.trim();
      if (!id) throw new Error("workspaceId is required");
      if (!file) throw new Error("file is required");
      const form = new FormData();
      form.append("file", file);
      if (options?.path?.trim()) {
        form.append("path", options.path.trim());
      }

      const result = await requestMultipartRaw(baseUrl, `/workspace/${encodeURIComponent(id)}/inbox`, {
        token,
        hostToken,
        method: "POST",
        body: form,
        timeoutMs: timeouts.binary,
      });

      if (!result.ok) {
        let message = result.text.trim();
        try {
          const json = message ? JSON.parse(message) : null;
          if (json && typeof json.message === "string") {
            message = json.message;
          }
        } catch {
          // ignore
        }
        throw new CcagServerError(
          result.status,
          "request_failed",
          message || "Shared folder upload failed",
        );
      }

      const body = result.text.trim();
      if (body) {
        try {
          const parsed = JSON.parse(body) as Partial<CcagInboxUploadResult>;
          if (typeof parsed.path === "string" && parsed.path.trim()) {
            return {
              ok: parsed.ok ?? true,
              path: parsed.path.trim(),
              bytes: typeof parsed.bytes === "number" ? parsed.bytes : file.size,
            } satisfies CcagInboxUploadResult;
          }
        } catch {
          // ignore invalid JSON and fall back
        }
      }

      return {
        ok: true,
        path: options?.path?.trim() || file.name,
        bytes: file.size,
      } satisfies CcagInboxUploadResult;
    },

    listInbox: (workspaceId: string) =>
      requestJson<CcagInboxList>(baseUrl, `/workspace/${encodeURIComponent(workspaceId)}/inbox`, {
        token,
        hostToken,
      }),

    downloadInboxItem: (workspaceId: string, inboxId: string) =>
      requestBinary(
        baseUrl,
        `/workspace/${encodeURIComponent(workspaceId)}/inbox/${encodeURIComponent(inboxId)}`,
        { token, hostToken, timeoutMs: timeouts.binary },
      ),

    readWorkspaceFile: (workspaceId: string, path: string) =>
      requestJson<CcagWorkspaceFileContent>(
        baseUrl,
        `/workspace/${encodeURIComponent(workspaceId)}/files/content?path=${encodeURIComponent(path)}`,
        { token, hostToken },
      ),

    writeWorkspaceFile: (
      workspaceId: string,
      payload: { path: string; content: string; baseUpdatedAt?: number | null; force?: boolean },
    ) =>
      requestJson<CcagWorkspaceFileWriteResult>(
        baseUrl,
        `/workspace/${encodeURIComponent(workspaceId)}/files/content`,
        {
          token,
          hostToken,
          method: "POST",
          body: payload,
        },
      ),

    listArtifacts: (workspaceId: string) =>
      requestJson<CcagArtifactList>(baseUrl, `/workspace/${encodeURIComponent(workspaceId)}/artifacts`, {
        token,
        hostToken,
      }),

    downloadArtifact: (workspaceId: string, artifactId: string) =>
      requestBinary(
        baseUrl,
        `/workspace/${encodeURIComponent(workspaceId)}/artifacts/${encodeURIComponent(artifactId)}`,
        { token, hostToken, timeoutMs: timeouts.binary },
      ),
  };
}

export type CcagServerClient = ReturnType<typeof createCcagServerClient>;
