# Agent Workspace Design Spec

**Date:** 2026-04-23
**Project:** Carbon Agent Dashboard — Agents Tab Replacement
**Status:** Approved for Implementation

## 1. Overview

### 1.1 Purpose
Replace the placeholder "Agents" tab in the Carbon Dashboard with a full-featured agent workspace inspired by Qoderwork and Cowork by Anthropic. The workspace enables enterprise users to collaborate with AI agents on Excel-based tasks, app creation, and general work orchestration.

### 1.2 Target Users
- Business analysts working with Excel data
- Operations managers building internal tools
- Team leads orchestrating multi-step agent workflows
- Non-technical users who need apps built from spreadsheets

### 1.3 Success Criteria
- User can upload an Excel file and have an agent build an interactive app in under 5 minutes
- Component approval flow feels intuitive and collaborative (not fully auto or fully manual)
- Multiple agents can work in parallel on different aspects of a project
- Task state persists across disconnections and browser refreshes
- UI feels premium and responsive (not generic AI slop)

## 2. Architecture

### 2.1 High-Level Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Top Bar: Context Title + Active Agent Badge + Share        │
├──────────┬───────────────────────────────┬──────────────────┤
│          │                               │                  │
│  AGENT   │         CANVAS                │   CHAT PANEL     │
│  RAIL    │         (Main Stage)          │   (Persistent)   │
│          │                               │                  │
│  - Tasks │  • Excel Preview / Editor     │  Thread with     │
│  - Data  │  • App Builder Canvas         │  current agent   │
│  - Files │  • Document Viewer            │  context-aware   │
│  - Team  │  • Output Preview             │                  │
│          │                               │  @mentions for   │
│          │                               │  skills/agents   │
│          │                               │                  │
├──────────┴───────────────────────────────┴──────────────────┤
│  Bottom: Task Progress Bar / Agent Status Indicators        │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Technology Stack
- **Framework:** Next.js 16.2.4 App Router
- **UI:** React 19.2.4, Tailwind CSS v4
- **State Management:** Zustand (UI state), TanStack Query (server state)
- **Real-time:** Server-Sent Events (SSE) via `/api/agents/stream`
- **Excel Parsing:** `xlsx` library
- **Icons:** Lucide React (already installed)
- **Charts:** To be determined (recharts or chart.js)

### 2.3 Data Flow

```
User Action → Zustand Store → API Route → OpenCode Runtime
                                            ↓
                                    SSE Stream ← Task Update
                                            ↓
                                    Zustand Store ← UI Update
```

1. User submits task via chat or UI action
2. Frontend sends POST to `/api/agents/task`
3. API route forwards to OpenCode agent runtime
4. Agent processes task, emits progress events
5. SSE stream pushes updates to frontend
6. UI updates in real-time (task status, component suggestions)

## 3. Core Features

### 3.1 Excel-to-App Builder (Collaborative Flow)

**Step 1: Upload / Select**
- User uploads Excel file or selects from Data Room
- System validates file format and basic structure
- Agent analyzes sheets, columns, row counts

**Step 2: Agent Analysis & Suggestion**
- Agent suggests app type based on data analysis
- Presents recommendation card with:
  - Detected data structure
  - Suggested app type (dashboard, CRM, inventory, etc.)
  - Confidence score
- User accepts or modifies suggestion

**Step 3: Component-by-Component Approval**
- Agent generates components one at a time:
  - KPI cards (aggregations of numeric columns)
  - Charts (bar, line, pie, scatter based on data types)
  - Data tables (sortable, filterable)
  - Forms (for data entry)
- Each component appears in approval panel
- User can:
  - **Accept:** Component is added to canvas
  - **Edit:** Modify configuration before accepting
  - **Reject:** Agent tries alternative approach
  - **Skip:** Move to next component

**Step 4: Preview & Publish**
- Interactive preview of complete app on canvas
- User can test functionality
- Publish options:
  - Deploy as internal app (shareable link)
  - Export as standalone HTML/JS
  - Embed in existing page

### 3.2 Canvas System

