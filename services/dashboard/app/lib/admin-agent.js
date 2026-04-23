const DEFAULT_REMOTE_DIR = "/opt/carbon-agent-platform";
const DEFAULT_ALLOWED_SERVICES = [
  "orchestrator",
  "adapter",
  "open-webui",
  "dashboard",
  "vector-store",
  "contract-hub",
  "contract-hub-postgres",
  "postgres",
  "redis",
  "chromadb",
];

function parseAllowedServices(value) {
  if (!value) {
    return DEFAULT_ALLOWED_SERVICES;
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeService(service) {
  if (!service) {
    return "";
  }

  return service.trim().toLowerCase();
}

export function getAdminAgentConfig() {
  const enabled = (process.env.ADMIN_AGENT_ENABLED ?? "false").toLowerCase() === "true";
  const sshTarget = process.env.ADMIN_AGENT_SSH_TARGET ?? "";
  const controlToken = process.env.ADMIN_AGENT_CONTROL_TOKEN ?? "";
  const timeoutSeconds = Number.parseInt(process.env.ADMIN_AGENT_TIMEOUT_SECONDS ?? "90", 10);
  const remoteDir = process.env.ADMIN_AGENT_REMOTE_DIR ?? DEFAULT_REMOTE_DIR;
  const allowedServices = parseAllowedServices(process.env.ADMIN_AGENT_ALLOWED_SERVICES);

  return {
    enabled,
    sshTarget,
    controlToken,
    timeoutMs: Number.isFinite(timeoutSeconds) && timeoutSeconds > 0 ? timeoutSeconds * 1000 : 90000,
    remoteDir,
    allowedServices,
  };
}

export function resolveActionToCommand({ action, service, remoteDir, allowedServices }) {
  const normalizedService = normalizeService(service);

  if (action === "platform_status") {
    return `[ -d ${remoteDir} ] && [ -f ${remoteDir}/docker-compose.yml ] && cd ${remoteDir} && docker compose ps || docker ps --format 'table {{.Names}}\\t{{.Status}}\\t{{.Ports}}' || (hostname && uptime && whoami)`;
  }

  if (action === "health_check") {
    return `[ -d ${remoteDir} ] && [ -f ${remoteDir}/docker-compose.yml ] && cd ${remoteDir} && docker compose ps && curl -fsS http://127.0.0.1:3001/health || (curl -fsS http://127.0.0.1:3001/health || true)`;
  }

  if (action === "recent_logs") {
    return `[ -d ${remoteDir} ] && [ -f ${remoteDir}/docker-compose.yml ] && cd ${remoteDir} && docker compose logs --tail 120 orchestrator adapter open-webui dashboard || docker ps --format 'table {{.Names}}\\t{{.Status}}\\t{{.Ports}}' || (hostname && uptime)`;
  }

  if (action === "resource_snapshot") {
    return "hostname && uptime && df -h && free -m";
  }

  if (action === "redeploy_stack") {
    return `cd ${remoteDir} && docker compose pull && docker compose up -d --remove-orphans && docker compose ps`;
  }

  if (action === "restart_service") {
    if (!normalizedService) {
      throw new Error("service is required for restart_service");
    }
    if (!allowedServices.includes(normalizedService)) {
      throw new Error(`service is not allowlisted: ${normalizedService}`);
    }
    return `cd ${remoteDir} && docker compose restart ${normalizedService} && docker compose ps ${normalizedService}`;
  }

  throw new Error(`Unsupported admin action: ${action}`);
}

export function buildSshArgs({ sshTarget, remoteCommand }) {
  return [
    "-o",
    "BatchMode=yes",
    "-o",
    "StrictHostKeyChecking=accept-new",
    sshTarget,
    remoteCommand,
  ];
}
