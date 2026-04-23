import { NextResponse } from "next/server";

const ORCHESTRATOR_URL = process.env.CARBON_ORCHESTRATOR_URL || "http://orchestrator:8000";
const ADAPTER_URL = process.env.CARBON_ADAPTER_URL || "http://adapter:8000";
const ADMIN_KEY = process.env.ADMIN_AGENT_API_KEY || "";

async function healthCheck(url: string): Promise<{ status: string; latency: number }> {
  const start = Date.now();
  try {
    const res = await fetch(`${url}/health`, { cache: "no-store" });
    const latency = Date.now() - start;
    if (res.ok) {
      return { status: "healthy", latency };
    }
    return { status: "degraded", latency };
  } catch {
    return { status: "unreachable", latency: Date.now() - start };
  }
}

export async function GET() {
  const [orchestrator, adapter] = await Promise.all([
    healthCheck(ORCHESTRATOR_URL),
    healthCheck(ADAPTER_URL),
  ]);

  let models: string[] = [];
  try {
    const res = await fetch(`${ADAPTER_URL}/v1/models`, {
      headers: { authorization: `Bearer ${ADMIN_KEY}` },
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      models = Array.isArray(data.data)
        ? data.data.map((m: { id?: string }) => m.id).filter(Boolean)
        : [];
    }
  } catch {
    models = [];
  }

  return NextResponse.json({
    orchestrator,
    adapter,
    models,
    timestamp: new Date().toISOString(),
  });
}
