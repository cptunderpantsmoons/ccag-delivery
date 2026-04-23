"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchHealth,
  fetchOrchestratorHealth,
  fetchProjects,
  fetchInsights,
  fetchDocuments,
  deleteDocument,
  type CarbonProject,
  type Insight,
  type DocumentMeta,
} from "./api";

/* ---------- Health / Status ---------- */

export function useHealthCheck() {
  return useQuery({
    queryKey: ["health"],
    queryFn: fetchHealth,
    staleTime: 10_000,
    refetchInterval: 30_000,
  });
}

export function useOrchestratorHealth() {
  return useQuery({
    queryKey: ["orchestrator-health"],
    queryFn: fetchOrchestratorHealth,
    staleTime: 10_000,
    refetchInterval: 30_000,
  });
}

/* ---------- Projects ---------- */

export function useProjects() {
  return useQuery<CarbonProject[]>({
    queryKey: ["projects"],
    queryFn: fetchProjects,
    staleTime: 30_000,
  });
}

/* ---------- Insights ---------- */

export function useInsights() {
  return useQuery<Insight[]>({
    queryKey: ["insights"],
    queryFn: fetchInsights,
    staleTime: 60_000,
  });
}

/* ---------- Documents ---------- */

export function useDocuments() {
  return useQuery<DocumentMeta[]>({
    queryKey: ["documents"],
    queryFn: fetchDocuments,
    staleTime: 30_000,
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });
}
