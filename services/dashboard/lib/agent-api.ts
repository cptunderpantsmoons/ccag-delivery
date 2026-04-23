// lib/agent-api.ts

import type {
  Task,
  TaskType,
  AgentSkill,
  AgentSession,
  ComponentSuggestion,
  Message,
} from './agent-types';

const API_BASE = '/api/agents';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'content-type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function createSession(): Promise<AgentSession> {
  return apiFetch<AgentSession>('/session', { method: 'POST' });
}

export interface CreateTaskRequest {
  type: TaskType;
  name: string;
  sourceFileId?: string;
  prompt: string;
  skillContext?: AgentSkill[];
  priority?: 'low' | 'normal' | 'high';
  dependsOn?: string[];
}

export async function createTask(req: CreateTaskRequest): Promise<Task> {
  return apiFetch<Task>('/task', {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

export async function getTask(taskId: string): Promise<Task> {
  return apiFetch<Task>(`/task/${taskId}`);
}

export async function cancelTask(taskId: string): Promise<void> {
  await apiFetch<void>(`/task/${taskId}/cancel`, { method: 'POST' });
}

export interface ApproveRequest {
  componentId: string;
  action: 'accept' | 'reject' | 'edit';
  configOverrides?: Record<string, unknown>;
}

export async function approveComponent(
  taskId: string,
  req: ApproveRequest
): Promise<ComponentSuggestion> {
  return apiFetch<ComponentSuggestion>(`/task/${taskId}/approve`, {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

export async function sendMessage(
  taskId: string,
  content: string,
  attachments?: File[]
): Promise<Message> {
  const formData = new FormData();
  formData.append('content', content);
  formData.append('taskId', taskId);
  attachments?.forEach((file) => formData.append('attachments', file));

  const res = await fetch(`${API_BASE}/message`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function uploadFile(file: File): Promise<{ fileId: string; url: string }> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}
