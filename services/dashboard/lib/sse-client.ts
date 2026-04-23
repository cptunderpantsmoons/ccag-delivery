// lib/sse-client.ts

import { useAgentStore } from './agent-store';

let eventSource: EventSource | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 2000;

export function connectSSE(taskId: string): void {
  disconnectSSE();

  const url = `/api/agents/stream?taskId=${encodeURIComponent(taskId)}`;
  eventSource = new EventSource(url);
  reconnectAttempts = 0;

  eventSource.onopen = () => {
    console.log('SSE connected for task:', taskId);
    reconnectAttempts = 0;
  };

  eventSource.addEventListener('progress', (e) => {
    const data = JSON.parse((e as MessageEvent).data);
    useAgentStore.getState().updateTask(data.taskId, {
      progress: data.progress,
    });
  });

  eventSource.addEventListener('suggestion', (e) => {
    const data = JSON.parse((e as MessageEvent).data);
    useAgentStore.getState().setCurrentSuggestion(data.component);
    useAgentStore.getState().updateTask(data.taskId, {
      status: 'waiting_approval',
    });
  });

  eventSource.addEventListener('message', (e) => {
    const data = JSON.parse((e as MessageEvent).data);
    useAgentStore.getState().addMessage(data.message);
  });

  eventSource.addEventListener('complete', (e) => {
    const data = JSON.parse((e as MessageEvent).data);
    useAgentStore.getState().updateTask(data.taskId, {
      status: 'completed',
      outputUrl: data.outputUrl,
    });
    disconnectSSE();
  });

  eventSource.addEventListener('error', (e) => {
    const data = JSON.parse((e as MessageEvent).data);
    useAgentStore.getState().updateTask(data.taskId, {
      status: 'failed',
      error: data.error,
    });
  });

  eventSource.onerror = () => {
    console.error('SSE error, attempting reconnect...');
    attemptReconnect(taskId);
  };
}

function attemptReconnect(taskId: string): void {
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.error('Max SSE reconnect attempts reached');
    useAgentStore.getState().setIsStreaming(false);
    return;
  }
  reconnectAttempts++;
  const delay = RECONNECT_DELAY * Math.pow(2, reconnectAttempts - 1);
  reconnectTimer = setTimeout(() => connectSSE(taskId), delay);
}

export function disconnectSSE(): void {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }
}
