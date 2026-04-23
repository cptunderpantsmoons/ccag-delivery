// lib/ccag/provider.tsx
'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { CcagClient } from './client';
import type { CcagConfig, CcagSession, CcagSkill, CcagApproval } from './types';

interface CcagContextValue {
  client: CcagClient | null;
  isConnected: boolean;
  sessions: CcagSession[];
  skills: CcagSkill[];
  approvals: CcagApproval[];
  currentSessionId: string | null;
  setCurrentSessionId: (id: string | null) => void;
  refreshSessions: () => Promise<void>;
  refreshSkills: () => Promise<void>;
  refreshApprovals: () => Promise<void>;
  createSession: (title?: string) => Promise<CcagSession>;
  sendPrompt: (sessionId: string, prompt: string) => Promise<void>;
  respondToApproval: (id: string, action: 'approve' | 'deny' | 'always') => Promise<void>;
  addSkill: (path: string) => Promise<void>;
  removeSkill: (name: string) => Promise<void>;
}

const CcagContext = createContext<CcagContextValue | null>(null);

export function useCcag() {
  const ctx = useContext(CcagContext);
  if (!ctx) throw new Error('useCcag must be used within CcagProvider');
  return ctx;
}

interface CcagProviderProps {
  children: React.ReactNode;
  config: CcagConfig;
}

export function CcagProvider({ children, config }: CcagProviderProps) {
  const [client] = useState(() => new CcagClient(config));
  const [isConnected, setIsConnected] = useState(false);
  const [sessions, setSessions] = useState<CcagSession[]>([]);
  const [skills, setSkills] = useState<CcagSkill[]>([]);
  const [approvals, setApprovals] = useState<CcagApproval[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  const refreshSessions = useCallback(async () => {
    try {
      const list = await client.listSessions();
      setSessions(list);
      setIsConnected(true);
    } catch (err) {
      console.error('Failed to fetch CCAG sessions:', err);
      setIsConnected(false);
    }
  }, [client]);

  const refreshSkills = useCallback(async () => {
    try {
      const list = await client.listSkills();
      setSkills(list);
    } catch (err) {
      console.error('Failed to fetch CCAG skills:', err);
    }
  }, [client]);

  const refreshApprovals = useCallback(async () => {
    try {
      const list = await client.listApprovals();
      setApprovals(list);
    } catch (err) {
      console.error('Failed to fetch CCAG approvals:', err);
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

  const value: CcagContextValue = {
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
    <CcagContext.Provider value={value}>
      {children}
    </CcagContext.Provider>
  );
}
