// app/api/agents/task/[id]/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

import { taskStore } from '../../store';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const task = taskStore.get(id);

  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  if (task.userId !== userId && !task.collaborators.includes(userId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json(task);
}
