// app/api/agents/task/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import type { Task, TaskStatus } from '@/lib/agent-types';
import { taskStore, userTaskCounts } from '../store';

const MAX_PARALLEL_TASKS = 4;

export async function POST(request: Request): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { type, name, sourceFileId, prompt, skillContext, dependsOn } = body;

  const currentCount = userTaskCounts.get(userId) || 0;
  if (currentCount >= MAX_PARALLEL_TASKS) {
    return NextResponse.json(
      { error: 'Maximum parallel tasks (4) reached. Please wait for a task to complete.' },
      { status: 429 }
    );
  }

  const task: Task = {
    id: `task_${Date.now()}`,
    name: name || 'Untitled Task',
    type: type || 'custom',
    status: 'queued' as TaskStatus,
    progress: 0,
    agentSkill: skillContext?.[0] || 'data-analyst',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userId,
    collaborators: [userId],
    sourceFileId,
    prompt: prompt || '',
    components: [],
    suggestions: [],
    dependsOn: dependsOn || [],
  };

  taskStore.set(task.id, task);
  userTaskCounts.set(userId, currentCount + 1);

  return NextResponse.json(task);
}

export async function GET(): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tasks = Array.from(taskStore.values()).filter(
    (t) => t.userId === userId || t.collaborators.includes(userId)
  );

  return NextResponse.json(tasks);
}
