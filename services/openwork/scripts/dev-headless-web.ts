import { spawn } from "node:child_process";
import { openSync } from "node:fs";
import { access, mkdir } from "node:fs/promises";
import { createServer } from "node:net";
import { randomUUID } from "node:crypto";
import path from "node:path";

const cwd = process.cwd();
const tmpDir = path.join(cwd, "tmp");

const ensureTmp = async () => {
  await mkdir(tmpDir, { recursive: true });
};

const isPortFree = (port: number, host: string) =>
  new Promise<boolean>((resolve) => {
    const server = createServer();
    server.once("error", () => resolve(false));
    server.listen(port, host, () => {
      server.close(() => resolve(true));
    });
  });

const getFreePort = (host: string) =>
  new Promise<number>((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, host, () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close(() => reject(new Error("Unable to resolve free port")));
        return;
      }
      const port = address.port;
      server.close(() => resolve(port));
    });
  });

const resolvePort = async (value: string | undefined, host: string) => {
  if (value) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) {
      const free = await isPortFree(parsed, host);
      if (free) return parsed;
    }
  }
  return await getFreePort(host);
};

const logLine = (message: string) => {
  process.stdout.write(`${message}\n`);
};

const readBool = (value: string | undefined) => {
  const normalized = (value ?? "").trim().toLowerCase();
  return (
    normalized === "1" ||
    normalized === "true" ||
    normalized === "yes" ||
    normalized === "on"
  );
};

const silent = process.argv.includes("--silent");

const autoBuildEnabled =
  process.env.CCAG_DEV_HEADLESS_WEB_AUTOBUILD == null
    ? true
    : readBool(process.env.CCAG_DEV_HEADLESS_WEB_AUTOBUILD);

const runCommand = (command: string, args: string[]) =>
  new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: process.env,
      stdio: silent ? "ignore" : "inherit",
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(
        new Error(
          `${command} ${args.join(" ")} exited with code ${code ?? "unknown"}`,
        ),
      );
    });
  });

const spawnLogged = (
  command: string,
  args: string[],
  logPath: string,
  env: NodeJS.ProcessEnv,
) => {
  const logFd = openSync(logPath, "w");
  return spawn(command, args, {
    cwd,
    env,
    stdio: ["ignore", logFd, logFd],
  });
};

const shutdown = (
  label: string,
  code: number | null,
  signal: NodeJS.Signals | null,
) => {
  const reason =
    code !== null ? `code ${code}` : signal ? `signal ${signal}` : "unknown";
  logLine(`[dev:headless-web] ${label} exited (${reason})`);
  process.exit(code ?? 1);
};

await ensureTmp();

const remoteAccessEnabled = readBool(process.env.CCAG_REMOTE_ACCESS);
const host = remoteAccessEnabled ? "0.0.0.0" : "127.0.0.1";
const viteHost = process.env.VITE_HOST ?? process.env.HOST ?? host;
const publicHost = process.env.CCAG_PUBLIC_HOST ?? null;
const clientHost = publicHost ?? (host === "0.0.0.0" ? "127.0.0.1" : host);
const workspace = process.env.CCAG_WORKSPACE ?? cwd;
const ccagPort = await resolvePort(process.env.CCAG_PORT, "127.0.0.1");
const webPort = await resolvePort(process.env.CCAG_WEB_PORT, "127.0.0.1");
const ccagToken = process.env.CCAG_TOKEN ?? randomUUID();
const ccagHostToken = process.env.CCAG_HOST_TOKEN ?? randomUUID();
const ccagServerBin = path.join(
  cwd,
  "apps/server/dist/bin/ccag-server",
);
const opencodeRouterBin = path.join(
  cwd,
  "apps/opencode-router/dist/bin/opencode-router",
);

