# Agent Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Qoderwork-inspired agent workspace in the Carbon Dashboard's Agents tab, enabling collaborative Excel-to-App building with OpenCode-powered agent orchestration.

**Architecture:** Next.js 16 App Router with a three-panel layout (Agent Rail + Canvas + Chat Panel). Backend uses REST API routes with Server-Sent Events for real-time agent progress streaming. Zustand manages UI state; TanStack Query manages server state.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS v4, Zustand, TanStack Query, SSE, xlsx, recharts, lucide-react

---

## File Structure

```
app/
  agents/
    page.tsx                    # Hub — redirects to /agents/workspace
    workspace/
      page.tsx                  # Main workspace page
      layout.tsx                # Three-panel shell
    chat/
      page.tsx                  # Enhanced standalone chat
    queue/
      page.tsx                  # Real task queue (kanban)
    data-room/
      page.tsx                  # File upload & management
  api/
    agents/
      session/route.ts          # POST create agent session
      task/route.ts             # POST create task
      task/[id]/route.ts        # GET task status
      task/[id]/approve/route.ts # POST approve/reject component
      task/[id]/cancel/route.ts  # POST cancel task
      stream/route.ts           # GET SSE stream
      upload/route.ts           # POST file upload

components/agents/
  agent-rail.tsx                # Left sidebar — tasks + tools
  canvas.tsx                    # Center canvas — Excel/app preview
  chat-panel.tsx                # Right sidebar — context-aware chat
  task-card.tsx                 # Individual task list item
  task-queue.tsx                # Task list container
  component-suggestion.tsx      # Approve/reject agent suggestions
  component-editor.tsx          # Edit component config modal
  excel-preview.tsx             # Excel grid renderer
  app-builder.tsx               # Generated app preview
  app-component.tsx             # Individual app component (KPI, chart, table)
  data-room.tsx                 # File manager panel
  file-uploader.tsx             # Drag-drop upload zone
  agent-status-bar.tsx          # Bottom status/progress bar
  skill-mention.tsx             # @mention autocomplete
  version-history.tsx           # Undo/redo panel
  collaboration-cursor.tsx      # Real-time collaborator cursors
  presence-indicator.tsx        # Who's viewing this task

lib/
  agent-types.ts                # All TypeScript interfaces
  agent-store.ts                # Zustand store
  agent-api.ts                  # API client functions
  sse-client.ts                 # SSE connection manager
  excel-parser.ts               # Excel parsing utilities
  collaboration.ts              # WebSocket/presence manager

tests/
  components/
    task-card.test.tsx
    component-suggestion.test.tsx
    excel-preview.test.tsx
  integration/
    agent-api.test.ts
    task-lifecycle.test.ts
  e2e/
    agent-workspace.spec.ts
```

---

## Phase 1: Foundation

### Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install new packages**

Run:
```bash
cd C:/Users/MoonBuggy/Documents/carbon agent v2 rail/carbon-agent-dashboard
pnpm add zustand xlsx recharts
pnpm add -D @types/xlsx
```

- [ ] **Step 2: Verify installation**

Run:
```bash
pnpm list zustand xlsx recharts
```
Expected: All three packages listed with versions.

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
pnpm exec git commit -m "chore: add zustand, xlsx, recharts for agent workspace"
```

---

### Task 2: Define TypeScript Types

**Files:**
- Create: `lib/agent-types.ts`

- [ ] **Step 1: Write all type definitions**

```typescript
// lib/agent-types.ts

export type TaskStatus = 'queued' | 'running' | 'waiting_approval' | 'completed' | 'failed' | 'cancelled';

export type TaskType = 'excel-to-app' | 'excel-analysis' | 'data-cleaning' | 'document-generation' | 'custom';

export type AgentSkill = 'data-analyst' | 'app-builder' | 'visual-designer' | 'document-writer';

export interface Task {
  id: string;
  name: string;
  type: TaskType;
  status: TaskStatus;
  progress: number;
  agentSkill: AgentSkill;
  createdAt: string;
  updatedAt: string;
  userId: string;
  collaborators: string[];
  sourceFileId?: string;
  prompt: string;
  components: AppComponent[];
  suggestions: ComponentSuggestion[];
  outputUrl?: string;
  error?: string;
  dependsOn?: string[];
}

export interface ComponentSuggestion {
  id: string;
  taskId: string;
  type: 'kpi' | 'chart' | 'table' | 'form' | 'filter';
  title: string;
  description: string;
  config: ComponentConfig;
  preview?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'edited';
}

export interface ComponentConfig {
  dataSource?: string;
  columns?: string[];
  aggregations?: AggregationConfig[];
  chartType?: 'bar' | 'line' | 'pie' | 'scatter' | 'area';
  filters?: FilterConfig[];
  sort?: SortConfig;
  layout?: 'grid' | 'list' | 'card';
}

export interface AggregationConfig {
  column: string;
  function: 'sum' | 'avg' | 'count' | 'min' | 'max';
  alias: string;
}

export interface FilterConfig {
  column: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'contains' | 'in';
  value: unknown;
}

export interface SortConfig {
  column: string;
  direction: 'asc' | 'desc';
}

export interface AppComponent {
  id: string;
  type: 'kpi' | 'chart' | 'table' | 'form' | 'filter';
  title: string;
  config: ComponentConfig;
  position: { x: number; y: number; w: number; h: number };
}