**Modes:**
- **Excel Preview:** Read-only grid view of uploaded spreadsheet
- **App Builder:** Interactive preview of generated application
- **Document Viewer:** For generated reports, PDFs, markdown
- **Split View:** Excel on left, generated app on right for comparison

**Interactions:**
- Click cell in Excel to reference in chat ("Use this column for the chart")
- Drag-and-drop to reorder components in app builder
- Inline editing of component configuration

### 3.3 Chat Panel

**Features:**
- Context-aware messaging (knows current file, task, canvas mode)
- @mentions for skills: `@data-analyst`, `@app-builder`, `@visual-designer`
- File attachments (Excel, CSV, images)
- Message history tied to task context
- Streaming agent responses (typing indicator)

**Commands:**
- `/new` — Start new task
- `/data` — Open Data Room
- `/tasks` — Show task queue
- `/help` — Show available commands

### 3.4 Task Queue (Agent Rail)

**Structure:**
- **Active Tasks:** Currently running or awaiting approval
- **Queued Tasks:** Scheduled but not yet started
- **Completed Tasks:** Finished tasks with output links
- **Failed Tasks:** Tasks that errored, with retry option

**Task Card Info:**
- Task name and type
- Agent skill icon
- Progress bar (for multi-component tasks)
- Status badge (running, queued, waiting approval, done, failed)
- Quick actions (pause, cancel, retry, view)

**Parallel Execution:**
- Multiple tasks can run simultaneously
- Dependency chains supported (Task B waits for Task A)
- Visual pipeline view for chained tasks

### 3.5 Data Room

**Features:**
- File upload (Excel, CSV, JSON)
- Folder organization
- File metadata (size, rows, columns, upload date)
- Quick preview on hover
- Drag-and-drop into chat or canvas

## 4. Component Specifications

### 4.1 AgentRail (Left Sidebar)

```typescript
interface AgentRailProps {
  activeTaskId: string | null;
  tasks: Task[];
  onTaskSelect: (taskId: string) => void;
  onTaskCancel: (taskId: string) => void;
  onTaskRetry: (taskId: string) => void;
}
```

**Sections:**
1. **Quick Actions:** New Task, Upload File, View Data Room
2. **Active Tasks:** Expandable list of running tasks
3. **Recent History:** Last 5 completed tasks
4. **Agent Skills:** Available skill icons for quick access

### 4.2 Canvas (Center Stage)

```typescript
interface CanvasProps {
  mode: 'excel' | 'app' | 'document' | 'split';
  content: CanvasContent;
  onCellSelect?: (cell: CellRef) => void;
  onComponentEdit?: (componentId: string) => void;
}

type CanvasContent = 
  | { type: 'excel'; data: ExcelData }
  | { type: 'app'; components: AppComponent[] }
  | { type: 'document'; content: string; format: 'md' | 'pdf' }
  | { type: 'split'; left: CanvasContent; right: CanvasContent };
```

### 4.3 ChatPanel (Right Sidebar)

```typescript
interface ChatPanelProps {
  taskId: string | null;
  messages: Message[];
  onSendMessage: (content: string, attachments?: File[]) => void;
  onMentionSkill: (skillId: string) => void;
  isStreaming: boolean;
}

interface Message {
  id: string;
  taskId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  attachments?: Attachment[];
  suggestions?: ComponentSuggestion[];
}
```

### 4.4 ComponentSuggestion (Approval Panel)

```typescript
interface ComponentSuggestionProps {
  suggestion: {
    id: string;
    type: 'kpi' | 'chart' | 'table' | 'form';
    title: string;
    description: string;
    preview: React.ReactNode;
    config: ComponentConfig;
  };
  onAccept: () => void;
  onEdit: () => void;
  onReject: () => void;
  onSkip: () => void;
}
```

### 4.5 TaskCard

```typescript
interface TaskCardProps {
  task: {
    id: string;
    name: string;
    type: TaskType;
    status: 'queued' | 'running' | 'waiting_approval' | 'completed' | 'failed';
    progress: number; // 0-100
    agentSkill: string;
    createdAt: Date;
    estimatedDuration?: number;
  };
  onClick: () => void;
  onCancel?: () => void;
  onRetry?: () => void;
}
```

