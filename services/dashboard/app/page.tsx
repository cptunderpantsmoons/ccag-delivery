import { AppShell } from "@/app/components/shell/app-shell";
import { PageHeader } from "@/app/components/ui/page-header";
import { TaskQueuePanel } from "@/app/components/panels/task-queue-panel";
import { ContractPipelinePanel } from "@/app/components/panels/contract-pipeline-panel";
import { InferenceHealthPanel } from "@/app/components/panels/inference-health-panel";

export default function HubPage() {
  return (
    <AppShell title="Intelligence Hub">
      <div className="mx-auto max-w-7xl space-y-8">
        <PageHeader
          title="Intelligence Hub"
          description="Agent task queue, contract pipeline, and inference health — all in one view."
        />

        <section className="space-y-3">
          <h2 className="text-sm font-semibold tracking-tight text-[var(--text-primary)]">
            Agent Task Queue
          </h2>
          <TaskQueuePanel />
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold tracking-tight text-[var(--text-primary)]">
            Contract Processing Pipeline
          </h2>
          <ContractPipelinePanel />
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold tracking-tight text-[var(--text-primary)]">
            Inference Health & Routing
          </h2>
          <InferenceHealthPanel />
        </section>
      </div>
    </AppShell>
  );
}