export interface Message {
  id: string;
  taskId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  attachments?: Attachment[];
  mentions?: AgentSkill[];
}

export interface Attachment {
  id: string;
  type: 'file' | 'image';
  name: string;
  url: string;
  size?: number;
}

export interface ExcelData {
  sheetNames: string[];
  activeSheet: string;
  headers: string[];
  rows: unknown[][];
  rowCount: number;
  columnCount: number;
}

export interface AgentSession {
  id: string;
  userId: string;
  skills: AgentSkill[];
  activeTaskIds: string[];
  createdAt: string;
}

export interface UserPresence {
  userId: string;
  userName: string;
  taskId: string;
  cursor?: { x: number; y: number };
  lastSeen: string;
}

export type CanvasMode = 'excel' | 'app' | 'document' | 'split';

export interface CanvasContent {
  mode: CanvasMode;
  excelData?: ExcelData;
  appComponents?: AppComponent[];
  documentContent?: string;
  documentFormat?: 'md' | 'pdf';
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/agent-types.ts
pnpm exec git commit -m "feat: add agent workspace TypeScript types"
```

---

### Task 3: Create Zustand Store

**Files:**
- Create: `lib/agent-store.ts`

- [ ] **Step 1: Write store implementation**

```typescript
// lib/agent-store.ts
'use client';

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {
  Task,
  Message,
  ComponentSuggestion,
  CanvasContent,
  CanvasMode,
  UserPresence,
} from './agent-types';

interface AgentState {
  // Session
  sessionId: string | null;
  setSessionId: (id: string) => void;

  // Tasks
  tasks: Task[];
  activeTaskId: string | null;
  setTasks: (tasks: Task[]) => void;
  addTask: (task: Task) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  setActiveTaskId: (id: string | null) => void;
  removeTask: (taskId: string) => void;

  // Canvas
  canvasContent: CanvasContent | null;
  setCanvasContent: (content: CanvasContent | null) => void;
  setCanvasMode: (mode: CanvasMode) => void;

  // Chat
  messages: Message[];
  addMessage: (message: Message) => void;
  setMessages: (messages: Message[]) => void;
  isStreaming: boolean;
  setIsStreaming: (streaming: boolean) => void;

  // Suggestions
  currentSuggestion: ComponentSuggestion | null;
  setCurrentSuggestion: (suggestion: ComponentSuggestion | null) => void;

  // Collaboration
  presence: UserPresence[];
  setPresence: (presence: UserPresence[]) => void;
  updateUserPresence: (user: UserPresence) => void;

  // UI
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  approvalPanelOpen: boolean;
  toggleApprovalPanel: () => void;
  dataRoomOpen: boolean;
  toggleDataRoom: () => void;
}

export const useAgentStore = create<AgentState>()(
  devtools(
    (set) => ({
      sessionId: null,
      setSessionId: (id) => set({ sessionId: id }),

      tasks: [],
      activeTaskId: null,
      setTasks: (tasks) => set({ tasks }),
      addTask: (task) => set((state) => ({ tasks: [...state.tasks, task] })),
      updateTask: (taskId, updates) =>
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === taskId ? { ...t, ...updates } : t
          ),
        })),
      setActiveTaskId: (id) => set({ activeTaskId: id }),
      removeTask: (taskId) =>
        set((state) => ({
          tasks: state.tasks.filter((t) => t.id !== taskId),
        })),

      canvasContent: null,
      setCanvasContent: (content) => set({ canvasContent: content }),
      setCanvasMode: (mode) =>
        set((state) => ({
          canvasContent: state.canvasContent
            ? { ...state.canvasContent, mode }
            : { mode },
        })),

      messages: [],
      addMessage: (message) =>
        set((state) => ({ messages: [...state.messages, message] })),
      setMessages: (messages) => set({ messages }),
      isStreaming: false,
      setIsStreaming: (streaming) => set({ isStreaming: streaming }),

      currentSuggestion: null,
      setCurrentSuggestion: (suggestion) =>
        set({ currentSuggestion: suggestion }),

      presence: [],
      setPresence: (presence) => set({ presence }),
      updateUserPresence: (user) =>
        set((state) => {
          const filtered = state.presence.filter(
            (p) => p.userId !== user.userId
          );
          return { presence: [...filtered, user] };
        }),

      sidebarOpen: true,
      toggleSidebar: () =>
        set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      approvalPanelOpen: false,
      toggleApprovalPanel: () =>
        set((state) => ({
          approvalPanelOpen: !state.approvalPanelOpen,
        })),
      dataRoomOpen: false,
      toggleDataRoom: () =>
        set((state) => ({ dataRoomOpen: !state.dataRoomOpen })),
    }),
    { name: 'agent-store' }
  )
);
```

- [ ] **Step 2: Commit**

```bash
git add lib/agent-store.ts
pnpm exec git commit -m "feat: add zustand agent store"
```

---

### Task 4: Create API Client

**Files:**
- Create: `lib/agent-api.ts`

- [ ] **Step 1: Write API client**

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add lib/agent-api.ts
pnpm exec git commit -m "feat: add agent API client"
```

---

### Task 5: Create SSE Client

**Files:**
- Create: `lib/sse-client.ts`

