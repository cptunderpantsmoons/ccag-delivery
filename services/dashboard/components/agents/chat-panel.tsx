// components/agents/chat-panel.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Paperclip, Loader2 } from 'lucide-react';
import { useAgentStore } from '@/lib/agent-store';
import { sendMessage } from '@/lib/agent-api';
import { useOpenWork } from '@/lib/openwork/provider';

export function ChatPanel() {
  const { messages, activeTaskId, isStreaming, addMessage, setIsStreaming, sessionId } = useAgentStore();
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Try to use OpenWork if available (will be null if not in provider)
  let openWork: ReturnType<typeof useOpenWork> | null = null;
  try {
    openWork = useOpenWork();
  } catch {
    // Not inside OpenWorkProvider
  }

  const currentSessionId = openWork?.currentSessionId || sessionId;
  const isOpenWork = !!openWork?.isConnected;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;

    // If using OpenWork, send via OpenWork
    if (isOpenWork && currentSessionId) {
      const userMsg = {
        id: `msg_${Date.now()}`,
        taskId: currentSessionId,
        role: 'user' as const,
        content: input.trim(),
        timestamp: new Date().toISOString(),
      };
      addMessage(userMsg);
      setInput('');
      setIsStreaming(true);

      try {
        if (!openWork) throw new Error('OpenWork not available');
        await openWork.sendPrompt(currentSessionId, input.trim());
        // Messages will come through SSE
      } catch (error) {
        addMessage({
          id: `msg_${Date.now()}`,
          taskId: currentSessionId,
          role: 'system',
          content: `Error: ${error instanceof Error ? error.message : 'Failed to send'}`,
          timestamp: new Date().toISOString(),
        });
      } finally {
        setIsStreaming(false);
      }
      return;
    }

    // Fallback to old API
    if (!activeTaskId) return;

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

  const contextId = currentSessionId || activeTaskId;

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-[var(--border)] px-4 py-3">
        <h3 className="font-medium text-[var(--text-primary)]">Agent Chat</h3>
        <p className="text-xs text-[var(--text-tertiary)]">
          {isOpenWork ? 'OpenWork session' : contextId ? 'Context-aware messaging' : 'Select a task to chat'}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {!contextId && (
          <div className="flex h-full items-center justify-center text-[var(--text-tertiary)]">
            <p className="text-center text-sm">Select a session to start chatting with the agent</p>
          </div>
        )}

        {messages
          .filter((m) => m.taskId === contextId)
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

      {contextId && (
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
              placeholder={isOpenWork ? 'Message OpenWork agent...' : 'Ask the agent...'}
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
    </div>
  );
}