## 5. API Specifications

### 5.1 Task Management

**POST /api/agents/task**
```json
{
  "type": "excel-to-app",
  "name": "Sales Dashboard from Q1 Data",
  "sourceFile": "file-id-123",
  "prompt": "Build a sales dashboard with KPI cards and regional breakdown",
  "skillContext": ["data-analyst", "app-builder"],
  "priority": "normal",
  "dependsOn": []
}
```

Response:
```json
{
  "taskId": "task-456",
  "status": "queued",
  "estimatedStart": "2026-04-23T10:30:00Z"
}
```

**GET /api/agents/task/:id**
Returns full task state including component suggestions.

**POST /api/agents/task/:id/approve**
```json
{
  "componentId": "comp-789",
  "action": "accept",
  "configOverrides": {}
}
```

**POST /api/agents/task/:id/cancel**
Cancels running task.

### 5.2 Real-Time Streaming

**GET /api/agents/stream?taskId=xyz**

SSE Events:
```
event: progress
data: {"taskId":"xyz","progress":45,"message":"Building chart component..."}

event: suggestion
data: {"taskId":"xyz","component":{"id":"comp-1","type":"chart","title":"Revenue by Region","preview":"..."}}

event: complete
data: {"taskId":"xyz","outputUrl":"/apps/app-123"}

event: error
data: {"taskId":"xyz","error":"Failed to parse column headers","recoverable":true}
```

### 5.3 Session Management

**POST /api/agents/session**
Creates a new agent session for the user.

Response:
```json
{
  "sessionId": "sess-789",
  "skills": ["data-analyst", "app-builder", "visual-designer"],
  "context": {
    "recentFiles": [],
    "activeTasks": []
  }
}
```

## 6. State Management

### 6.1 Zustand Store (UI State)

```typescript
interface AgentStore {
  // Session
  sessionId: string | null;
  
  // Tasks
  tasks: Task[];
  activeTaskId: string | null;
  
  // Canvas
  canvasMode: CanvasMode;
  canvasContent: CanvasContent | null;
  selectedCell: CellRef | null;
  
  // Chat
  messages: Message[];
  isStreaming: boolean;
  
  // UI
  sidebarOpen: boolean;
  approvalPanelOpen: boolean;
  
  // Actions
  setActiveTask: (taskId: string) => void;
  addMessage: (message: Message) => void;
  updateTaskProgress: (taskId: string, progress: number) => void;
  addComponentSuggestion: (taskId: string, suggestion: ComponentSuggestion) => void;
  acceptSuggestion: (taskId: string, componentId: string) => void;
}
```

### 6.2 TanStack Query (Server State)

- `useTasks()` — Fetch all tasks
- `useTask(id)` — Fetch specific task
- `useSession()` — Fetch/create agent session
- `useFilePreview(id)` — Fetch Excel preview data

## 7. Error Handling & Edge Cases

### 7.1 Agent Timeout
- **Detection:** No SSE event for 60 seconds
- **UI:** Shows "Agent is taking longer than expected" with cancel/retry
- **Recovery:** Retry with same context or modify prompt

### 7.2 Malformed Excel
- **Detection:** Parser fails or finds invalid structure
- **UI:** Agent suggests fixes ("Shall I unmerge these cells?")
- **Recovery:** User approves fix or uploads corrected file

### 7.3 User Rejects All Components
- **Detection:** All suggestions rejected or skipped
- **UI:** Agent asks for guidance ("What would you like instead?")
- **Recovery:** User provides new direction, agent retries (max 3 iterations)

### 7.4 Network Disconnection
- **Detection:** SSE connection drops
- **UI:** Shows "Reconnecting..." with spinner
- **Recovery:** Auto-reconnect with exponential backoff, restore state from server

### 7.5 Concurrent Task Conflicts
- **Detection:** Two tasks modifying same file
- **UI:** Warning banner, option to queue second task
- **Recovery:** Automatic dependency injection

