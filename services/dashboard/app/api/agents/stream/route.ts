// app/api/agents/stream/route.ts
import { auth } from '@clerk/nextjs/server';
import { getPlatformApiKey } from '@/app/lib/orchestrator-auth';
import { taskStore } from '../store';

const ADAPTER_URL = process.env.CARBON_ADAPTER_URL ?? 'http://adapter:8000';

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

  const apiKey = await getPlatformApiKey();
  if (!apiKey) {
    return new Response('Failed to get API key', { status: 401 });
  }

  // Mark task as running
  task.status = 'running';
  task.progress = 0;
  taskStore.set(taskId, task);

  const response = await fetch(`${ADAPTER_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are an enterprise app builder agent. The user wants to build an app from data.
When suggesting components, output JSON blocks like:
\`\`\`json
{"type": "kpi", "title": "Total Revenue", "description": "Sum of revenue", "config": {"aggregations": [{"column": "revenue", "function": "sum", "alias": "total_revenue"}]}}
\`\`\`
Available types: kpi, chart, table, form, filter.`,
        },
        {
          role: 'user',
          content: task.prompt || 'Build a dashboard',
        },
      ],
      stream: true,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    return new Response(
      JSON.stringify({ error: `Adapter error: ${error}` }),
      { status: response.status, headers: { 'content-type': 'application/json' } }
    );
  }

  if (!response.body) {
    return new Response('No response body', { status: 502 });
  }

  // Transform the adapter's OpenAI-format SSE into our custom events
  const reader = response.body.getReader();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const decoder = new TextDecoder();
      let buffer = '';
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              // Parse final suggestions and emit complete
              const suggestions = parseComponentSuggestions(fullContent);
              for (const sugg of suggestions) {
                controller.enqueue(
                  encoder.encode(`event: suggestion\ndata: ${JSON.stringify({ taskId, component: sugg })}\n\n`)
                );
              }
              controller.enqueue(
                encoder.encode(`event: complete\ndata: ${JSON.stringify({ taskId, outputUrl: '/agents/workspace' })}\n\n`)
              );
              task.status = 'completed';
              task.progress = 100;
              taskStore.set(taskId, task);
              controller.close();
              return;
            }

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                fullContent += content;
                // Forward the raw token as a message event so chat shows real streaming
                controller.enqueue(
                  encoder.encode(`event: message\ndata: ${JSON.stringify({ taskId, message: { id: `chunk_${Date.now()}`, taskId, role: 'assistant', content, timestamp: new Date().toISOString() } })}\n\n`)
                );
              }
            } catch {
              // Skip malformed
            }
          }
        }
      }

      // If we get here without [DONE], still close
      controller.enqueue(
        encoder.encode(`event: complete\ndata: ${JSON.stringify({ taskId, outputUrl: '/agents/workspace' })}\n\n`)
      );
      task.status = 'completed';
      task.progress = 100;
      taskStore.set(taskId, task);
      controller.close();
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

function parseComponentSuggestions(content: string): Array<{
  id: string;
  type: string;
  title: string;
  description: string;
  config: Record<string, unknown>;
  status: string;
}> {
  const suggestions: Array<{ id: string; type: string; title: string; description: string; config: Record<string, unknown>; status: string }> = [];
  const regex = /```json\n?([\s\S]*?)\n?```/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    try {
      const json = JSON.parse(match[1]);
      if (json.type && json.title) {
        suggestions.push({
          id: `sugg_${Date.now()}_${suggestions.length}`,
          type: json.type,
          title: json.title,
          description: json.description || '',
          config: json.config || {},
          status: 'pending',
        });
      }
    } catch { /* ignore invalid */ }
  }
  return suggestions;
}
