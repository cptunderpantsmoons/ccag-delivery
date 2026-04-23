// app/agents/workspace/layout.tsx
'use client';

import { AgentRail } from '@/components/agents/agent-rail';
import { ChatPanel } from '@/components/agents/chat-panel';
import { CcagProvider } from '@/lib/ccag/provider';
import { CcagApprovalsPanel } from '@/components/ccag/approvals-panel';

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const config = {
    serverUrl: process.env.NEXT_PUBLIC_CCAG_URL || 'http://localhost:3003',
    token: process.env.NEXT_PUBLIC_CCAG_TOKEN || '',
    workspaceId: 'default',
  };

  return (
    <CcagProvider config={config}>
      <div className="flex h-[calc(100vh-4rem)]">
        <AgentRail />
        <main className="flex-1 overflow-hidden relative">{children}</main>
        <div className="w-80 border-l border-[var(--border)] bg-[var(--surface)] flex flex-col">
          <div className="flex-1 overflow-hidden">
            <ChatPanel />
          </div>
          <div className="border-t border-[var(--border)] p-3 max-h-80 overflow-y-auto">
            <CcagApprovalsPanel />
          </div>
        </div>
      </div>
    </CcagProvider>
  );
}
