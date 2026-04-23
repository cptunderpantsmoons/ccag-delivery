// components/agents/canvas.tsx
'use client';

import { useAgentStore } from '@/lib/agent-store';
import { FileSpreadsheet, LayoutDashboard, FileText } from 'lucide-react';
import { AppComponent } from './app-component';
import type { ExcelData } from '@/lib/agent-types';

function Loader2(props: { size?: number; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={props.size || 24}
      height={props.size || 24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={props.className}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

function ExcelPreview({ data }: { data: ExcelData | undefined }) {
  if (!data) return null;
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--background)]">
      <div className="border-b border-[var(--border)] px-4 py-2">
        <span className="text-sm font-medium text-[var(--text-primary)]">{data.activeSheet}</span>
        <span className="ml-2 text-xs text-[var(--text-tertiary)]">
          {data.rowCount} rows x {data.columnCount} cols
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--surface)]">
              {data.headers.map((h, i) => (
                <th key={i} className="px-3 py-2 text-left font-medium text-[var(--text-secondary)]">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.slice(0, 20).map((row, i) => (
              <tr key={i} className="border-b border-[var(--border)] last:border-0">
                {row.map((cell, j) => (
                  <td key={j} className="px-3 py-2 text-[var(--text-primary)]">
                    {String(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {data.rows.length > 20 && (
          <div className="px-3 py-2 text-center text-xs text-[var(--text-tertiary)]">
            Showing 20 of {data.rows.length} rows
          </div>
        )}
      </div>
    </div>
  );
}

export function Canvas() {
  const { canvasContent, activeTaskId, tasks } = useAgentStore();
  const activeTask = tasks.find((t) => t.id === activeTaskId);

  if (!activeTask) {
    return (
      <div className="flex h-full items-center justify-center text-[var(--text-tertiary)]">
        <div className="text-center">
          <LayoutDashboard size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">Select a task to begin</p>
          <p className="mt-1 text-sm">Or create a new task from the sidebar</p>
        </div>
      </div>
    );
  }

  if (!canvasContent) {
    return (
      <div className="flex h-full items-center justify-center text-[var(--text-tertiary)]">
        <div className="text-center">
          <Loader2 size={32} className="mx-auto mb-4 animate-spin" />
          <p>Loading workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <div className="flex items-center gap-2">
          {canvasContent.mode === 'excel' && <FileSpreadsheet size={18} />}
          {canvasContent.mode === 'app' && <LayoutDashboard size={18} />}
          {canvasContent.mode === 'document' && <FileText size={18} />}
          <span className="font-medium text-[var(--text-primary)]">{activeTask.name}</span>
        </div>
        <div className="flex gap-2">
          {['excel', 'app', 'split'].map((mode) => (
            <button
              key={mode}
              onClick={() => useAgentStore.getState().setCanvasMode(mode as typeof canvasContent.mode)}
              className={`rounded-md px-3 py-1 text-xs font-medium capitalize ${
                canvasContent.mode === mode
                  ? 'bg-[var(--deep)] text-[var(--text-primary)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--background)]'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {canvasContent.mode === 'excel' && canvasContent.excelData && (
          <ExcelPreview data={canvasContent.excelData} />
        )}
        {canvasContent.mode === 'app' && canvasContent.appComponents && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {canvasContent.appComponents.map((comp) => (
              <AppComponent key={comp.id} component={comp} />
            ))}
          </div>
        )}
        {canvasContent.mode === 'split' && (
          <div className="flex h-full gap-4">
            <div className="flex-1">
              {canvasContent.excelData && <ExcelPreview data={canvasContent.excelData} />}
            </div>
            <div className="flex-1">
              {canvasContent.appComponents && (
                <div className="grid grid-cols-1 gap-4">
                  {canvasContent.appComponents.map((comp) => (
                    <AppComponent key={comp.id} component={comp} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
