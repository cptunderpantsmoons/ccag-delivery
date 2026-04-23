"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Send, Bot, User, Square } from "lucide-react";
import { AppShell } from "../../components/shell/app-shell";
import { buildModelCatalog } from "../../lib/model-catalog.js";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const modelCatalog = buildModelCatalog({
  routingMode: "auto",
  allowPremium: true,
});

const modelOptions = modelCatalog.providers.flatMap((provider) =>
  provider.models.map((model) => ({
    value: model.id,
    label: `${provider.label} / ${model.label}`,
  }))
);

const defaultModel = modelOptions[0]?.value ?? "glm-5.1";

function parseSSEChunk(chunk: string): string {
  let content = "";
  for (const line of chunk.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data: ")) continue;
    const data = trimmed.slice(6);
    if (data === "[DONE]") break;
    try {
      const parsed = JSON.parse(data);
      const delta = parsed.choices?.[0]?.delta?.content;
      if (typeof delta === "string") {
        content += delta;
      }
    } catch {
      // ignore malformed JSON
    }
  }
  return content;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState(defaultModel);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg: Message = { role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    const abortController = new AbortController();
    abortRef.current = abortController;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [...messages, userMsg],
          temperature: 0.7,
          stream: true,
        }),
        signal: abortController.signal,
      });

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `Error: ${err.error || res.statusText}` },
        ]);
        setLoading(false);
        return;
      }

      // Start assistant message empty
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          const delta = parseSSEChunk(part);
          if (delta) {
            setMessages((prev) => {
              const next = [...prev];
              const last = next[next.length - 1];
              if (last && last.role === "assistant") {
                next[next.length - 1] = { ...last, content: last.content + delta };
              }
              return next;
            });
          }
        }
      }

      // Flush remaining buffer
      if (buffer) {
        const delta = parseSSEChunk(buffer);
        if (delta) {
          setMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last && last.role === "assistant") {
              next[next.length - 1] = { ...last, content: last.content + delta };
            }
            return next;
          });
        }
      }
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last && last.role === "assistant" && last.content === "") {
            next[next.length - 1] = { ...last, content: "Cancelled" };
          }
          return next;
        });
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `Error: ${error instanceof Error ? error.message : String(error)}` },
        ]);
      }
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }, [input, loading, messages, model]);

  function handleStop() {
    abortRef.current?.abort();
  }

  return (
    <AppShell title="Chat Workspace">
      <div className="flex h-[calc(100vh-8rem)] flex-col">
        <div className="mb-4 flex items-center gap-3">
          <label className="label-mono">Model</label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="carbon-input h-9 w-72 text-sm"
          >
            {modelOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          {messages.length === 0 && (
            <div className="flex h-full items-center justify-center text-[var(--text-tertiary)]">
              Start a conversation...
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`mb-4 flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--background)]">
                {msg.role === "user" ? <User size={16} /> : <Bot size={16} />}
              </div>
              <div
                className={`max-w-[70%] rounded-2xl border px-4 py-2 text-sm whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "border-[var(--border)] bg-[var(--deep)]"
                    : "border-[var(--border)] bg-[var(--background)]"
                }`}
              >
                {msg.content || (msg.role === "assistant" ? "\u00A0" : "")}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--background)]">
                <Bot size={16} />
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-sm text-[var(--text-tertiary)]">
                Thinking...
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder="Ask a question..."
            className="carbon-input min-h-[48px] flex-1 resize-none py-3"
            rows={1}
          />
          {loading ? (
            <button
              type="button"
              onClick={handleStop}
              className="carbon-button carbon-button-danger h-[48px] px-4"
            >
              <Square size={18} />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className="carbon-button carbon-button-primary h-[48px] px-4"
            >
              <Send size={18} />
            </button>
          )}
        </form>
      </div>
    </AppShell>
  );
}
