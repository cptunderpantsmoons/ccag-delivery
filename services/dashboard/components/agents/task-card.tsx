// components/agents/task-card.tsx
'use client';

import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  PauseCircle,
  XCircle,
  Bot,
} from 'lucide-react';
import { useAgentStore } from '@/lib/agent-store';
import { cancelTask } from '@/lib/agent-api';
import type { Task } from '@/lib/agent-types';

const statusConfig = {
  queued: { icon: Clock, color: 'text-slate-400', bg: 'bg-slate-50' },
  running: { icon: Loader2, color: 'text-blue-500', bg: 'bg-blue-50' },
  waiting_approval: { icon: PauseCircle, color: 'text-amber-500', bg: 'bg-amber-50' },
  completed: { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  failed: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50' },
  cancelled: { icon: XCircle, color: 'text-slate-400', bg: 'bg-slate-50' },
};

export function TaskCard({ task }: { task: Task }) {
  const { setActiveTaskId } = useAgentStore();
  const config = statusConfig[task.status];
  const Icon = config.icon;

  const handleCancel = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await cancelTask(task.id);
    } catch (error) {
      console.error('Failed to cancel task:', error);
    }
  };

  return (
    <div
      onClick={() => setActiveTaskId(task.id)}
      className="cursor-pointer rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 transition-all hover:border-[var(--border-strong)] hover:shadow-sm"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Icon size={14} className={config.color} />
          <span className="text-sm font-medium text-[var(--text-primary)]">{task.name}</span>
        </div>
        {task.status === 'running' && (
          <button
            onClick={handleCancel}
            className="text-[var(--text-tertiary)] hover:text-red-500"
          >
            <XCircle size={14} />
          </button>
        )}
      </div>

      <div className="mt-2 flex items-center gap-2">
        <Bot size={12} className="text-[var(--text-tertiary)]" />
        <span className="text-xs text-[var(--text-secondary)]">{task.agentSkill}</span>
      </div>

      {task.status === 'running' && (
        <div className="mt-2">
          <div className="h-1.5 overflow-hidden rounded-full bg-[var(--border)]">
            <div
              className="h-full rounded-full bg-blue-500 transition-all"
              style={{ width: `${task.progress}%` }}
            />
          </div>
          <span className="mt-1 text-xs text-[var(--text-tertiary)]">{task.progress}%</span>
        </div>
      )}

      {task.error && (
        <p className="mt-2 text-xs text-red-500">{task.error}</p>
      )}
    </div>
  );
}
