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
  sessionId: string | null;
  setSessionId: (id: string) => void;

  tasks: Task[];
  activeTaskId: string | null;
  setTasks: (tasks: Task[]) => void;
  addTask: (task: Task) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  setActiveTaskId: (id: string | null) => void;
  removeTask: (taskId: string) => void;

  canvasContent: CanvasContent | null;
  setCanvasContent: (content: CanvasContent | null) => void;
  setCanvasMode: (mode: CanvasMode) => void;

  messages: Message[];
  addMessage: (message: Message) => void;
  setMessages: (messages: Message[]) => void;
  isStreaming: boolean;
  setIsStreaming: (streaming: boolean) => void;

  currentSuggestion: ComponentSuggestion | null;
  setCurrentSuggestion: (suggestion: ComponentSuggestion | null) => void;

  presence: UserPresence[];
  setPresence: (presence: UserPresence[]) => void;
  updateUserPresence: (user: UserPresence) => void;

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
