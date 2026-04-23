import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/current-user';
import { errorResponse } from '@/lib/api-errors';
import { DEFAULT_MODEL_SETTINGS } from '@/config/models';
import { semanticSearch, VectorSearchResult } from '@/lib/services/rag-vector-store';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// Keywords that trigger RAG context retrieval
const RAG_KEYWORDS = [
  'our contract', 'the agreement', 'our agreements', 'nda', 'ndas', 'msa', 'msas',
  'vendor contract', 'our documents', 'this clause', 'these terms', 'in the contract',
  'according to', 'our nda', 'our msa', 'our vendor', 'the vendor', 'the contract',
  'the document', 'this document', 'our document', 'our policy', 'the policy',
  'the terms', 'the clause', 'what are the', 'what is the', 'show me', 'find',
  'reviewed', 'uploaded', 'attached', 'from the document', 'in this document',
  'based on', 'the uploaded', 'in the uploaded', 'look at the',
];

const SYSTEM_PROMPT = `You are a legal AI assistant for Contract Hub (Corporate Carbon Group Australia).
You help legal teams with contract review, risk assessment, compliance checks, and legal research.
When document context is provided below, use it to answer the user's question and ALWAYS cite your sources.
Format citations as: [Source: filename.pdf, Page X] or [Source: document name]
If no relevant documents are found or provided, answer from your general knowledge but note that document-specific analysis requires the relevant documents.
Be precise, cite specific clauses when discussing documents, and always clarify that your responses are for informational purposes only and do not constitute legal advice.
Respond in clear, professional language.`;

/**
 * Detect if query likely requires RAG context
 */
function shouldUseRAG(query: string): boolean {
  const lower = query.toLowerCase();
  return RAG_KEYWORDS.some(keyword => lower.includes(keyword));
}

/**
 * Build RAG context string from search results
 */
function buildRAGContext(searchResults: VectorSearchResult[]): string {
  return searchResults.map((r, i) => {
    const pageInfo = r.metadata.pageNumber ? `, Page ${r.metadata.pageNumber}` : '';
    return `[Source ${i + 1}: ${r.metadata.sourceFile || 'Document'}${pageInfo}]\n${r.content}`;
  }).join('\n\n');
}

/**
 * Extract the last user message from the conversation
 */
function getLastUserMessage(messages: ChatMessage[]): string | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'user') {
      return messages[i].content;
    }
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return errorResponse('Unauthorized', 'UNAUTHORIZED', 401);

    const apiKey = process.env.OPENROUTER_API_KEY;
    const baseUrl = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';

    if (!apiKey) {
      return errorResponse('OpenRouter API key not configured.', 'SERVICE_UNAVAILABLE', 503);
    }

    const body = await request.json();
    const { messages, model, stream: shouldStream = true }: { messages: ChatMessage[]; model?: string; stream?: boolean } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return errorResponse('messages array required', 'VALIDATION_ERROR', 400);
    }

    const selectedModel = model || DEFAULT_MODEL_SETTINGS.reviewModel;

    // Check for RAG trigger
    const lastUserMessage = getLastUserMessage(messages);
    let ragSearchResults: VectorSearchResult[] = [];
    
    if (lastUserMessage && shouldUseRAG(lastUserMessage)) {
      try {
        ragSearchResults = await semanticSearch(user.tenantId, lastUserMessage, {
          limit: 5,
          minRelevanceScore: 0.5,
        });
        console.log(`[RAG] Query triggered search, found ${ragSearchResults.length} results`);
      } catch (ragError) {
        console.error('[RAG] Semantic search failed:', ragError);
        // Continue without RAG if it fails
      }
    }

    // Build messages with optional RAG context
    let systemContent = SYSTEM_PROMPT;
    
    if (ragSearchResults.length > 0) {
      const ragContext = buildRAGContext(ragSearchResults);
      systemContent = `You have access to the following relevant documents from the Contract Hub database:\n\n${ragContext}\n\n---\n\n${SYSTEM_PROMPT}`;
    }

    const openRouterMessages = [
      { role: 'system', content: systemContent },
      ...messages,
    ];

    // Non-streaming mode
    if (!shouldStream) {
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://contract-hub.ccg.com.au',
          'X-Title': 'Contract Hub',
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: openRouterMessages,
          stream: false,
        }),
      });

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content ?? '';
      
      return NextResponse.json({ 
        content,
        rag: {
          used: ragSearchResults.length > 0,
          sourcesFound: ragSearchResults.length,
          sources: ragSearchResults.slice(0, 3).map(s => ({
            sourceFile: s.metadata.sourceFile,
            pageNumber: s.metadata.pageNumber,
            relevanceScore: s.relevanceScore,
            contentPreview: s.content.slice(0, 150) + '...',
          })),
        },
      });
    }

    // Streaming mode
    const upstreamResponse = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://contract-hub.ccg.com.au',
        'X-Title': 'Contract Hub',
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: openRouterMessages,
        stream: true,
      }),
    });

    if (!upstreamResponse.ok || !upstreamResponse.body) {
      const err = await upstreamResponse.text();
      return NextResponse.json({ error: err }, { status: upstreamResponse.status });
    }

    // Transform the stream: forward chunks, then append RAG metadata at the end
    const encoder = new TextEncoder();
    const responseBody = upstreamResponse.body;
    const outputStream = new ReadableStream({
      async start(controller) {
        const reader = responseBody.getReader();
        const decoder = new TextDecoder();

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            // Decode, strip upstream [DONE] lines, re-encode and forward
            const text = decoder.decode(value, { stream: true });
            const filtered = text
              .split('\n')
              .filter(line => line.trim() !== 'data: [DONE]')
              .join('\n');

            if (filtered.trim()) {
              controller.enqueue(encoder.encode(filtered));
            }
          }

          // Append RAG sources metadata BEFORE the final [DONE]
          if (ragSearchResults.length > 0) {
            const sourcesMeta = {
              type: 'sources',
              sources: ragSearchResults.slice(0, 3).map(s => ({
                sourceFile: s.metadata.sourceFile,
                pageNumber: s.metadata.pageNumber,
                relevanceScore: s.relevanceScore,
                contentPreview: s.content.slice(0, 150) + '...',
              })),
            };
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(sourcesMeta)}\n\n`));
          }

          // Send exactly one [DONE]
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        } catch (streamError) {
          console.error('Stream transform error:', streamError);
          controller.error(streamError);
        } finally {
          reader.releaseLock();
          controller.close();
        }
      },
    });

    return new Response(outputStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}