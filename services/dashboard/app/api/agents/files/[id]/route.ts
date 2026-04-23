// app/api/agents/files/[id]/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { parseExcelBuffer } from '@/lib/excel-parser';

import { fileStore } from '../../store';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const file = fileStore.get(id);

  if (!file) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  // Parse Excel for preview
  if (file.type.includes('spreadsheet') || file.type.includes('excel') || file.type.includes('csv')) {
    try {
      const excelData = parseExcelBuffer(file.buffer);
      return NextResponse.json({
        fileId: id,
        name: file.name,
        excelData,
      });
    } catch (error) {
      return NextResponse.json(
        { error: 'Failed to parse Excel file' },
        { status: 500 }
      );
    }
  }

  // Return raw file info for other types
  return NextResponse.json({
    fileId: id,
    name: file.name,
    size: file.size,
    type: file.type,
  });
}
