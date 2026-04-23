'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { AVAILABLE_MODELS, DEFAULT_MODEL_SETTINGS } from '@/config/models';
import { FileText, Database } from 'lucide-react';

interface Source {
  sourceFile: string;
  pageNumber?: number;
  relevanceScore: number;
  contentPreview?: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  fileName?: string;
  sources?: Source[];
}

export default function AIPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [model, setModel] = useState(DEFAULT_MODEL_SETTINGS.reviewModel);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [documentContext, setDocumentContext] = useState<{ name: string; content: string } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      setDocumentContext({ name: file.name, content });
    };
    reader.readAsText(file);
    // Reset so same file can be re-uploaded
    e.target.value = '';
  }, []);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    setError(null);
    setInput('');

    // Build user message content — prepend document context if present and first message
    let userContent = text;
    let fileName: string | undefined;
    if (documentContext && messages.length === 0) {
      userContent = `I'm sharing a document for analysis.\n\n<document name="${documentContext.name}">\n${documentContext.content}\n</document>\n\n${text}`;
      fileName = documentContext.name;
    }

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: userContent,
      fileName,
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setLoading(true);

    const assistantId = crypto.randomUUID();
    setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '' }]);

    try {
      const apiMessages = updatedMessages.map(m => ({ role: m.role, content: m.content }));

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages, model, stream: true }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Request failed');
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let assembled = '';
      let collectedSources: Source[] = [];

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          // Parse SSE lines
          for (const line of chunk.split('\n')) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6).trim();
            if (data === '[DONE]') break;
            
            // Try to parse as JSON
            try {
              const parsed = JSON.parse(data);
              
              // Check for sources metadata
              if (parsed.type === 'sources' && Array.isArray(parsed.sources)) {
                collectedSources = parsed.sources;
                continue;
              }
              
              // Regular delta content
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) {
                assembled += delta;
                setMessages(prev =>
                  prev.map(m => m.id === assistantId ? { ...m, content: assembled } : m)
                );
              }
            } catch {
              // Not JSON, treat as content - this handles malformed chunks
            }
          }
        }
      }

      // Update with sources if we collected any
      if (collectedSources.length > 0) {
        setMessages(prev =>
          prev.map(m => m.id === assistantId ? { ...m, sources: collectedSources } : m)
        );
      }

      // Clear document context after first exchange
      if (documentContext && messages.length === 0) {
        setDocumentContext(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setMessages(prev => prev.filter(m => m.id !== assistantId));
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, model, documentContext]);

  const runNarrativeReview = useCallback(async () => {
    if (!documentContext || loading) return;
    setError(null);
    setLoading(true);

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: `Run a narrative contract review on ${documentContext.name}`,
      fileName: documentContext.name,
    };
    const assistantId = crypto.randomUUID();
    setMessages(prev => [...prev, userMsg, { id: assistantId, role: 'assistant', content: '' }]);

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType: 'document',
          entityId: `tmp-${crypto.randomUUID()}`,
          analysisType: 'narrative_review',
          content: documentContext.content,
          modelOverride: model,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Narrative review failed');
      const narrative = (data.result?.narrative as string) || '';
      setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: narrative } : m));
      setDocumentContext(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setMessages(prev => prev.filter(m => m.id !== assistantId));
    } finally {
      setLoading(false);
    }
  }, [documentContext, loading, model]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setDocumentContext(null);
    setError(null);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(148,163,184,0.2)] bg-white/80 px-3 py-1 mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
            <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#64748B]">Assistant</span>
          </div>
          <h1 className="text-[clamp(1.5rem,3vw,2rem)] font-bold text-[#0F172A] tracking-tight">AI Legal Assistant</h1>
          <p className="mt-2 text-[0.875rem] text-[#64748B] max-w-[50ch]">Chat with AI — upload a document for analysis or ask legal questions</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={model}
            onChange={e => setModel(e.target.value)}
            className="rounded-lg border border-[rgba(148,163,184,0.3)] px-3 py-1.5 text-xs focus:border-emerald-500 focus:outline-none"
          >
            {AVAILABLE_MODELS.map(m => (
              <option key={m.id} value={m.model}>
                {m.displayName}{m.isFree ? ' (Free)' : ''}
              </option>
            ))}
          </select>
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className="px-3 py-1.5 text-xs text-[#64748B] border border-[rgba(148,163,184,0.15)] rounded-lg hover:bg-[#F1F5F9] transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto rounded-xl bg-white border border-[rgba(148,163,184,0.15)] p-4 space-y-4 mb-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-[#94A3B8] gap-3">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-[#64748B]">Start a conversation</p>
              <p className="text-xs text-[#94A3B8] mt-1">Ask a legal question or upload a document to begin</p>
            </div>
            <div className="flex gap-2 flex-wrap justify-center mt-2">
              {['Review this NDA for red flags', 'What are standard termination clauses?', 'Summarise key obligations'].map(q => (
                <button
                  key={q}
                  onClick={() => setInput(q)}
                  className="px-3 py-1.5 text-xs bg-[#F1F5F9] border border-[rgba(148,163,184,0.15)] rounded-full hover:bg-[#F0FDF4] hover:border-[rgba(16,185,129,0.3)] hover:text-[#059669] transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map(msg => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full bg-[#10B981]/10 flex items-center justify-center shrink-0 mt-0.5">
                  <svg className="w-4 h-4 text-[#059669]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
              <div className={`max-w-[75%] ${msg.role === 'user' ? 'order-first' : ''}`}>
                {msg.fileName && (
                  <div className="mb-1 inline-flex items-center gap-1.5 px-2 py-1 bg-[#EFF6FF] border border-[#BFDBFE] rounded-md text-xs text-[#1D4ED8]">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {msg.fileName}
                  </div>
                )}
                <div className={`px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-[#10B981] text-white rounded-br-sm'
                    : 'bg-gray-100 text-[#0F172A] rounded-bl-sm'
                }`}>
                  {msg.role === 'user'
                    ? (msg.fileName ? msg.content.replace(/^I'm sharing a document for analysis\.\n\n<document[^>]*>\n[\s\S]*?<\/document>\n\n/, '') : msg.content)
                    : msg.content || <span className="inline-block w-2 h-4 bg-gray-400 animate-pulse rounded-sm" />
                  }
                </div>
                
                {/* RAG Sources Display */}
                {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
                  <>
                    <div className="mt-2 inline-flex items-center gap-1 text-[10px] text-[#059669]">
                      <Database className="w-3 h-3" />
                      Answer based on {msg.sources.length} document{msg.sources.length > 1 ? 's' : ''}
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <span className="text-[10px] text-[#94A3B8] uppercase tracking-wide">Sources:</span>
                      {msg.sources.map((s, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#EFF6FF] border border-[#BFDBFE] rounded text-xs text-[#1D4ED8]"
                        >
                          <FileText className="w-3 h-3" />
                          {s.sourceFile || 'Document'}
                          {s.pageNumber && `, p.${s.pageNumber}`}
                          <span className="text-[#10B981] font-mono">{s.relevanceScore}%</span>
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>
              {msg.role === 'user' && (
                <div className="w-7 h-7 rounded-full bg-[#64748B] flex items-center justify-center shrink-0 mt-0.5">
                  <svg className="w-3.5 h-3.5 text-[#64748B]" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Error */}
      {error && (
        <div className="mb-2 px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Document badge */}
      {documentContext && (
        <div className="mb-2 flex items-center gap-2 px-3 py-2 bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg">
          <svg className="w-4 h-4 text-blue-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="text-xs text-blue-700 font-medium flex-1 truncate">{documentContext.name}</span>
          <button
            onClick={runNarrativeReview}
            disabled={loading}
            className="px-2.5 py-1 text-xs font-medium bg-[#10B981] text-white rounded-md hover:bg-[#059669] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Run structured narrative contract review (Australian law overlay)"
          >
            Narrative Review
          </button>
          <button
            onClick={() => setDocumentContext(null)}
            className="text-blue-400 hover:text-[#1D4ED8]"
            title="Remove document"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Input */}
      <div className="flex items-end gap-2 bg-white border border-[rgba(148,163,184,0.15)] rounded-xl p-2">
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.md,.csv,.json,.xml,.html,.pdf,.doc,.docx"
          onChange={handleFileUpload}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          title="Upload document"
          className="p-2 text-[#94A3B8] hover:text-[#10B981] bg-[#EFF6FF] rounded-lg transition-colors shrink-0"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
        </button>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question or describe what to analyse… (Enter to send, Shift+Enter for new line)"
          rows={1}
          className="flex-1 resize-none bg-transparent text-sm text-[#0F172A] placeholder-gray-400 focus:outline-none py-2 px-1 max-h-40 overflow-y-auto"
          style={{ lineHeight: '1.5' }}
          onInput={e => {
            const el = e.currentTarget;
            el.style.height = 'auto';
            el.style.height = `${el.scrollHeight}px`;
          }}
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || loading}
          className="p-2 bg-[#10B981] text-white rounded-lg hover:bg-[#059669] disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
        >
          {loading ? (
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}