// app/api/agents/task/[id]/approve/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

import { taskStore } from '../../../store';

export async function POST(
  request: Request,
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

  const body = await request.json();
  const { componentId, action, configOverrides } = body;

  const suggestion = task.suggestions.find((s: { id: string }) => s.id === componentId);
  if (!suggestion) {
    return NextResponse.json({ error: 'Suggestion not found' }, { status: 404 });
  }

  if (action === 'accept') {
    suggestion.status = 'accepted';
    task.components.push({
      id: suggestion.id,
      type: suggestion.type,
      title: suggestion.title,
      config: { ...suggestion.config, ...configOverrides },
      position: { x: 0, y: 0, w: 4, h: 3 },
    });
  } else if (action === 'reject') {
    suggestion.status = 'rejected';
  } else if (action === 'edit') {
    suggestion.status = 'edited';
    suggestion.config = { ...suggestion.config, ...configOverrides };
    task.components.push({
      id: suggestion.id,
      type: suggestion.type,
      title: suggestion.title,
      config: suggestion.config,
      position: { x: 0, y: 0, w: 4, h: 3 },
    });
  }

  task.status = 'running';
  task.updatedAt = new Date().toISOString();
  taskStore.set(id, task);

  return NextResponse.json(suggestion);
}
