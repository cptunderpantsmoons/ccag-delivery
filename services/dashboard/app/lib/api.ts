/**
 * Typed API client for Carbon Intelligence Hub backend.
 * These functions are consumed by TanStack Query hooks.
 */

export interface CarbonProject {
  id: string;
  name: string;
  methodology: string;
  region: string;
  client: string;
  accuInventory: number;
  nextDelivery: string;
  status: string;
}

export interface Insight {
  id: string;
  title: string;
  category: string;
  summary: string;
  createdAt: string;
}

export interface DocumentMeta {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
}

export async function fetchHealth() {
  const res = await fetch("/health", { cache: "no-store" });
  return { ok: res.ok, status: res.status };
}

export async function fetchOrchestratorHealth() {
  const res = await fetch("/api/orchestrator/health", { cache: "no-store" });
  return { ok: res.ok, status: res.status };
}

export async function fetchProjects(): Promise<CarbonProject[]> {
  const res = await fetch("/api/orchestrator/projects", { cache: "no-store" });
  if (!res.ok) throw new Error(`Projects API returned ${res.status}`);
  const data = await res.json();
  return (Array.isArray(data) ? data : data.projects || []) as CarbonProject[];
}

export async function fetchInsights(): Promise<Insight[]> {
  const res = await fetch("/api/orchestrator/insights", { cache: "no-store" });
  if (!res.ok) throw new Error(`Insights API returned ${res.status}`);
  const data = await res.json();
  return (Array.isArray(data) ? data : data.insights || []) as Insight[];
}

export async function fetchDocuments(): Promise<DocumentMeta[]> {
  const res = await fetch("/api/documents", { cache: "no-store" });
  if (!res.ok) throw new Error(`Documents API returned ${res.status}`);
  const data = await res.json();
  return (data.documents || []) as DocumentMeta[];
}

export async function deleteDocument(id: string) {
  const res = await fetch(`/api/documents?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
  return res.json();
}
