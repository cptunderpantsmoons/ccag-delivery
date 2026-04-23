// app/api/agents/session/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import type { AgentSession, AgentSkill } from '@/lib/agent-types';

const DEFAULT_SKILLS: AgentSkill[] = [
  'data-analyst',
  'app-builder',
  'visual-designer',
  'document-writer',
];

export async function POST(): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const session: AgentSession = {
    id: `sess_${Date.now()}`,
    userId,
    skills: DEFAULT_SKILLS,
    activeTaskIds: [],
    createdAt: new Date().toISOString(),
  };

  return NextResponse.json(session);
}
