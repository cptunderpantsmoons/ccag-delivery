'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Search, 
  FileText, 
  Database, 
  Sparkles,
  ChevronDown,
  ChevronUp,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';

interface SearchResult {
  id: string;
  content: string;
  documentId: string;
  chunkIndex: number;
  relevanceScore: number;
  metadata: {
    sourceFile?: string;
    documentType?: string;
    pageNumber?: number;
  };
}

interface VectorStats {
  totalChunks: number;
  totalDocuments: number;
  avgChunksPerDoc: number;
  lastUpdated: string | null;
}

export default function VectorSearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<VectorStats | null>(null);
  const [expandedResult, setExpandedResult] = useState<string | null>(null);
  const [mode, setMode] = useState<'search' | 'chat'>('search');

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/vector/stats');
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Perform search
  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;

    setLoading(true);
    try {
      const res = await fetch(
        `/api/vector/search?query=${encodeURIComponent(query)}&limit=15`
      );
      const data = await res.json();
      if (data.success) {
        setResults(data.results);
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  }, [query]);

  // RAG Chat
  const [chatMessages, setChatMessages] = useState<Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    sources?: Array<{ sourceFile: string; documentType: string; relevanceScore: number }>;
  }>>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  const handleRAGChat = useCallback(async () => {
    if (!chatInput.trim()) return;

    const userMsg = {
      id: crypto.randomUUID(),
      role: 'user' as const,
      content: chatInput,
    };

    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setChatLoading(true);

    try {
      const res = await fetch('/api/vector/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: chatInput,
          mode: 'chat',
          useRag: true,
          maxContextChunks: 10,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setChatMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: data.response,
          sources: data.rag?.sources,
        }]);
      }
    } catch (error) {
      console.error('RAG chat failed:', error);
      setChatMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request.',
      }]);
    } finally {
      setChatLoading(false);
    }
  }, [chatInput]);

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <PageHeader
        title="Semantic Search"
        description="Search across all documents using natural language"
        actions={
          <div className="flex items-center gap-2">
            {/* Stats badge */}
            {stats && (
              <div className="flex items-center gap-3 px-4 py-2 bg-[#F0FDF4] border border-[rgba(16,185,129,0.2)] rounded-lg">
                <Database className="w-4 h-4 text-[#059669]" />
                <div className="text-xs">
                  <span className="font-semibold text-[#0F172A]">{stats.totalDocuments}</span>
                  <span className="text-[#64748B]"> documents indexed</span>
                  <span className="mx-1 text-[#CBD5E1]">|</span>
                  <span className="font-semibold text-[#0F172A]">{stats.totalChunks}</span>
                  <span className="text-[#64748B]"> chunks</span>
                </div>
              </div>
            )}
          </div>
        }
      />

      {/* Mode Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setMode('search')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            mode === 'search'
              ? 'bg-[#10B981] text-white'
              : 'bg-[#F8FAFC] text-[#64748B] hover:bg-[#F1F5F9]'
          }`}
        >
          <Search className="w-4 h-4" />
          Semantic Search
        </button>
        <button
          onClick={() => setMode('chat')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            mode === 'chat'
              ? 'bg-[#10B981] text-white'
              : 'bg-[#F8FAFC] text-[#64748B] hover:bg-[#F1F5F9]'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          RAG Chat
        </button>
      </div>

      {/* Search Mode */}
      {mode === 'search' && (
        <>
          {/* Search Input */}
          <div className="relative mb-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94A3B8]" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Search documents with natural language (e.g., 'What are the termination clauses in NDAs?')"
              className="w-full pl-12 pr-32 py-3 rounded-xl border border-[rgba(148,163,184,0.2)] bg-white text-[#0F172A] placeholder-gray-400 focus:outline-none focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20 transition-all"
            />
            <Button
              variant="primary"
              size="sm"
              onClick={handleSearch}
              disabled={loading || !query.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Search'
              )}
            </Button>
          </div>

          {/* Results */}
          <div className="flex-1 overflow-y-auto space-y-3">
            {results.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center h-64 text-[#94A3B8]">
                <Search className="w-12 h-12 mb-3 opacity-50" />
                <p className="text-sm font-medium">Start searching your document database</p>
                <p className="text-xs mt-1">Ask questions in natural language</p>
              </div>
            )}

            {results.map((result, index) => (
              <div
                key={result.id}
                className="rounded-xl border border-[rgba(148,163,184,0.15)] bg-white overflow-hidden"
              >
                <div className="p-4">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-mono text-[#10B981] bg-[#F0FDF4] px-2 py-0.5 rounded">
                        #{index + 1}
                      </span>
                      <FileText className="w-4 h-4 text-[#64748B] shrink-0" />
                      <span className="text-sm font-medium text-[#0F172A] truncate">
                        {result.metadata.sourceFile || 'Unknown Document'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {result.metadata.pageNumber && (
                        <span className="text-xs text-[#64748B]">
                          Page {result.metadata.pageNumber}
                        </span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        result.relevanceScore >= 80
                          ? 'bg-[#F0FDF4] text-[#059669]'
                          : result.relevanceScore >= 60
                          ? 'bg-[#FEF3C7] text-[#D97706]'
                          : 'bg-[#F3F4F6] text-[#6B7280]'
                      }`}>
                        {result.relevanceScore}% match
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <p className={`text-sm text-[#334155] leading-relaxed ${
                    expandedResult === result.id ? '' : 'line-clamp-3'
                  }`}>
                    {result.content}
                  </p>

                  {/* Expand/Collapse */}
                  {result.content.length > 300 && (
                    <button
                      onClick={() => setExpandedResult(
                        expandedResult === result.id ? null : result.id
                      )}
                      className="flex items-center gap-1 mt-2 text-xs text-[#10B981] hover:text-[#059669]"
                    >
                      {expandedResult === result.id ? (
                        <>
                          <ChevronUp className="w-3 h-3" />
                          Show less
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-3 h-3" />
                          Show more
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Chat Mode */}
      {mode === 'chat' && (
        <div className="flex-1 flex flex-col rounded-xl bg-white border border-[rgba(148,163,184,0.15)] overflow-hidden">
          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {chatMessages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-[#94A3B8]">
                <Sparkles className="w-12 h-12 mb-3 opacity-50" />
                <p className="text-sm font-medium">RAG-Powered Legal Assistant</p>
                <p className="text-xs mt-1 text-center max-w-md">
                  Ask questions about your documents and get answers with citations from your document database
                </p>
                <div className="flex gap-2 flex-wrap justify-center mt-4">
                  {['Summarise our NDAs', 'What are standard IP clauses?', 'Compare vendor contracts'].map(q => (
                    <button
                      key={q}
                      onClick={() => setChatInput(q)}
                      className="px-3 py-1.5 text-xs bg-[#F1F5F9] border border-[rgba(148,163,184,0.15)] rounded-full hover:bg-[#F0FDF4] hover:border-[rgba(16,185,129,0.3)] hover:text-[#059669] transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {chatMessages.map(msg => (
              <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-[#10B981]/10 flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4 text-[#059669]" />
                  </div>
                )}
                <div className={`max-w-[75%] ${msg.role === 'user' ? 'order-first' : ''}`}>
                  <div className={`px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-[#10B981] text-white rounded-br-sm'
                      : 'bg-gray-100 text-[#0F172A] rounded-bl-sm'
                  }`}>
                    {msg.content}
                  </div>
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {msg.sources.map((s, i) => (
                        <span key={i} className="text-xs px-2 py-0.5 bg-[#EFF6FF] text-[#1D4ED8] rounded">
                          {s.sourceFile} ({s.relevanceScore}%)
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-[#64748B] flex items-center justify-center shrink-0">
                    <span className="text-xs text-white">U</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Chat Input */}
          <div className="p-4 border-t border-[rgba(148,163,184,0.15)]">
            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleRAGChat()}
                placeholder="Ask about your documents..."
                className="flex-1 px-4 py-2 rounded-lg border border-[rgba(148,163,184,0.2)] text-sm focus:outline-none focus:border-[#10B981]"
              />
              <Button
                variant="primary"
                onClick={handleRAGChat}
                disabled={chatLoading || !chatInput.trim()}
              >
                {chatLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Send'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
