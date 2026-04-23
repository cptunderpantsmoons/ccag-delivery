// app/agents/workspace/page.tsx
'use client';

import { useEffect } from 'react';
import { useCcag } from '@/lib/ccag/provider';
import { useAgentStore } from '@/lib/agent-store';
import { Canvas } from '@/components/agents/canvas';
import { ComponentSuggestionPanel } from '@/components/agents/component-suggestion';
import { CcagSessionList } from '@/components/ccag/session-list';
import { Loader2 } from 'lucide-react';

export default function WorkspacePage() {
  const { currentSessionId, createSession, isConnected, sessions } = useCcag();
  const { setSessionId, sessionId } = useAgentStore();

  useEffect(() => {
    if (currentSessionId && currentSessionId !== sessionId) {
      setSessionId(currentSessionId);
    }
  }, [currentSessionId, sessionId, setSessionId]);

  useEffect(() => {
    if (isConnected && sessions.length === 0 && !currentSessionId) {
      createSession('Excel to App Builder').catch(console.error);
    }
  }, [isConnected, sessions.length, currentSessionId, createSession]);

  return (
    <div className="flex h-full">
      <div className="w-56 border-r border-[var(--border)] bg-[var(--surface)] flex flex-col">
        <CcagSessionList />
      </div>

      <div className="flex-1 relative">
        {!currentSessionId ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <div className="text-center space-y-2">
              <Loader2 className="h-8 w-8 animate-spin mx-auto" />
              <p className="text-sm">{isConnected ? 'Creating session...' : 'Connecting to CCAG...'}</p>
            </div>
          </div>
        ) : (
          <>
            <Canvas />
            <ComponentSuggestionPanel />
          </>
        )}
      </div>
    </div>
  );
}
