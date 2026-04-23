// app/agents/queue/page.tsx
'use client';

import { useAgentStore } from '@/lib/agent-store';
import { AppShell } from '../../components/shell/app-shell';
import { TaskCard } from '@/components/agents/task-card';

export default function AgentQueuePage() {
  const { tasks } = useAgentStore();

  const columns = [
    { id: 'queued', title: 'Queued', tasks: tasks.filter((t) => t.status === 'queued') },
    { id: 'running', title: 'Running', tasks: tasks.filter((t) => t.status === 'running') },
    { id: 'waiting', title: 'Awaiting Approval', tasks: tasks.filter((t) => t.status === 'waiting_approval') },
    { id: 'completed', title: 'Completed', tasks: tasks.filter((t) => t.status === 'completed') },
    { id: 'failed', title: 'Failed', tasks: tasks.filter((t) => t.status === 'failed') },
  ];

  return (
    <AppShell title="Agent Queue">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <h1 className="editorial-heading text-3xl font-semibold text-[var(--text-primary)]">
            Task Queue
          </h1>
          <p className="mt-2 text-[var(--text-secondary)]">
            Monitor and manage all agent tasks across your workspace.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-5">
          {columns.map((col) => (
            <div key={col.id} className="flex flex-col">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">{col.title}</h3>
                <span className="rounded-full bg-[var(--surface)] px-2 py-0.5 text-xs text-[var(--text-secondary)]">
                  {col.tasks.length}
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {col.tasks.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
