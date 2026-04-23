// lib/openwork/types.ts

export interface OpenWorkSession {
  id: string;
  title?: string | null;
  slug?: string | null;
  parentID?: string | null;
  directory?: string | null;
  time?: {
    created?: number;
    updated?: number;
    completed?: number;
    archived?: number;
  };
  summary?: {
    additions?: number;
    deletions?: number;
    files?: number;
  };
}

export interface OpenWorkMessage {
  info: {
    id: string;
    sessionID: string;
    role: string;
    parentID?: string | null;
    time?: {
      created?: number;
      updated?: number;
    };
  };
  parts: Array<{
    id: string;
    messageID: string;
    sessionID: string;
    type?: string;
    content?: string;
    toolCall?: {
      id: string;
      name: string;
      arguments: Record<string, unknown>;
    };
    toolResult?: {
      toolCallID: string;
      output: string;
    };
  }>;
}

export interface OpenWorkTodo {
  content: string;
  status: string;
  priority: string;
}

export type OpenWorkStatus =
  | { type: 'idle' }
  | { type: 'busy' }
  | { type: 'retry'; attempt: number; message: string; next: number };

export interface OpenWorkSnapshot {
  session: OpenWorkSession;
  messages: OpenWorkMessage[];
  todos: OpenWorkTodo[];
  status: OpenWorkStatus;
}

export interface OpenWorkSkill {
  name: string;
  description: string;
  path: string;
  scope: 'project' | 'global';
  trigger?: string;
}

export interface OpenWorkApproval {
  id: string;
  sessionID: string;
  toolName: string;
  arguments: Record<string, unknown>;
  timestamp: number;
  status: 'pending' | 'approved' | 'denied';
}

export interface OpenWorkWorkspace {
  id: string;
  name: string;
  path: string;
  preset: string;
  workspaceType: 'local' | 'remote';
  remoteType?: 'opencode' | 'openwork';
  baseUrl?: string;
  displayName?: string;
}

export interface OpenWorkEvent {
  type: 'session_update' | 'todo_update' | 'status_change' | 'approval_request' | 'reload' | 'message';
  workspaceId: string;
  sessionId?: string;
  data: unknown;
  timestamp: number;
}

export interface OpenWorkConfig {
  serverUrl: string;
  token: string;
  workspaceId: string;
}
