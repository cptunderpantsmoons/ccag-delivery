import { NextRequest, NextResponse } from "next/server";

const ADAPTER_URL = process.env.CARBON_ADAPTER_URL || "http://adapter:8000";

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(request, params, "GET");
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return proxy(request, params, "POST");
}

async function proxy(request: NextRequest, paramsPromise: Promise<{ path: string[] }>, method: string) {
  const { path } = await paramsPromise;
  const targetPath = path.join("/");
  const search = request.nextUrl.search;
  const url = `${ADAPTER_URL}/${targetPath}${search}`;

  try {
    const headers = new Headers();
    const authHeader = request.headers.get("authorization");
    if (authHeader) {
      headers.set("authorization", authHeader);
    }
    headers.set("content-type", request.headers.get("content-type") || "application/json");

    const body = method !== "GET" ? await request.text() : undefined;

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
    return NextResponse.json({ error: "Adapter unreachable", detail: String(error) }, { status: 502 });
  }
}
