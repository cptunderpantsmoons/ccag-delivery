import { execFile } from "node:child_process";
import { timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { buildSshArgs, getAdminAgentConfig, resolveActionToCommand } from "@/app/lib/admin-agent.js";
import { rateLimit, getClientIp } from "@/app/lib/rate-limit";
import { adminActionSchema } from "@/app/lib/schemas";

const execFileAsync = promisify(execFile);

function secureTokenMatch(expected: string, provided: string) {
  const expectedBuffer = Buffer.from(expected, "utf8");
  const providedBuffer = Buffer.from(provided, "utf8");

  if (expectedBuffer.length === 0 || expectedBuffer.length !== providedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, providedBuffer);
}

function auditLog(entry: Record<string, unknown>) {
  const line = JSON.stringify({ timestamp: new Date().toISOString(), ...entry });
  console.log(`[ADMIN_AGENT_AUDIT] ${line}`);
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const limit = rateLimit(ip, "admin-agent", 5);
  if (!limit.success) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again later." },
      { status: 429, headers: { "X-RateLimit-Remaining": String(limit.remaining), "X-RateLimit-Reset": String(limit.resetAt) } }
    );
  }

  // Require authenticated Clerk session
  const session = await auth();
  if (!session.userId) {
    auditLog({ event: "auth_denied", ip, reason: "no_clerk_session" });
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const config = getAdminAgentConfig();

  if (!config.enabled) {
    auditLog({ event: "access_denied", userId: session.userId, ip, reason: "admin_agent_disabled" });
    return NextResponse.json({ error: "Admin agent is disabled" }, { status: 403 });
  }

  if (!config.sshTarget) {
    return NextResponse.json({ error: "Missing ADMIN_AGENT_SSH_TARGET" }, { status: 500 });
  }

  if (!config.controlToken) {
    return NextResponse.json({ error: "Missing ADMIN_AGENT_CONTROL_TOKEN" }, { status: 500 });
  }

  const providedToken = request.headers.get("x-admin-agent-token") ?? "";
  if (!secureTokenMatch(config.controlToken, providedToken)) {
    auditLog({ event: "auth_denied", userId: session.userId, ip, reason: "invalid_control_token" });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = adminActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
  }

  const { action, service } = parsed.data;
  auditLog({ event: "action_start", userId: session.userId, ip, action, service });

  try {
    const remoteCommand = resolveActionToCommand({
      action,
      service,
      remoteDir: config.remoteDir,
      allowedServices: config.allowedServices,
    });

    const sshArgs = buildSshArgs({
      sshTarget: config.sshTarget,
      remoteCommand,
    });

    const completed = await execFileAsync("ssh", sshArgs, {
      timeout: config.timeoutMs,
      maxBuffer: 1024 * 1024 * 2,
    });

    auditLog({ event: "action_success", userId: session.userId, ip, action, service });

    return NextResponse.json({
      ok: true,
      action,
      service: service ?? null,
      command: remoteCommand,
      output: completed.stdout?.trim() ?? "",
      stderr: completed.stderr?.trim() ?? "",
    });
  } catch (error) {
    auditLog({
      event: "action_error",
      userId: session.userId,
      ip,
      action,
      service,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      {
        ok: false,
        action,
        service: service ?? null,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
