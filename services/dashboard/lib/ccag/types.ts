// lib/ccag/types.ts

export interface CcagSession {
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

export interface CcagMessage {
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

export interface CcagTodo {
  content: string;
  status: string;
  priority: string;
}

export type CcagStatus =
  | { type: 'idle' }
  | { type: 'busy' }
  | { type: 'retry'; attempt: number; message: string; next: number };

export interface CcagSnapshot {
  session: CcagSession;
  messages: CcagMessage[];
  todos: CcagTodo[];
  status: CcagStatus;
}

export interface CcagSkill {
  name: string;
  description: string;
  path: string;
  scope: 'project' | 'global';
  trigger?: string;
}

export interface CcagApproval {
  id: string;
  sessionID: string;
  toolName: string;
  arguments: Record<string, unknown>;
  timestamp: number;
  status: 'pending' | 'approved' | 'denied';
}

export interface CcagWorkspace {
  id: string;
  name: string;
  path: string;
  preset: string;
  workspaceType: 'local' | 'remote';
  remoteType?: 'opencode' | 'ccag';
  baseUrl?: string;
  displayName?: string;
}

export interface CcagEvent {
  type: 'session_update' | 'todo_update' | 'status_change' | 'approval_request' | 'reload' | 'message';
  workspaceId: string;
  sessionId?: string;
  data: unknown;
  timestamp: number;
}

export interface CcagConfig {
  serverUrl: string;
  token: string;
  workspaceId: string;
}
