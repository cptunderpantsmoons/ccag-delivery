import { NextResponse } from "next/server";

export async function GET() {
  const health: Record<string, unknown> = {
    status: "ok",
    timestamp: new Date().toISOString(),
  };

  // Optionally check DB if available
  try {
    const { Pool } = await import("pg");
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      connectionTimeoutMillis: 3000,
    });
    await pool.query("SELECT 1");
    health.database = "connected";
    await pool.end();
  } catch {
    health.database = "unavailable";
  }

  return NextResponse.json(health, { status: 200 });
}