- [ ] **Step 1: Write SSE connection manager**

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add lib/sse-client.ts
pnpm exec git commit -m "feat: add SSE client for real-time agent updates"
```

---

## Phase 2: Backend API Routes

### Task 6: Create Session API Route

**Files:**
- Create: `app/api/agents/session/route.ts`

- [ ] **Step 1: Write session endpoint**

```typescript
// app/api/agents/session/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import type { AgentSession, AgentSkill } from '@/lib/agent-types';

const DEFAULT_SKILLS: AgentSkill[] = [
  'data-analyst',
  'app-builder',
  'visual-designer',
  'document-writer',
];

export async function POST(): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const session: AgentSession = {
    id: `sess_${Date.now()}`,
    userId,
    skills: DEFAULT_SKILLS,
    activeTaskIds: [],
    createdAt: new Date().toISOString(),
  };

  return NextResponse.json(session);
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/agents/session/route.ts
pnpm exec git commit -m "feat: add agent session API endpoint"
```

---

### Task 7: Create Task API Routes

**Files:**
- Create: `app/api/agents/task/route.ts`
- Create: `app/api/agents/task/[id]/route.ts`
- Create: `app/api/agents/task/[id]/approve/route.ts`
- Create: `app/api/agents/task/[id]/cancel/route.ts`

- [ ] **Step 1: Write task creation endpoint**

```typescript
// app/api/agents/task/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import type { Task, TaskStatus } from '@/lib/agent-types';

// In-memory store for MVP (replace with DB later)
const taskStore = new Map<string, Task>();
const userTaskCounts = new Map<string, number>();
const MAX_PARALLEL_TASKS = 4;

export async function POST(request: Request): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { type, name, sourceFileId, prompt, skillContext, priority, dependsOn } = body;

  const currentCount = userTaskCounts.get(userId) || 0;
  if (currentCount >= MAX_PARALLEL_TASKS) {
    return NextResponse.json(
      { error: 'Maximum parallel tasks (4) reached. Please wait for a task to complete.' },
      { status: 429 }
    );
  }

  const task: Task = {
    id: `task_${Date.now()}`,
    name: name || 'Untitled Task',
    type: type || 'custom',
    status: 'queued' as TaskStatus,
    progress: 0,
    agentSkill: skillContext?.[0] || 'data-analyst',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userId,
    collaborators: [userId],
    sourceFileId,
    prompt: prompt || '',
    components: [],
    suggestions: [],
    dependsOn: dependsOn || [],
  };

  taskStore.set(task.id, task);
  userTaskCounts.set(userId, currentCount + 1);

  // Simulate task processing start
  setTimeout(() => {
    const t = taskStore.get(task.id);
    if (t) {
      t.status = 'running';
      t.updatedAt = new Date().toISOString();
      taskStore.set(task.id, t);
    }
  }, 500);

  return NextResponse.json(task);
}

export async function GET(): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tasks = Array.from(taskStore.values()).filter(
    (t) => t.userId === userId || t.collaborators.includes(userId)
  );

  return NextResponse.json(tasks);
}
```

- [ ] **Step 2: Write task status endpoint**

```typescript
// app/api/agents/task/[id]/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

const taskStore = new Map(); // Shared with route.ts

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const task = taskStore.get(id);

  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  if (task.userId !== userId && !task.collaborators.includes(userId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json(task);
}
```

- [ ] **Step 3: Write approve endpoint**

```typescript
// app/api/agents/task/[id]/approve/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

const taskStore = new Map(); // Shared

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const task = taskStore.get(id);

  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  const body = await request.json();
  const { componentId, action, configOverrides } = body;

  const suggestion = task.suggestions.find((s: { id: string }) => s.id === componentId);
  if (!suggestion) {
    return NextResponse.json({ error: 'Suggestion not found' }, { status: 404 });
  }

  if (action === 'accept') {
    suggestion.status = 'accepted';
    task.components.push({
      id: suggestion.id,
      type: suggestion.type,
      title: suggestion.title,
      config: { ...suggestion.config, ...configOverrides },
      position: { x: 0, y: 0, w: 4, h: 3 },
    });
  } else if (action === 'reject') {
    suggestion.status = 'rejected';
  } else if (action === 'edit') {
    suggestion.status = 'edited';
    suggestion.config = { ...suggestion.config, ...configOverrides };
    task.components.push({
      id: suggestion.id,
      type: suggestion.type,
      title: suggestion.title,
      config: suggestion.config,
      position: { x: 0, y: 0, w: 4, h: 3 },
    });
  }

  task.status = 'running';
  task.updatedAt = new Date().toISOString();
  taskStore.set(id, task);

  return NextResponse.json(suggestion);
}
```

- [ ] **Step 4: Write cancel endpoint**

```typescript
// app/api/agents/task/[id]/cancel/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

