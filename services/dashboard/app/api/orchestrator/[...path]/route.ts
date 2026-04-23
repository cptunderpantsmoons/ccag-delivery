import { NextResponse } from "next/server";
import { rateLimit, getClientIp } from "@/app/lib/rate-limit";
import { getPlatformApiKey } from "@/app/lib/orchestrator-auth";

const ORCHESTRATOR_URL = process.env.CARBON_ORCHESTRATOR_URL ?? "http://orchestrator:8000";

async function proxy(request: Request, path: string[]) {
  const ip = getClientIp(request);
  const limit = rateLimit(ip, `orchestrator:${path.join("/")}`, 60);
  if (!limit.success) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again later." },
      { status: 429, headers: { "X-RateLimit-Remaining": String(limit.remaining), "X-RateLimit-Reset": String(limit.resetAt) } }
    );
  }

  const target = `${ORCHESTRATOR_URL}/${path.join("/")}`;
  const headers = new Headers();
  const contentType = request.headers.get("content-type");

  // Exchange Clerk session for platform API key and use that for backend auth
  const apiKey = await getPlatformApiKey();
  if (apiKey) {
    headers.set("authorization", `Bearer ${apiKey}`);
  }

  // Forward original authorization only as fallback (for direct API key usage)
  const originalAuth = request.headers.get("authorization");
  if (!apiKey && originalAuth) {
    headers.set("authorization", originalAuth);
  }

  if (contentType) headers.set("content-type", contentType);

  const init: RequestInit = {
    method: request.method,
    headers,
    cache: "no-store",
  };

  if (!["GET", "HEAD"].includes(request.method)) {
    init.body = await request.arrayBuffer();
  }

  const response = await fetch(target, init);
  return new NextResponse(response.body, {
    status: response.status,
    headers: response.headers,
  });
}

export async function GET(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return proxy(request, path);
}

export async function POST(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return proxy(request, path);
}

export async function PUT(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return proxy(request, path);
}

export async function PATCH(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return proxy(request, path);
}

export async function DELETE(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return proxy(request, path);
}
