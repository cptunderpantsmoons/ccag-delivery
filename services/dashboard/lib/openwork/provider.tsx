// lib/openwork/provider.tsx
'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { OpenWorkClient } from './client';
import type { OpenWorkConfig, OpenWorkSession, OpenWorkSkill, OpenWorkApproval, OpenWorkEvent } from './types';

interface OpenWorkContextValue {
  client: OpenWorkClient | null;
  isConnected: boolean;
  sessions: OpenWorkSession[];
  skills: OpenWorkSkill[];
  approvals: OpenWorkApproval[];
  currentSessionId: string | null;
  setCurrentSessionId: (id: string | null) => void;
  refreshSessions: () => Promise<void>;
  refreshSkills: () => Promise<void>;
  refreshApprovals: () => Promise<void>;
  createSession: (title?: string) => Promise<OpenWorkSession>;
  sendPrompt: (sessionId: string, prompt: string) => Promise<void>;
  respondToApproval: (id: string, action: 'approve' | 'deny' | 'always') => Promise<void>;
  addSkill: (path: string) => Promise<void>;
  removeSkill: (name: string) => Promise<void>;
}

const OpenWorkContext = createContext<OpenWorkContextValue | null>(null);

export function useOpenWork() {
  const ctx = useContext(OpenWorkContext);
  if (!ctx) throw new Error('useOpenWork must be used within OpenWorkProvider');
  return ctx;
}

interface OpenWorkProviderProps {
  children: React.ReactNode;
  config: OpenWorkConfig;
}

export function OpenWorkProvider({ children, config }: OpenWorkProviderProps) {
  const [client] = useState(() => new OpenWorkClient(config));
  const [isConnected, setIsConnected] = useState(false);
  const [sessions, setSessions] = useState<OpenWorkSession[]>([]);
  const [skills, setSkills] = useState<OpenWorkSkill[]>([]);
  const [approvals, setApprovals] = useState<OpenWorkApproval[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  const refreshSessions = useCallback(async () => {
    try {
      const list = await client.listSessions();
      setSessions(list);
      setIsConnected(true);
    } catch (err) {
      console.error('Failed to fetch OpenWork sessions:', err);
      setIsConnected(false);
    }
  }, [client]);

  const refreshSkills = useCallback(async () => {
    try {
      const list = await client.listSkills();
      setSkills(list);
    } catch (err) {
      console.error('Failed to fetch OpenWork skills:', err);
    }
  }, [client]);

  const refreshApprovals = useCallback(async () => {
    try {
      const list = await client.listApprovals();
      setApprovals(list);
    } catch (err) {
      console.error('Failed to fetch OpenWork approvals:', err);
    }
  }, [client]);

  const createSession = useCallback(async (title?: string) => {
    const session = await client.createSession(title);
    setSessions((prev) => [session, ...prev]);
    setCurrentSessionId(session.id);
    return session;
  }, [client]);

  const sendPrompt = useCallback(async (sessionId: string, prompt: string) => {
    await client.sendPrompt(sessionId, prompt);
  }, [client]);

  const respondToApproval = useCallback(async (id: string, action: 'approve' | 'deny' | 'always') => {
    await client.respondToApproval(id, action);
    setApprovals((prev) => prev.filter((a) => a.id !== id));
  }, [client]);

  const addSkill = useCallback(async (path: string) => {
    await client.addSkill(path);
    await refreshSkills();
  }, [client, refreshSkills]);

  const removeSkill = useCallback(async (name: string) => {
    await client.removeSkill(name);
    setSkills((prev) => prev.filter((s) => s.name !== name));
  }, [client]);

  // Initial load + polling
  useEffect(() => {
    refreshSessions();
    refreshSkills();
    refreshApprovals();

    const interval = setInterval(() => {
      refreshSessions();
      refreshApprovals();
    }, 5000);

    return () => clearInterval(interval);
  }, [refreshSessions, refreshSkills, refreshApprovals]);

  // SSE event stream
  useEffect(() => {
    const disconnect = client.connectEventStream((event) => {
      if (event.type === 'approval_request') {
        refreshApprovals();
      } else if (event.type === 'session_update') {
        refreshSessions();
      }
    });

    return disconnect;
  }, [client, refreshSessions, refreshApprovals]);

  const value: OpenWorkContextValue = {
    client,
    isConnected,
    sessions,
    skills,
    approvals,
    currentSessionId,
    setCurrentSessionId,
    refreshSessions,
    refreshSkills,
    refreshApprovals,
    createSession,
    sendPrompt,
    respondToApproval,
    addSkill,
    removeSkill,
  };

  return (
    <OpenWorkContext.Provider value={value}>
      {children}
    </OpenWorkContext.Provider>
  );
}
