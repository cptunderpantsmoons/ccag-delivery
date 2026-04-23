// components/ccag/session-list.tsx
'use client';

import { useState } from 'react';
import { useCcag } from '@/lib/ccag/provider';
import { Plus, MessageSquare, Loader2 } from 'lucide-react';

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function CcagSessionList() {
  const { sessions, currentSessionId, setCurrentSessionId, createSession, isConnected } = useCcag();
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      await createSession('New Session');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-3 border-b border-[var(--border)]">
        <h3 className="text-sm font-medium text-[var(--text-primary)]">Sessions</h3>
        <button
          onClick={handleCreate}
          disabled={isCreating}
          className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-[var(--background)] text-[var(--text-secondary)] disabled:opacity-50"
        >
          {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        </button>
      </div>

      {!isConnected && (
        <div className="flex items-center justify-center p-4 text-xs text-[var(--text-secondary)]">
          <Loader2 className="mr-2 h-3 w-3 animate-spin" />
          Connecting to CCAG runtime...
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <div className="p-2 space-y-1">
          {sessions.map((session) => (
            <button
              key={session.id}
              onClick={() => setCurrentSessionId(session.id)}
              className={`w-full text-left p-2 rounded-md text-xs transition-colors ${
                currentSessionId === session.id
                  ? 'bg-[var(--deep)] text-[var(--text-primary)]'
                  : 'hover:bg-[var(--background)] text-[var(--text-secondary)]'
              }`}
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="h-3 w-3 shrink-0" />
                <span className="truncate font-medium">{session.title || 'Untitled'}</span>
              </div>
              {session.time?.updated && (
                <div className="text-[var(--text-tertiary)] mt-0.5 pl-5">
                  {formatTimeAgo(session.time.updated)}
                </div>
              )}
            </button>
          ))}
          {sessions.length === 0 && isConnected && (
            <div className="text-center text-xs text-[var(--text-secondary)] py-4">
              No sessions yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
