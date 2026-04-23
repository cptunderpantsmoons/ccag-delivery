import { NextResponse } from "next/server";
import { readCollection } from "@/app/lib/local-store";

export async function GET() {
  const items = await readCollection("approvals");
  return NextResponse.json(items);
}
