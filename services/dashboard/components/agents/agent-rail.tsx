// components/agents/agent-rail.tsx
'use client';

import {
  Plus,
  Upload,
  FolderOpen,
  Bot,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  PauseCircle,
} from 'lucide-react';
import { useAgentStore } from '@/lib/agent-store';
import type { Task } from '@/lib/agent-types';

function TaskStatusIcon({ status }: { status: Task['status'] }) {
  switch (status) {
    case 'running':
      return <Loader2 size={14} className="animate-spin text-blue-500" />;
    case 'waiting_approval':
      return <PauseCircle size={14} className="text-amber-500" />;
    case 'completed':
      return <CheckCircle2 size={14} className="text-emerald-500" />;
    case 'failed':
      return <AlertCircle size={14} className="text-red-500" />;
    case 'queued':
      return <Clock size={14} className="text-slate-400" />;
    default:
      return <Clock size={14} className="text-slate-400" />;
  }
}

export function AgentRail() {
  const { tasks, activeTaskId, setActiveTaskId, toggleDataRoom } = useAgentStore();

  const activeTasks = tasks.filter((t) => t.status === 'running' || t.status === 'waiting_approval');
  const completedTasks = tasks.filter((t) => t.status === 'completed');

  return (
    <aside className="flex h-full w-64 flex-col border-r border-[var(--border)] bg-[var(--surface)]">
      <div className="flex items-center gap-2 border-b border-[var(--border)] p-4">
        <Bot size={20} className="text-[var(--text-primary)]" />
        <span className="font-semibold text-[var(--text-primary)]">Agent Hub</span>
      </div>

      <div className="flex flex-col gap-2 p-3">
        <button className="flex items-center gap-2 rounded-lg bg-[var(--deep)] px-3 py-2 text-sm font-medium text-[var(--text-primary)] hover:opacity-90">
          <Plus size={16} />
          New Task
        </button>
        <button
          onClick={toggleDataRoom}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--background)]"
        >
          <Upload size={16} />
          Upload File
        </button>
        <button
          onClick={toggleDataRoom}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--background)]"
        >
          <FolderOpen size={16} />
          Data Room
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3">
        {activeTasks.length > 0 && (
          <div className="mb-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
              Active ({activeTasks.length})
            </h3>
            <div className="flex flex-col gap-2">
              {activeTasks.map((task) => (
                <button
                  key={task.id}
                  onClick={() => setActiveTaskId(task.id)}
                  className={`rounded-lg border p-3 text-left transition-all ${
                    activeTaskId === task.id
                      ? 'border-[var(--border-strong)] bg-[var(--background)]'
                      : 'border-transparent hover:bg-[var(--background)]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <TaskStatusIcon status={task.status} />
                    <span className="truncate text-sm font-medium text-[var(--text-primary)]">
                      {task.name}
                    </span>
                  </div>
                  {task.status === 'running' && (
                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-[var(--border)]">
                      <div
                        className="h-full rounded-full bg-blue-500 transition-all"
                        style={{ width: `${task.progress}%` }}
                      />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {completedTasks.length > 0 && (
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
              Completed
            </h3>
            <div className="flex flex-col gap-1">
              {completedTasks.map((task) => (
                <button
                  key={task.id}
                  onClick={() => setActiveTaskId(task.id)}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-all ${
                    activeTaskId === task.id
                      ? 'bg-[var(--background)] text-[var(--text-primary)]'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--background)]'
                  }`}
                >
                  <CheckCircle2 size={14} className="text-emerald-500" />
                  <span className="truncate">{task.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