## 8. Testing Strategy

### 8.1 Unit Tests (Vitest)
- Component rendering with different states
- Store actions and reducers
- Utility functions (Excel parsing, suggestion scoring)
- API client methods

### 8.2 Integration Tests
- API route handlers with mocked OpenCode responses
- SSE stream parsing and state updates
- Task lifecycle (create → run → approve → complete)
- File upload and validation

### 8.3 E2E Tests (Playwright)
**Critical Path:**
1. User navigates to Agents workspace
2. Uploads Excel file
3. Submits "build dashboard" task
4. Agent suggests components
5. User accepts all components
6. App preview appears on canvas
7. User publishes app

**Edge Cases:**
- Reject all components and retry
- Cancel running task
- Network disconnection mid-task
- Upload malformed Excel

## 9. File Structure

```
app/
  agents/
    page.tsx                 # Hub page (redirects to workspace)
    workspace/
      page.tsx               # Main workspace layout
      layout.tsx             # Workspace shell (rail + canvas + chat)
    chat/
      page.tsx               # Enhanced chat (existing, update)
    queue/
      page.tsx               # Real task queue (replace placeholder)
    skills/
      page.tsx               # Keep existing
    data-room/
      page.tsx               # File management
  api/
    agents/
      session/route.ts       # POST: create session
      task/route.ts          # POST: create task
      task/[id]/
        route.ts             # GET: task status
        approve/route.ts     # POST: approve component
        cancel/route.ts      # POST: cancel task
      stream/route.ts        # GET: SSE stream
      upload/route.ts        # POST: file upload

components/
  agents/
    agent-rail.tsx           # Left sidebar
    canvas.tsx               # Main canvas
    chat-panel.tsx           # Right chat panel
    task-card.tsx            # Task list item
    task-queue.tsx           # Task list container
    component-suggestion.tsx # Approval card
    component-editor.tsx     # Edit component config
    excel-preview.tsx        # Excel grid view
    app-builder.tsx          # Generated app preview
    app-component.tsx        # Individual app component
    data-room.tsx            # File manager
    file-uploader.tsx        # Drag-drop upload
    agent-status-bar.tsx     # Bottom status bar
    skill-mention.tsx        # @mention dropdown
    version-history.tsx      # Undo/redo panel

lib/
  agent-api.ts             # API client
  agent-store.ts           # Zustand store
  agent-types.ts           # TypeScript interfaces
  excel-parser.ts          # Excel parsing utilities
  sse-client.ts            # SSE connection manager
```

## 10. Dependencies

### 10.1 New Dependencies
```bash
pnpm add zustand @tanstack/react-table xlsx recharts
pnpm add -D @types/xlsx
```

### 10.2 Existing Dependencies (Already Installed)
- next, react, react-dom
- tailwindcss
- @tanstack/react-query
- lucide-react
- @clerk/nextjs

## 11. Performance Considerations

- **Excel Parsing:** Use Web Workers for large files (>10MB)
- **Canvas Rendering:** Virtualize large data tables (react-window)
- **SSE Connection:** Single connection per session, multiplex task updates
- **State Updates:** Batch rapid SSE events to prevent re-render thrashing
- **Image Previews:** Lazy load chart/component previews

## 12. Security

- **File Upload:** Validate file types (xlsx, csv, json), size limits (50MB)
- **API Routes:** Clerk authentication required on all agent endpoints
- **Sandboxing:** Generated apps run in sandboxed iframe
- **Data Privacy:** Excel data never leaves user's session context

## 13. Accessibility

- Keyboard navigation for all agent actions
- ARIA labels on task status indicators
- Focus management in approval flow
- Screen reader announcements for agent progress

## 14. Open Questions

1. Should generated apps be stored in database or generated on-demand?
2. What's the maximum number of parallel tasks per user?
3. Should we support real-time collaboration (multiple users on same task)?
4. What's the retention policy for completed tasks and generated apps?

---

**Spec written:** 2026-04-23
**Approved by:** User
**Next step:** Implementation plan
