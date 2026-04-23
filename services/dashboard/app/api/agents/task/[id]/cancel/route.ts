// app/api/agents/task/[id]/cancel/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

import { taskStore, userTaskCounts } from '../../../store';

export async function POST(
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

  if (task.userId !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  task.status = 'cancelled';
  task.updatedAt = new Date().toISOString();
  taskStore.set(id, task);

  const currentCount = userTaskCounts.get(userId) || 1;
  userTaskCounts.set(userId, Math.max(0, currentCount - 1));

  return NextResponse.json({ success: true });
}