const ensureCcagServer = async () => {
  try {
    await access(ccagServerBin);
  } catch {
    if (!autoBuildEnabled) {
      logLine(
        `[dev:headless-web] Missing CCAG server binary at ${ccagServerBin}`,
      );
      logLine(
        "[dev:headless-web] Auto-build disabled (CCAG_DEV_HEADLESS_WEB_AUTOBUILD=0)",
      );
      logLine(
        "[dev:headless-web] Run: pnpm --filter ccag-server build:bin",
      );
      logLine(
        "[dev:headless-web] Or unset/enable CCAG_DEV_HEADLESS_WEB_AUTOBUILD to auto-build.",
      );
      process.exit(1);
    }

    logLine(
      `[dev:headless-web] Missing CCAG server binary at ${ccagServerBin}`,
    );
    logLine(
      "[dev:headless-web] Auto-building: pnpm --filter ccag-server build:bin",
    );
    try {
      await runCommand("pnpm", ["--filter", "ccag-server", "build:bin"]);
      await access(ccagServerBin);
    } catch (error) {
      logLine(
        `[dev:headless-web] Auto-build failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      process.exit(1);
    }
  }
};

const ensureOpencodeRouter = async () => {
  try {
    await access(opencodeRouterBin);
  } catch {
    if (!autoBuildEnabled) {
      logLine(
        `[dev:headless-web] Missing opencode-router binary at ${opencodeRouterBin}`,
      );
      logLine(
        "[dev:headless-web] Auto-build disabled (CCAG_DEV_HEADLESS_WEB_AUTOBUILD=0)",
      );
      logLine(
        "[dev:headless-web] Run: pnpm --filter opencode-router build:bin",
      );
      logLine(
        "[dev:headless-web] Or unset/enable CCAG_DEV_HEADLESS_WEB_AUTOBUILD to auto-build.",
      );
      process.exit(1);
    }

    logLine(
      `[dev:headless-web] Missing opencode-router binary at ${opencodeRouterBin}`,
    );
    logLine(
      "[dev:headless-web] Auto-building: pnpm --filter opencode-router build:bin",
    );
    try {
      await runCommand("pnpm", ["--filter", "opencode-router", "build:bin"]);
      await access(opencodeRouterBin);
    } catch (error) {
      logLine(
        `[dev:headless-web] Auto-build failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      process.exit(1);
    }
  }
};

const ccagUrl = `http://${clientHost}:${ccagPort}`;
const webUrl = `http://${clientHost}:${webPort}`;
// In practice we want opencode-router on for end-to-end messaging tests.
// Allow opt-out via CCAG_DEV_OPENCODE_ROUTER=0.
const opencodeRouterEnabled =
  process.env.CCAG_DEV_OPENCODE_ROUTER == null
    ? true
    : readBool(process.env.CCAG_DEV_OPENCODE_ROUTER);
const opencodeRouterRequired = readBool(
  process.env.CCAG_DEV_OPENCODE_ROUTER_REQUIRED,
);
const viteEnv = {
  ...process.env,
  HOST: viteHost,
  PORT: String(webPort),
  VITE_CCAG_URL: process.env.VITE_CCAG_URL ?? ccagUrl,
  VITE_CCAG_PORT: process.env.VITE_CCAG_PORT ?? String(ccagPort),
  VITE_CCAG_TOKEN: process.env.VITE_CCAG_TOKEN ?? ccagToken,
};
const headlessEnv = {
  ...process.env,
  CCAG_WORKSPACE: workspace,
  CCAG_HOST: host,
  CCAG_REMOTE_ACCESS: remoteAccessEnabled ? "1" : "0",
  CCAG_PORT: String(ccagPort),
  CCAG_TOKEN: ccagToken,
  CCAG_HOST_TOKEN: ccagHostToken,
  CCAG_SERVER_BIN: ccagServerBin,
  CCAG_SIDECAR_SOURCE: process.env.CCAG_SIDECAR_SOURCE ?? "external",
  OPENCODE_ROUTER_BIN: process.env.OPENCODE_ROUTER_BIN ?? opencodeRouterBin,
};

await ensureCcagServer();
if (opencodeRouterEnabled) {
  await ensureOpencodeRouter();
}

logLine("[dev:headless-web] Starting services");
logLine(`[dev:headless-web] Workspace: ${workspace}`);
logLine(`[dev:headless-web] CCAG server: ${ccagUrl}`);
logLine(`[dev:headless-web] Web host: ${viteHost}`);
logLine(`[dev:headless-web] Web port: ${webPort}`);
logLine(`[dev:headless-web] Web URL: ${webUrl}`);
logLine(
  `[dev:headless-web] OpenCodeRouter: ${opencodeRouterEnabled ? "on" : "off"} (set CCAG_DEV_OPENCODE_ROUTER=0 to disable)`,
);
logLine("[dev:headless-web] CCAG_TOKEN: [REDACTED]");
logLine("[dev:headless-web] CCAG_HOST_TOKEN: [REDACTED]");
logLine(
  `[dev:headless-web] Web logs: ${path.relative(cwd, path.join(tmpDir, "dev-web.log"))}`,
);
logLine(
  `[dev:headless-web] Headless logs: ${path.relative(cwd, path.join(tmpDir, "dev-headless.log"))}`,
);

const webProcess = spawnLogged(
  "pnpm",
  [
    "--filter",
    "@ccag/app",
    "exec",
    "vite",
    "--host",
    viteHost,
    "--port",
    String(webPort),
    "--strictPort",
  ],
  path.join(tmpDir, "dev-web.log"),
  viteEnv,
);

const headlessProcess = spawnLogged(
  "pnpm",
  [
    "--filter",
    "ccag-orchestrator",
    "dev",
    "--",
    "start",
    "--workspace",
    workspace,
    "--approval",
    "auto",
    "--allow-external",
    "--opencode-router",
    opencodeRouterEnabled ? "true" : "false",
    ...(opencodeRouterRequired ? ["--opencode-router-required"] : []),
    ...(remoteAccessEnabled ? ["--remote-access"] : []),
    "--ccag-port",
    String(ccagPort),
  ],
  path.join(tmpDir, "dev-headless.log"),
  headlessEnv,
);

const stopAll = (signal: NodeJS.Signals) => {
  webProcess.kill(signal);
  headlessProcess.kill(signal);
};

process.on("SIGINT", () => {
  stopAll("SIGINT");
});
process.on("SIGTERM", () => {
  stopAll("SIGTERM");
});

webProcess.on("exit", (code, signal) => shutdown("web", code, signal));
headlessProcess.on("exit", (code, signal) =>
  shutdown("orchestrator", code, signal),
);