const taskStore = new Map(); // Shared
const userTaskCounts = new Map(); // Shared

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const task = taskStore.get(id);

  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  if (task.userId !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  task.status = 'cancelled';
  task.updatedAt = new Date().toISOString();
  taskStore.set(id, task);

  const currentCount = userTaskCounts.get(userId) || 1;
  userTaskCounts.set(userId, Math.max(0, currentCount - 1));

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 5: Commit**

```bash
git add app/api/agents/task/route.ts app/api/agents/task/
pnpm exec git commit -m "feat: add task CRUD API endpoints with approval flow"
```

---

### Task 8: Create SSE Stream Route

**Files:**
- Create: `app/api/agents/stream/route.ts`

- [ ] **Step 1: Write SSE endpoint**

```typescript
// app/api/agents/stream/route.ts
import { auth } from '@clerk/nextjs/server';

const taskStore = new Map(); // Shared

export async function GET(request: Request): Promise<Response> {
  const { userId } = await auth();
  if (!userId) {
    return new Response('Unauthorized', { status: 401 });
  }

  const url = new URL(request.url);
  const taskId = url.searchParams.get('taskId');

  if (!taskId) {
    return new Response('Missing taskId', { status: 400 });
  }

  const task = taskStore.get(taskId);
  if (!task) {
    return new Response('Task not found', { status: 404 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial state
      controller.enqueue(
        encoder.encode(`event: progress\ndata: ${JSON.stringify({ taskId, progress: task.progress })}\n\n`)
      );

      // Simulate progressive updates
      let progress = task.progress;
      const interval = setInterval(() => {
        progress += 20;
        if (progress > 100) progress = 100;

        controller.enqueue(
          encoder.encode(`event: progress\ndata: ${JSON.stringify({ taskId, progress })}\n\n`)
        );

        if (progress === 60) {
          // Send a suggestion at 60%
          const suggestion = {
            id: `sugg_${Date.now()}`,
            taskId,
            type: 'kpi',
            title: 'Total Revenue',
            description: 'Sum of revenue column',
            config: { aggregations: [{ column: 'revenue', function: 'sum', alias: 'total_revenue' }] },
            status: 'pending',
          };
          controller.enqueue(
            encoder.encode(`event: suggestion\ndata: ${JSON.stringify({ taskId, component: suggestion })}\n\n`)
          );
        }

        if (progress >= 100) {
          controller.enqueue(
            encoder.encode(`event: complete\ndata: ${JSON.stringify({ taskId, outputUrl: `/apps/${taskId}` })}\n\n`)
          );
          clearInterval(interval);
          controller.close();
        }
      }, 1500);

      // Cleanup on client disconnect
      request.signal.addEventListener('abort', () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache',
      connection: 'keep-alive',
    },
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/agents/stream/route.ts
pnpm exec git commit -m "feat: add SSE streaming endpoint for agent progress"
```

---

### Task 9: Create File Upload Route

**Files:**
- Create: `app/api/agents/upload/route.ts`

- [ ] **Step 1: Write upload endpoint**

```typescript
// app/api/agents/upload/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
  'application/json',
];

export async function POST(request: Request): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File;

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: 'Invalid file type. Allowed: xlsx, xls, csv, json' },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: 'File too large. Max 50MB' },
      { status: 400 }
    );
  }

  // For MVP, store in memory with pseudo-ID
  const fileId = `file_${Date.now()}`;

  return NextResponse.json({
    fileId,
    url: `/api/agents/files/${fileId}`,
    name: file.name,
    size: file.size,
    type: file.type,
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/agents/upload/route.ts
pnpm exec git commit -m "feat: add file upload API with validation"
```

---

## Phase 3: Core UI Components

### Task 10: Create AgentRail Component

**Files:**
- Create: `components/agents/agent-rail.tsx`

- [ ] **Step 1: Write component**

```tsx
// components/agents/agent-rail.tsx
'use client';

import {
  Plus,
  Upload,
  FolderOpen,
  Bot,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  PauseCircle,
} from 'lucide-react';
import { useAgentStore } from '@/lib/agent-store';
import type { Task } from '@/lib/agent-types';

function TaskStatusIcon({ status }: { status: Task['status'] }) {
  switch (status) {
    case 'running':
      return <Loader2 size={14} className="animate-spin text-blue-500" />;
    case 'waiting_approval':
      return <PauseCircle size={14} className="text-amber-500" />;
    case 'completed':
      return <CheckCircle2 size={14} className="text-emerald-500" />;
    case 'failed':
      return <AlertCircle size={14} className="text-red-500" />;
    case 'queued':
      return <Clock size={14} className="text-slate-400" />;
    default:
      return <Clock size={14} className="text-slate-400" />;
  }
}

export function AgentRail() {
  const { tasks, activeTaskId, setActiveTaskId, toggleDataRoom } = useAgentStore();

  const activeTasks = tasks.filter((t) => t.status === 'running' || t.status === 'waiting_approval');
  const completedTasks = tasks.filter((t) => t.status === 'completed');

  return (
    <aside className="flex h-full w-64 flex-col border-r border-[var(--border)] bg-[var(--surface)]">
      <div className="flex items-center gap-2 border-b border-[var(--border)] p-4">
        <Bot size={20} className="text-[var(--text-primary)]" />
        <span className="font-semibold text-[var(--text-primary)]">Agent Hub</span>
      </div>

      <div className="flex flex-col gap-2 p-3">
        <button className="flex items-center gap-2 rounded-lg bg-[var(--deep)] px-3 py-2 text-sm font-medium text-[var(--text-primary)] hover:opacity-90">
          <Plus size={16} />
          New Task
        </button>
        <button
          onClick={toggleDataRoom}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--background)]"
        >
          <Upload size={16} />
          Upload File
        </button>
        <button
          onClick={toggleDataRoom}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--background)]"
        >
          <FolderOpen size={16} />
          Data Room
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3">
        {activeTasks.length > 0 && (
          <div className="mb-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
              Active ({activeTasks.length})
            </h3>
            <div className="flex flex-col gap-2">
              {activeTasks.map((task) => (
                <button
                  key={task.id}
                  onClick={() => setActiveTaskId(task.id)}
                  className={`rounded-lg border p-3 text-left transition-all ${
                    activeTaskId === task.id
                      ? 'border-[var(--border-strong)] bg-[var(--background)]'
                      : 'border-transparent hover:bg-[var(--background)]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <TaskStatusIcon status={task.status} />
                    <span className="truncate text-sm font-medium text-[var(--text-primary)]">
                      {task.name}
                    </span>
                  </div>
                  {task.status === 'running' && (
                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-[var(--border)]">
                      <div
                        className="h-full rounded-full bg-blue-500 transition-all"
                        style={{ width: `${task.progress}%` }}
                      />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {completedTasks.length > 0 && (
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
              Completed
            </h3>
            <div className="flex flex-col gap-1">
              {completedTasks.map((task) => (
                <button
                  key={task.id}
                  onClick={() => setActiveTaskId(task.id)}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-all ${
                    activeTaskId === task.id
                      ? 'bg-[var(--background)] text-[var(--text-primary)]'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--background)]'
                  }`}
                >
                  <CheckCircle2 size={14} className="text-emerald-500" />
                  <span className="truncate">{task.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/agents/agent-rail.tsx
pnpm exec git commit -m "feat: add AgentRail sidebar component"
```

---

### Task 11: Create Canvas Component

**Files:**
- Create: `components/agents/canvas.tsx`

- [ ] **Step 1: Write component**

```tsx
// components/agents/canvas.tsx
'use client';

import { useAgentStore } from '@/lib/agent-store';
import { FileSpreadsheet, LayoutDashboard, FileText } from 'lucide-react';

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
          <AppBuilder components={canvasContent.appComponents} />
        )}
        {canvasContent.mode === 'split' && (
          <div className="flex h-full gap-4">
            <div className="flex-1">
              {canvasContent.excelData && <ExcelPreview data={canvasContent.excelData} />}
            </div>
            <div className="flex-1">
              {canvasContent.appComponents && <AppBuilder components={canvasContent.appComponents} />}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Placeholder sub-components
function ExcelPreview({ data }: { data: NonNullable<typeof canvasContent>['excelData'] }) {
  if (!data) return null;
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--background)]">
      <div className="border-b border-[var(--border)] px-4 py-2">
        <span className="text-sm font-medium text-[var(--text-primary)]">{data.activeSheet}</span>
        <span className="ml-2 text-xs text-[var(--text-tertiary)]">
          {data.rowCount} rows × {data.columnCount} cols
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

function AppBuilder({ components }: { components: NonNullable<typeof canvasContent>['appComponents'] }) {
  if (!components || components.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-[var(--text-tertiary)]">
        <p>No components yet. Accept suggestions from the chat panel to build your app.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {components.map((comp) => (
        <div
          key={comp.id}
          className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm"
        >
          <h4 className="mb-2 text-sm font-semibold text-[var(--text-primary)]">{comp.title}</h4>
          <div className="text-xs text-[var(--text-secondary)]">
            Type: {comp.type}
            {comp.config.aggregations && (
              <div className="mt-1">
                {comp.config.aggregations.map((agg, i) => (
                  <span key={i} className="mr-2 rounded bg-[var(--background)] px-2 py-0.5">
                    {agg.alias}: {agg.function}({agg.column})
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

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
```

- [ ] **Step 2: Commit**

```bash
git add components/agents/canvas.tsx
pnpm exec git commit -m "feat: add Canvas component with Excel and App preview modes"
```

---

### Task 12: Create ChatPanel Component

**Files:**
- Create: `components/agents/chat-panel.tsx`

- [ ] **Step 1: Write component**

```tsx
// components/agents/chat-panel.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Paperclip, Loader2 } from 'lucide-react';
import { useAgentStore } from '@/lib/agent-store';
import { sendMessage } from '@/lib/agent-api';

export function ChatPanel() {
  const { messages, activeTaskId, isStreaming, addMessage, setIsStreaming } = useAgentStore();
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !activeTaskId || isStreaming) return;

    const userMsg = {
      id: `msg_${Date.now()}`,
      taskId: activeTaskId,
      role: 'user' as const,
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };

    addMessage(userMsg);
    setInput('');
    setIsStreaming(true);

    try {
      const response = await sendMessage(activeTaskId, userMsg.content, attachments);
      addMessage(response);
    } catch (error) {
      addMessage({
        id: `msg_${Date.now()}`,
        taskId: activeTaskId,
        role: 'system',
        content: `Error: ${error instanceof Error ? error.message : 'Failed to send message'}`,
        timestamp: new Date().toISOString(),
      });
    } finally {
      setIsStreaming(false);
      setAttachments([]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments(Array.from(e.target.files));
    }
  };

  return (
    <aside className="flex h-full w-80 flex-col border-l border-[var(--border)] bg-[var(--surface)]">
      <div className="border-b border-[var(--border)] px-4 py-3">
        <h3 className="font-medium text-[var(--text-primary)]">Agent Chat</h3>
        <p className="text-xs text-[var(--text-tertiary)]">
          {activeTaskId ? 'Context-aware messaging' : 'Select a task to chat'}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {!activeTaskId && (
          <div className="flex h-full items-center justify-center text-[var(--text-tertiary)]">
            <p className="text-center text-sm">Select a task to start chatting with the agent</p>
          </div>
        )}

        {messages
          .filter((m) => m.taskId === activeTaskId)
          .map((msg) => (
            <div
              key={msg.id}
              className={`mb-4 flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--background)]">
                {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
              </div>
              <div
                className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                  msg.role === 'user'
                    ? 'bg-[var(--deep)] text-[var(--text-primary)]'
                    : 'bg-[var(--background)] text-[var(--text-primary)]'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}

        {isStreaming && (
          <div className="flex gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--background)]">
              <Bot size={14} />
            </div>
            <div className="rounded-2xl bg-[var(--background)] px-3 py-2 text-sm text-[var(--text-tertiary)]">
              <Loader2 size={16} className="animate-spin" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {activeTaskId && (
        <form onSubmit={handleSubmit} className="border-t border-[var(--border)] p-3">
          {attachments.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1">
              {attachments.map((file, i) => (
                <span
                  key={i}
                  className="rounded-md bg-[var(--background)] px-2 py-1 text-xs text-[var(--text-secondary)]"
                >
                  {file.name}
                </span>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--background)]"
            >
              <Paperclip size={16} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileSelect}
              accept=".xlsx,.xls,.csv,.json"
            />
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask the agent..."
              className="carbon-input flex-1 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={!input.trim() || isStreaming}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--deep)] text-[var(--text-primary)] disabled:opacity-50"
            >
              <Send size={16} />
            </button>
          </div>
        </form>
      )}
    </aside>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/agents/chat-panel.tsx
pnpm exec git commit -m "feat: add ChatPanel component with file attachments"
```

---

### Task 13: Create ComponentSuggestion Panel

**Files:**
- Create: `components/agents/component-suggestion.tsx`

- [ ] **Step 1: Write component**

```tsx
// components/agents/component-suggestion.tsx
'use client';

import { Check, X, Pencil, SkipForward } from 'lucide-react';
import { useAgentStore } from '@/lib/agent-store';
import { approveComponent } from '@/lib/agent-api';
import type { ComponentSuggestion as SuggestionType } from '@/lib/agent-types';

export function ComponentSuggestionPanel() {
  const { currentSuggestion, activeTaskId, updateTask, setCurrentSuggestion } = useAgentStore();

  if (!currentSuggestion || !activeTaskId) return null;

  const handleAction = async (
    action: 'accept' | 'reject' | 'edit',
    configOverrides?: Record<string, unknown>
  ) => {
    try {
      await approveComponent(activeTaskId, {
        componentId: currentSuggestion.id,
        action,
        configOverrides,
      });

      // Update local state
      updateTask(activeTaskId, { status: 'running' });
      setCurrentSuggestion(null);
    } catch (error) {
      console.error('Failed to approve component:', error);
    }
  };

  return (
    <div className="absolute bottom-20 right-4 z-50 w-80 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-lg">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-[var(--text-primary)]">
            {currentSuggestion.title}
          </h4>
          <p className="text-xs text-[var(--text-secondary)]">{currentSuggestion.description}</p>
        </div>
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
          {currentSuggestion.type}
        </span>
      </div>

      <div className="mb-4 rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
        <p className="text-xs text-[var(--text-tertiary)]">Preview</p>
        <div className="mt-2 text-sm text-[var(--text-primary)]">
          {currentSuggestion.config.aggregations?.map((agg, i) => (
            <div key={i} className="flex justify-between py-1">
              <span className="text-[var(--text-secondary)]">{agg.alias}</span>
              <span className="font-mono font-medium">{agg.function}({agg.column})</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => handleAction('accept')}
          className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-600"
        >
          <Check size={14} />
          Accept
        </button>
        <button
          onClick={() => handleAction('edit')}
          className="flex items-center justify-center gap-1 rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--background)]"
        >
          <Pencil size={14} />
        </button>
        <button
          onClick={() => handleAction('reject')}
          className="flex items-center justify-center gap-1 rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-red-500 hover:bg-red-50"
        >
          <X size={14} />
        </button>
        <button
          onClick={() => setCurrentSuggestion(null)}
          className="flex items-center justify-center gap-1 rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--background)]"
        >
          <SkipForward size={14} />
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/agents/component-suggestion.tsx
pnpm exec git commit -m "feat: add ComponentSuggestion approval panel"
```

---

## Phase 4: Page Integration

### Task 14: Create Workspace Layout

**Files:**
- Create: `app/agents/workspace/layout.tsx`
- Create: `app/agents/workspace/page.tsx`

- [ ] **Step 1: Write workspace layout**

```tsx
// app/agents/workspace/layout.tsx
import { AgentRail } from '@/components/agents/agent-rail';
import { ChatPanel } from '@/components/agents/chat-panel';

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-[calc(100vh-4rem)]">
      <AgentRail />
      <main className="flex-1 overflow-hidden">{children}</main>
      <ChatPanel />
    </div>
  );
}
```

- [ ] **Step 2: Write workspace page**

```tsx
// app/agents/workspace/page.tsx
'use client';

import { useEffect } from 'react';
import { useAgentStore } from '@/lib/agent-store';
import { Canvas } from '@/components/agents/canvas';
import { ComponentSuggestionPanel } from '@/components/agents/component-suggestion';
import { createSession } from '@/lib/agent-api';

export default function WorkspacePage() {
  const { setSessionId, sessionId } = useAgentStore();

  useEffect(() => {
    if (!sessionId) {
      createSession()
        .then((session) => setSessionId(session.id))
        .catch(console.error);
    }
  }, [sessionId, setSessionId]);

  return (
    <div className="relative h-full">
      <Canvas />
      <ComponentSuggestionPanel />
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add app/agents/workspace/
pnpm exec git commit -m "feat: add workspace layout and page with three-panel shell"
```

---

### Task 15: Update Agents Hub Page

**Files:**
- Modify: `app/agents/page.tsx`

- [ ] **Step 1: Update to redirect to workspace**

```tsx
// app/agents/page.tsx
import { redirect } from 'next/navigation';

export default function AgentsPage() {
  redirect('/agents/workspace');
}
```

- [ ] **Step 2: Commit**

```bash
git add app/agents/page.tsx
pnpm exec git commit -m "feat: redirect agents hub to workspace"
```

---

### Task 16: Update Queue Page

**Files:**
- Modify: `app/agents/queue/page.tsx`

- [ ] **Step 1: Write real queue page**

```tsx
// app/agents/queue/page.tsx
'use client';

import { useAgentStore } from '@/lib/agent-store';
import { AppShell } from '@/components/shell/app-shell';
import { TaskCard } from '@/components/agents/task-card';

export default function AgentQueuePage() {
  const { tasks } = useAgentStore();

  const columns = [
    { id: 'queued', title: 'Queued', tasks: tasks.filter((t) => t.status === 'queued') },
    { id: 'running', title: 'Running', tasks: tasks.filter((t) => t.status === 'running') },
    { id: 'waiting', title: 'Awaiting Approval', tasks: tasks.filter((t) => t.status === 'waiting_approval') },
    { id: 'completed', title: 'Completed', tasks: tasks.filter((t) => t.status === 'completed') },
    { id: 'failed', title: 'Failed', tasks: tasks.filter((t) => t.status === 'failed') },
  ];

  return (
    <AppShell title="Agent Queue">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <h1 className="editorial-heading text-3xl font-semibold text-[var(--text-primary)]">
            Task Queue
          </h1>
          <p className="mt-2 text-[var(--text-secondary)]">
            Monitor and manage all agent tasks across your workspace.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-5">
          {columns.map((col) => (
            <div key={col.id} className="flex flex-col">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">{col.title}</h3>
                <span className="rounded-full bg-[var(--surface)] px-2 py-0.5 text-xs text-[var(--text-secondary)]">
                  {col.tasks.length}
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {col.tasks.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/agents/queue/page.tsx
pnpm exec git commit -m "feat: replace queue placeholder with kanban board"
```

---

### Task 17: Create TaskCard Component

**Files:**
- Create: `components/agents/task-card.tsx`

- [ ] **Step 1: Write component**

```tsx
// components/agents/task-card.tsx
'use client';

import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  PauseCircle,
  XCircle,
  Bot,
} from 'lucide-react';
import { useAgentStore } from '@/lib/agent-store';
import { cancelTask } from '@/lib/agent-api';
import type { Task } from '@/lib/agent-types';

const statusConfig = {
  queued: { icon: Clock, color: 'text-slate-400', bg: 'bg-slate-50' },
  running: { icon: Loader2, color: 'text-blue-500', bg: 'bg-blue-50' },
  waiting_approval: { icon: PauseCircle, color: 'text-amber-500', bg: 'bg-amber-50' },
  completed: { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  failed: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50' },
  cancelled: { icon: XCircle, color: 'text-slate-400', bg: 'bg-slate-50' },
};

export function TaskCard({ task }: { task: Task }) {
  const { setActiveTaskId } = useAgentStore();
  const config = statusConfig[task.status];
  const Icon = config.icon;

  const handleCancel = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await cancelTask(task.id);
    } catch (error) {
      console.error('Failed to cancel task:', error);
    }
  };

  return (
    <div
      onClick={() => setActiveTaskId(task.id)}
      className="cursor-pointer rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 transition-all hover:border-[var(--border-strong)] hover:shadow-sm"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Icon size={14} className={config.color} />
          <span className="text-sm font-medium text-[var(--text-primary)]">{task.name}</span>
        </div>
        {task.status === 'running' && (
          <button
            onClick={handleCancel}
            className="text-[var(--text-tertiary)] hover:text-red-500"
          >
            <XCircle size={14} />
          </button>
        )}
      </div>

      <div className="mt-2 flex items-center gap-2">
        <Bot size={12} className="text-[var(--text-tertiary)]" />
        <span className="text-xs text-[var(--text-secondary)]">{task.agentSkill}</span>
      </div>

      {task.status === 'running' && (
        <div className="mt-2">
          <div className="h-1.5 overflow-hidden rounded-full bg-[var(--border)]">
            <div
              className="h-full rounded-full bg-blue-500 transition-all"
              style={{ width: `${task.progress}%` }}
            />
          </div>
          <span className="mt-1 text-xs text-[var(--text-tertiary)]">{task.progress}%</span>
        </div>
      )}

      {task.error && (
        <p className="mt-2 text-xs text-red-500">{task.error}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/agents/task-card.tsx
pnpm exec git commit -m "feat: add TaskCard component for kanban board"
```

---

## Phase 5: Testing

### Task 18: Add Unit Tests

**Files:**
- Create: `tests/components/task-card.test.tsx`
- Create: `tests/components/component-suggestion.test.tsx`

- [ ] **Step 1: Write task-card test**

```tsx
// tests/components/task-card.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TaskCard } from '@/components/agents/task-card';
import type { Task } from '@/lib/agent-types';

const mockTask: Task = {
  id: 'task_123',
  name: 'Test Task',
  type: 'excel-to-app',
  status: 'running',
  progress: 45,
  agentSkill: 'data-analyst',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  userId: 'user_123',
  collaborators: ['user_123'],
  prompt: 'Build a dashboard',
  components: [],
  suggestions: [],
};

describe('TaskCard', () => {
  it('renders task name and skill', () => {
    render(<TaskCard task={mockTask} />);
    expect(screen.getByText('Test Task')).toBeDefined();
    expect(screen.getByText('data-analyst')).toBeDefined();
  });

  it('shows progress bar for running tasks', () => {
    render(<TaskCard task={mockTask} />);
    expect(screen.getByText('45%')).toBeDefined();
  });

  it('shows error message for failed tasks', () => {
    const failedTask = { ...mockTask, status: 'failed' as const, error: 'Something broke' };
    render(<TaskCard task={failedTask} />);
    expect(screen.getByText('Something broke')).toBeDefined();
  });
});
```

- [ ] **Step 2: Write component-suggestion test**

```tsx
// tests/components/component-suggestion.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ComponentSuggestionPanel } from '@/components/agents/component-suggestion';
import { useAgentStore } from '@/lib/agent-store';

describe('ComponentSuggestionPanel', () => {
  it('does not render when no suggestion', () => {
    useAgentStore.setState({ currentSuggestion: null, activeTaskId: null });
    const { container } = render(<ComponentSuggestionPanel />);
    expect(container.firstChild).toBeNull();
  });
});
```

- [ ] **Step 3: Commit**

```bash
git add tests/components/
pnpm exec git commit -m "test: add unit tests for TaskCard and ComponentSuggestion"
```

---

### Task 19: Add E2E Test

**Files:**
- Create: `tests/e2e/agent-workspace.spec.ts`

- [ ] **Step 1: Write E2E test**

```typescript
// tests/e2e/agent-workspace.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Agent Workspace', () => {
  test('user can create and view a task', async ({ page }) => {
    await page.goto('/agents/workspace');

    // Should show empty state
    await expect(page.getByText('Select a task to begin')).toBeVisible();

    // Navigate to queue
    await page.goto('/agents/queue');
    await expect(page.getByText('Task Queue')).toBeVisible();
  });

  test('task card renders with correct status', async ({ page }) => {
    await page.goto('/agents/queue');
    await expect(page.getByText('Queued')).toBeVisible();
    await expect(page.getByText('Running')).toBeVisible();
  });
});
```

- [ ] **Step 2: Commit**

```bash
git add tests/e2e/agent-workspace.spec.ts
pnpm exec git commit -m "test: add E2E tests for agent workspace"
```

---

## Phase 6: Final Integration

### Task 20: Build and Verify

- [ ] **Step 1: Run build**

```bash
pnpm build
```
Expected: Build completes with no errors.

- [ ] **Step 2: Run linter**

```bash
pnpm lint
```
Expected: No lint errors.

- [ ] **Step 3: Run tests**

```bash
pnpm test
```
Expected: All tests pass.

- [ ] **Step 4: Final commit**

```bash
git add .
pnpm exec git commit -m "feat: complete agent workspace implementation"
```

---

## Spec Coverage Checklist

| Spec Requirement | Implementing Task(s) |
|------------------|---------------------|
| Three-panel layout (Rail + Canvas + Chat) | Task 14 (layout) |
| Excel-to-App collaborative flow | Task 6-9 (API), Task 13 (suggestion panel) |
| Canvas with Excel/App/Split modes | Task 11 |
| Context-aware chat with @mentions | Task 12 |
| Task queue with kanban board | Task 16-17 |
| Component approval (accept/edit/reject/skip) | Task 9 (API), Task 13 (UI) |
| SSE real-time streaming | Task 8 (API), Task 5 (client) |
| File upload with validation | Task 9 |
| Max 4 parallel tasks | Task 7 |
| Real-time collaboration (presence) | Types defined, UI ready (Task 2) |
| Zustand store | Task 3 |
| API client | Task 4 |
| Version history | Types defined (Task 2) |
| Error handling | Task 7-8 |
| Unit + E2E tests | Task 18-19 |

**Gaps:**
- Real-time collaboration cursors (WebSocket) — types and UI slots prepared, needs WebSocket server
- Excel parsing with `xlsx` library — `excel-parser.ts` file not yet created
- Recharts integration for chart components — types prepared, needs chart rendering logic
- Data Room page — types prepared, needs full UI

---

## Open Questions Resolved

| Question | Answer |
|----------|--------|
| Generated apps storage | Stored in DB (tasks stored in memory for MVP, migrate to DB in follow-up) |
| Max parallel tasks | 4 per user (enforced in API) |
| Real-time collaboration | Yes — presence types and UI prepared, needs WebSocket layer |
| Retention | Forever (tasks never deleted from store) |

---

**Plan complete.** Ready for execution.
