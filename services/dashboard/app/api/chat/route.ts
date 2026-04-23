import { NextResponse } from "next/server";
import { rateLimit, getClientIp } from "@/app/lib/rate-limit";
import { chatRequestSchema } from "@/app/lib/schemas";
import { getPlatformApiKey } from "@/app/lib/orchestrator-auth";

const ADAPTER_URL = process.env.CARBON_ADAPTER_URL ?? "http://adapter:8000";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const limit = rateLimit(ip, "chat", 20);
  if (!limit.success) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again later." },
      { status: 429, headers: { "X-RateLimit-Remaining": String(limit.remaining), "X-RateLimit-Reset": String(limit.resetAt) } }
    );
  }

  const body = await request.json();

  const parsed = chatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
  }

  const isStreaming = parsed.data.stream === true;

  // Exchange Clerk session for platform API key
  const apiKey = await getPlatformApiKey();
  if (!apiKey) {
    return NextResponse.json(
      { error: "Unable to authenticate with backend. Please sign in again." },
      { status: 401 }
    );
  }

  try {
    const upstream = await fetch(`${ADAPTER_URL}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "accept": isStreaming ? "text/event-stream" : "application/json",
        "authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!upstream.ok) {
      const text = await upstream.text();
      return NextResponse.json({ error: text }, { status: upstream.status });
    }

    // For streaming, proxy the SSE response directly
    if (isStreaming && upstream.body) {
      return new Response(upstream.body, {
        status: upstream.status,
        headers: {
          "content-type": "text/event-stream",
          "cache-control": "no-cache",
          connection: "keep-alive",
        },
      });
    }

    // Non-streaming: proxy JSON
    return new Response(upstream.body, {
      status: upstream.status,
      headers: upstream.headers,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 502 }
    );
  }
}
