import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { promises as fs } from "fs";
import { join } from "path";
import { rateLimit, getClientIp } from "@/app/lib/rate-limit";

const UPLOAD_DIR = join(process.cwd(), "uploads");

interface DocMeta {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
  userId: string;
}

async function ensureDir() {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  } catch { /* ignore */ }
}

async function readMeta(): Promise<DocMeta[]> {
  try {
    const data = await fs.readFile(join(UPLOAD_DIR, "meta.json"), "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function writeMeta(docs: DocMeta[]) {
  await fs.writeFile(join(UPLOAD_DIR, "meta.json"), JSON.stringify(docs, null, 2));
}

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const limit = rateLimit(ip, "documents:get", 120);
  if (!limit.success) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again later." },
      { status: 429, headers: { "X-RateLimit-Remaining": String(limit.remaining), "X-RateLimit-Reset": String(limit.resetAt) } }
    );
  }

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await ensureDir();
  const docs = await readMeta();
  return NextResponse.json({ documents: docs.filter((d) => d.userId === userId) });
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const limit = rateLimit(ip, "documents:post", 30);
  if (!limit.success) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again later." },
      { status: 429, headers: { "X-RateLimit-Remaining": String(limit.remaining), "X-RateLimit-Reset": String(limit.resetAt) } }
    );
  }

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureDir();
  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file || file.size === 0) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const maxSize = 50 * 1024 * 1024; // 50MB
  if (file.size > maxSize) {
    return NextResponse.json({ error: "File too large (max 50MB)" }, { status: 413 });
  }

  const allowedTypes = [
    "application/pdf",
    "text/plain",
    "text/markdown",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
    "image/png",
    "image/jpeg",
  ];

  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 415 });
  }

  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const ext = file.name.split(".").pop() || "bin";
  const filename = `${id}.${ext}`;
  const filepath = join(UPLOAD_DIR, filename);

  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(filepath, buffer);

  const docs = await readMeta();
  const meta: DocMeta = {
    id,
    name: file.name,
    size: file.size,
    type: file.type,
    uploadedAt: new Date().toISOString(),
    userId,
  };
  docs.push(meta);
  await writeMeta(docs);

  return NextResponse.json({ document: meta });
}

export async function DELETE(request: NextRequest) {
  const ip = getClientIp(request);
  const limit = rateLimit(ip, "documents:delete", 60);
  if (!limit.success) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again later." },
      { status: 429, headers: { "X-RateLimit-Remaining": String(limit.remaining), "X-RateLimit-Reset": String(limit.resetAt) } }
    );
  }

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const docs = await readMeta();
  const doc = docs.find((d) => d.id === id && d.userId === userId);
  if (!doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const ext = doc.name.split(".").pop() || "bin";
  const filepath = join(UPLOAD_DIR, `${id}.${ext}`);
  try {
    await fs.unlink(filepath);
  } catch { /* ignore */ }

  const filtered = docs.filter((d) => d.id !== id);
  await writeMeta(filtered);

  return NextResponse.json({ success: true });
}
