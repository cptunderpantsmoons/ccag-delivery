// components/agents/component-suggestion.tsx
'use client';

import { Check, X, Pencil, SkipForward } from 'lucide-react';
import { useAgentStore } from '@/lib/agent-store';
import { approveComponent } from '@/lib/agent-api';

export function ComponentSuggestionPanel() {
  const { currentSuggestion, activeTaskId, updateTask, setCurrentSuggestion } = useAgentStore();

  if (!currentSuggestion || !activeTaskId) return null;

  const handleAction = async (
    action: 'accept' | 'reject' | 'edit',
    configOverrides?: Record<string, unknown>
  ) => {
    try {
      await approveComponent(activeTaskId, {
        componentId: currentSuggestion.id,
        action,
        configOverrides,
      });

      // Update local state
      updateTask(activeTaskId, { status: 'running' });
      setCurrentSuggestion(null);
    } catch (error) {
      console.error('Failed to approve component:', error);
    }
  };

  return (
    <div className="absolute bottom-20 right-4 z-50 w-80 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-lg">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-[var(--text-primary)]">
            {currentSuggestion.title}
          </h4>
          <p className="text-xs text-[var(--text-secondary)]">{currentSuggestion.description}</p>
        </div>
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
          {currentSuggestion.type}
        </span>
      </div>

      <div className="mb-4 rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
        <p className="text-xs text-[var(--text-tertiary)]">Preview</p>
        <div className="mt-2 text-sm text-[var(--text-primary)]">
          {currentSuggestion.config.aggregations?.map((agg, i) => (
            <div key={i} className="flex justify-between py-1">
              <span className="text-[var(--text-secondary)]">{agg.alias}</span>
              <span className="font-mono font-medium">{agg.function}({agg.column})</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => handleAction('accept')}
          className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-600"
        >
          <Check size={14} />
          Accept
        </button>
        <button
          onClick={() => handleAction('edit')}
          className="flex items-center justify-center gap-1 rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--background)]"
        >
          <Pencil size={14} />
        </button>
        <button
          onClick={() => handleAction('reject')}
          className="flex items-center justify-center gap-1 rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-red-500 hover:bg-red-50"
        >
          <X size={14} />
        </button>
        <button
          onClick={() => setCurrentSuggestion(null)}
          className="flex items-center justify-center gap-1 rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--background)]"
        >
          <SkipForward size={14} />
        </button>
      </div>
    </div>
  );
}
