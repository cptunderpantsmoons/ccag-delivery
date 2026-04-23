import { NextRequest, NextResponse } from "next/server";
import { readCollection, updateItem } from "@/app/lib/local-store";

interface ApprovalItem {
  id: string;
  status: string;
  steps: { name: string; status: string }[];
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const body = await request.json();
  const { action, comment } = body;

  const item = await updateItem<ApprovalItem>("approvals", id, {
    status: action === "approve" ? "Approved" : action === "reject" ? "Rejected" : "In Progress",
  });

  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, action, comment, item });
}
