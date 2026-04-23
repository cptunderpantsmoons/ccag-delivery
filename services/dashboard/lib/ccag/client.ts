// lib/ccag/client.ts

import type {
  CcagSession,
  CcagMessage,
  CcagTodo,
  CcagStatus,
  CcagSnapshot,
  CcagSkill,
  CcagApproval,
  CcagWorkspace,
  CcagConfig,
} from './types';

export class CcagClient {
  private config: CcagConfig;

  constructor(config: CcagConfig) {
    this.config = config;
  }

  private async fetch(path: string, options?: RequestInit): Promise<Response> {
    const baseUrl = this.config.serverUrl.startsWith('http')
      ? this.config.serverUrl
      : '';
    const proxyBase = '/api/ccag';
    const url = baseUrl
      ? `${baseUrl}/api/v1${path}`
      : `${proxyBase}${path}`;

    const headers: Record<string, string> = {
      'content-type': 'application/json',
      ...(options?.headers as Record<string, string> || {}),
    };

    if (baseUrl) {
      headers.authorization = `Bearer ${this.config.token}`;
    }

    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res;
  }

  async listSessions(): Promise<CcagSession[]> {
    const res = await this.fetch('/sessions');
    return res.json();
  }

  async createSession(title?: string): Promise<CcagSession> {
    const res = await this.fetch('/sessions', {
      method: 'POST',
      body: JSON.stringify({ title }),
    });
    return res.json();
  }

  async getSession(id: string): Promise<CcagSession> {
    const res = await this.fetch(`/sessions/${id}`);
    return res.json();
  }

  async getSessionMessages(id: string): Promise<CcagMessage[]> {
    const res = await this.fetch(`/sessions/${id}/messages`);
    return res.json();
  }

  async sendPrompt(sessionId: string, prompt: string): Promise<void> {
    await this.fetch(`/sessions/${sessionId}/prompt`, {
      method: 'POST',
      body: JSON.stringify({ prompt }),
    });
  }

  async getSessionTodos(id: string): Promise<CcagTodo[]> {
    const res = await this.fetch(`/sessions/${id}/todos`);
    return res.json();
  }

  async getSessionStatus(id: string): Promise<CcagStatus> {
    const res = await this.fetch(`/sessions/${id}/status`);
    return res.json();
  }

  async getSessionSnapshot(id: string): Promise<CcagSnapshot> {
    const res = await this.fetch(`/sessions/${id}/snapshot`);
    return res.json();
  }

  async listSkills(): Promise<CcagSkill[]> {
    const res = await this.fetch('/skills');
    return res.json();
  }

  async addSkill(path: string): Promise<void> {
    await this.fetch('/skills', {
      method: 'POST',
      body: JSON.stringify({ path }),
    });
  }

  async removeSkill(name: string): Promise<void> {
    await this.fetch(`/skills/${name}`, { method: 'DELETE' });
  }

  async listApprovals(): Promise<CcagApproval[]> {
    const res = await this.fetch('/approvals');
    return res.json();
  }

  async respondToApproval(id: string, action: 'approve' | 'deny' | 'always'): Promise<void> {
    await this.fetch(`/approvals/${id}/respond`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    });
  }

  async listWorkspaces(): Promise<CcagWorkspace[]> {
    const res = await this.fetch('/workspaces');
    return res.json();
  }

  async connectWorkspace(url: string, token: string): Promise<CcagWorkspace> {
    const res = await this.fetch('/workspaces/connect', {
      method: 'POST',
      body: JSON.stringify({ url, token }),
    });
    return res.json();
  }

  connectEventStream(onEvent: (event: { type: string; data: unknown }) => void): () => void {
    const url = `${this.config.serverUrl}/event?token=${encodeURIComponent(this.config.token)}`;
    const eventSource = new EventSource(url);

    eventSource.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        onEvent(data);
      } catch {
        // Ignore malformed events
      }
    };

    eventSource.onerror = () => {
      console.error('CCAG event stream error');
    };

    return () => {
      eventSource.close();
    };
  }
}

let client: CcagClient | null = null;

export function initCcag(config: CcagConfig): CcagClient {
  client = new CcagClient(config);
  return client;
}

export function getCcagClient(): CcagClient {
  if (!client) {
    throw new Error('CCAG not initialized');
  }
  return client;
}
