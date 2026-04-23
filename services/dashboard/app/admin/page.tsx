"use client";

import { useState, useEffect } from "react";
import { Save, Shield } from "lucide-react";
import { AppShell } from "../components/shell/app-shell";

type Policy = {
  routing_mode: string;
  default_provider: string;
  allowed_providers: string[];
  benchmark_mode: boolean;
};

const providers = [
  { id: "featherless", label: "Featherless" },
  { id: "deepseek", label: "DeepSeek" },
  { id: "openai", label: "OpenAI" },
  { id: "anthropic", label: "Claude" },
];

export default function AdminPage() {
  const [policy, setPolicy] = useState<Policy>({
    routing_mode: "auto",
    default_provider: "featherless",
    allowed_providers: ["featherless", "deepseek", "openai", "anthropic"],
    benchmark_mode: true,
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/orchestrator/v1/model-policy/me")
      .then((r) => r.json())
      .then((data) => {
        if (data) {
          setPolicy({
            routing_mode: data.routing_mode || "auto",
            default_provider: data.default_provider || "featherless",
            allowed_providers: data.allowed_providers || [],
            benchmark_mode: data.benchmark_mode ?? true,
          });
        }
      })
      .catch(() => {});
  }, []);

  async function handleSave() {
    setSaving(true);
    setMessage("");

    try {
      const res = await fetch("/api/orchestrator/admin/model-policy", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(policy),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Save failed" }));
        setMessage(`Error: ${err.error || res.statusText}`);
      } else {
        setMessage("Policy saved successfully.");
      }
    } catch (error) {
      setMessage(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setSaving(false);
    }
  }

  function toggleProvider(id: string) {
    setPolicy((prev) => {
      const has = prev.allowed_providers.includes(id);
      return {
        ...prev,
        allowed_providers: has
          ? prev.allowed_providers.filter((p) => p !== id)
          : [...prev.allowed_providers, id],
      };
    });
  }

  return (
    <AppShell title="Admin Controls">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-center gap-3">
          <Shield size={24} className="text-[var(--accent)]" />
          <div>
            <h2 className="editorial-heading text-3xl font-semibold text-[var(--text-primary)]">
              Admin Controls
            </h2>
            <p className="text-sm text-[var(--text-secondary)]">
              Manage model routing policies and provider access.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <section className="rounded border border-[var(--border)] bg-[var(--surface)] p-6">
            <h3 className="label-mono mb-4">Routing Mode</h3>
            <div className="flex gap-4">
              {["auto", "force_premium", "block_premium"].map((mode) => (
                <label key={mode} className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                  <input
                    type="radio"
                    name="routing_mode"
                    value={mode}
                    checked={policy.routing_mode === mode}
                    onChange={(e) => setPolicy({ ...policy, routing_mode: e.target.value })}
                    className="accent-[var(--accent)]"
                  />
                  <span className="capitalize">{mode.replace("_", " ")}</span>
                </label>
              ))}
            </div>
          </section>

          <section className="rounded border border-[var(--border)] bg-[var(--surface)] p-6">
            <h3 className="label-mono mb-4">Default Provider</h3>
            <select
              value={policy.default_provider}
              onChange={(e) => setPolicy({ ...policy, default_provider: e.target.value })}
              className="carbon-input h-10 w-64"
            >
              {providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </section>

          <section className="rounded border border-[var(--border)] bg-[var(--surface)] p-6">
            <h3 className="label-mono mb-4">Allowed Providers</h3>
            <div className="space-y-2">
              {providers.map((p) => (
                <label key={p.id} className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                  <input
                    type="checkbox"
                    checked={policy.allowed_providers.includes(p.id)}
                    onChange={() => toggleProvider(p.id)}
                    className="accent-[var(--accent)]"
                  />
                  {p.label}
                </label>
              ))}
            </div>
          </section>

          <section className="rounded border border-[var(--border)] bg-[var(--surface)] p-6">
            <h3 className="label-mono mb-4">Benchmark Mode</h3>
            <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
              <input
                type="checkbox"
                checked={policy.benchmark_mode}
                onChange={(e) => setPolicy({ ...policy, benchmark_mode: e.target.checked })}
                className="accent-[var(--accent)]"
              />
              Enable benchmark comparisons
            </label>
          </section>

          <div className="flex items-center gap-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="carbon-button carbon-button-primary"
            >
              <Save size={16} />
              {saving ? "Saving..." : "Save Policy"}
            </button>
            {message && (
              <span
                className={`text-sm ${
                  message.startsWith("Error") ? "text-[var(--status-error)]" : "text-[var(--status-success)]"
                }`}
              >
                {message}
              </span>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
