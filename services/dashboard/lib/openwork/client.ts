// lib/openwork/client.ts

import type {
  OpenWorkSession,
  OpenWorkMessage,
  OpenWorkTodo,
  OpenWorkStatus,
  OpenWorkSnapshot,
  OpenWorkSkill,
  OpenWorkApproval,
  OpenWorkWorkspace,
  OpenWorkConfig,
} from './types';

export class OpenWorkClient {
  private config: OpenWorkConfig;

  constructor(config: OpenWorkConfig) {
    this.config = config;
  }

  private async fetch(path: string, options?: RequestInit): Promise<Response> {
    // Use Next.js proxy if configured, else direct
    const baseUrl = this.config.serverUrl.startsWith('http')
      ? this.config.serverUrl
      : '';
    const proxyBase = '/api/openwork';
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

  // Sessions
  async listSessions(): Promise<OpenWorkSession[]> {
    const res = await this.fetch('/sessions');
    return res.json();
  }

  async createSession(title?: string): Promise<OpenWorkSession> {
    const res = await this.fetch('/sessions', {
      method: 'POST',
      body: JSON.stringify({ title }),
    });
    return res.json();
  }

  async getSession(id: string): Promise<OpenWorkSession> {
    const res = await this.fetch(`/sessions/${id}`);
    return res.json();
  }

  async getSessionMessages(id: string): Promise<OpenWorkMessage[]> {
    const res = await this.fetch(`/sessions/${id}/messages`);
    return res.json();
  }

  async sendPrompt(sessionId: string, prompt: string): Promise<void> {
    await this.fetch(`/sessions/${sessionId}/prompt`, {
      method: 'POST',
      body: JSON.stringify({ prompt }),
    });
  }

  async getSessionTodos(id: string): Promise<OpenWorkTodo[]> {
    const res = await this.fetch(`/sessions/${id}/todos`);
    return res.json();
  }

  async getSessionStatus(id: string): Promise<OpenWorkStatus> {
    const res = await this.fetch(`/sessions/${id}/status`);
    return res.json();
  }

  async getSessionSnapshot(id: string): Promise<OpenWorkSnapshot> {
    const res = await this.fetch(`/sessions/${id}/snapshot`);
    return res.json();
  }

  // Skills
  async listSkills(): Promise<OpenWorkSkill[]> {
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

  // Approvals
  async listApprovals(): Promise<OpenWorkApproval[]> {
    const res = await this.fetch('/approvals');
    return res.json();
  }

  async respondToApproval(id: string, action: 'approve' | 'deny' | 'always'): Promise<void> {
    await this.fetch(`/approvals/${id}/respond`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    });
  }

  // Workspaces
  async listWorkspaces(): Promise<OpenWorkWorkspace[]> {
    const res = await this.fetch('/workspaces');
    return res.json();
  }

  async connectWorkspace(url: string, token: string): Promise<OpenWorkWorkspace> {
    const res = await this.fetch('/workspaces/connect', {
      method: 'POST',
      body: JSON.stringify({ url, token }),
    });
    return res.json();
  }

  // Event Stream
  connectEventStream(onEvent: (event: { type: string; data: unknown }) => void): () => void {
    // Use direct connection for SSE (proxy doesn't support it well)
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
      console.error('OpenWork event stream error');
    };

    return () => {
      eventSource.close();
    };
  }
}

// Singleton instance
let client: OpenWorkClient | null = null;

export function initOpenWork(config: OpenWorkConfig): OpenWorkClient {
  client = new OpenWorkClient(config);
  return client;
}

export function getOpenWorkClient(): OpenWorkClient {
  if (!client) {
    throw new Error('OpenWork not initialized');
  }
  return client;
}
