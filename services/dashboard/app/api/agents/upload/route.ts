// app/api/agents/upload/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
  'application/json',
];

import { fileStore } from '../store';

export async function POST(request: Request): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File;

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: 'Invalid file type. Allowed: xlsx, xls, csv, json' },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: 'File too large. Max 50MB' },
      { status: 400 }
    );
  }

  const buffer = await file.arrayBuffer();
  const fileId = `file_${Date.now()}`;
  
  fileStore.set(fileId, {
    name: file.name,
    size: file.size,
    type: file.type,
    buffer,
  });

  return NextResponse.json({
    fileId,
    url: `/api/agents/files/${fileId}`,
    name: file.name,
    size: file.size,
    type: file.type,
  });
}

// Endpoint to retrieve file content for preview
export async function GET(request: Request): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const fileId = url.searchParams.get('fileId');

  if (!fileId) {
    return NextResponse.json({ error: 'Missing fileId' }, { status: 400 });
  }

  const file = fileStore.get(fileId);
  if (!file) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  return NextResponse.json({
    fileId,
    name: file.name,
    size: file.size,
    type: file.type,
  });
}
