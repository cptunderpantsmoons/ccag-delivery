import { NextRequest, NextResponse } from "next/server";

const CONTRACT_HUB_URL = process.env.CONTRACT_HUB_INTERNAL_URL || "http://contract-hub:3000";
const INTERNAL_TOKEN = process.env.INTERNAL_API_TOKEN || "";

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(request, params, "GET");
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(request, params, "POST");
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(request, params, "PUT");
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(request, params, "DELETE");
}

async function proxy(request: NextRequest, paramsPromise: Promise<{ path: string[] }>, method: string) {
  const { path } = await paramsPromise;
  const targetPath = path.join("/");
  const search = request.nextUrl.search;
  const url = `${CONTRACT_HUB_URL}/api/${targetPath}${search}`;

  try {
    const headers = new Headers();
    const authHeader = request.headers.get("authorization");
    if (authHeader) {
      headers.set("authorization", authHeader);
    }
    headers.set("x-internal-token", INTERNAL_TOKEN);
    headers.set("content-type", request.headers.get("content-type") || "application/json");

    const body = method !== "GET" && method !== "DELETE" ? await request.text() : undefined;

    const res = await fetch(url, {
      method,
      headers,
      body,
    });

    const data = await res.text();
    return new NextResponse(data, {
      status: res.status,
      headers: { "content-type": res.headers.get("content-type") || "application/json" },
    });
  } catch (error) {
    return NextResponse.json({ error: "Contract Hub unreachable", detail: String(error) }, { status: 502 });
  }
}
