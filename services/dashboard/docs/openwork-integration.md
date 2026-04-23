# OpenWork Integration

## Status: Implemented

## Architecture

```
carbon-agent-dashboard/
  lib/openwork/
    types.ts          # OpenWork type definitions
    client.ts         # API client (direct + proxy mode)
    provider.tsx      # React context with polling + SSE
  components/openwork/
    session-list.tsx  # Session sidebar
    skills-manager.tsx # Skills management UI
    approvals-panel.tsx # Pending approvals UI
  app/api/openwork/[...path]/
    route.ts          # Next.js proxy to OpenWork server
```

## Environment Variables

```bash
# Server-side (API proxy)
OPENWORK_SERVER_URL=http://localhost:3003
OPENWORK_TOKEN=your-openwork-token

# Client-side (direct SSE connection)
NEXT_PUBLIC_OPENWORK_URL=http://localhost:3003
NEXT_PUBLIC_OPENWORK_TOKEN=your-openwork-token
```

## Integration Points

### 1. Workspace Page (`/agents/workspace`)
- Wrapped in `OpenWorkProvider`
- Shows `OpenWorkSessionList` in left sidebar
- `Canvas` + `ComponentSuggestionPanel` in main area
- `ChatPanel` + `ApprovalsPanel` in right sidebar
- Auto-creates first session if none exist

### 2. Chat Panel
- Detects if inside `OpenWorkProvider`
- If OpenWork mode: sends via `client.sendPrompt()`
- If legacy mode: sends via `sendMessage()` API
- Displays messages from agent store (populated by SSE)

### 3. Skills Page (`/agents/skills`)
- Wrapped in `OpenWorkProvider`
- Shows `SkillsManager` component
- Lists project + global skills
- Add/remove skills

### 4. API Proxy (`/api/openwork/*`)
- Forwards GET/POST/DELETE to OpenWork server
- Injects `Authorization: Bearer` header
- Returns 502 if OpenWork is unreachable

### 5. Event Streaming
- `OpenWorkProvider` connects to SSE `/event` endpoint
- Polls sessions + approvals every 5s as fallback
- Updates React state on `approval_request` and `session_update` events

## Running OpenWork Server

```bash
cd ../openwork-temp
pnpm install
pnpm dev  # starts on :3003
```

Then set `OPENWORK_SERVER_URL=http://localhost:3003` in dashboard `.env.local`.

## Next Steps
1. Wire SSE messages into agent store for real-time chat
2. Show OpenWork todos in canvas
3. Show OpenWork status (idle/busy/retry) in UI
4. Add workspace selector for multiple OpenWork workspaces
5. Persist OpenWork config per-user in database
