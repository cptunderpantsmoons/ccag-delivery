// app/agents/skills/page.tsx
'use client';

import { AppShell } from '../../components/shell/app-shell';
import { CcagSkillsManager } from '@/components/ccag/skills-manager';
import { CcagProvider } from '@/lib/ccag/provider';

export default function SkillsPage() {
  const config = {
    serverUrl: process.env.NEXT_PUBLIC_CCAG_URL || 'http://localhost:3003',
    token: process.env.NEXT_PUBLIC_CCAG_TOKEN || '',
    workspaceId: 'default',
  };

  return (
    <AppShell title="Skills">
      <div className="mx-auto max-w-4xl py-6">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-[var(--text-primary)]">
            Skills Manager
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Manage CCAG skills and capabilities for your agent workspace.
          </p>
        </div>
        <CcagProvider config={config}>
          <CcagSkillsManager />
        </CcagProvider>
      </div>
    </AppShell>
  );
}
