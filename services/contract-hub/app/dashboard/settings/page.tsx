'use client';

import { useState, useEffect } from 'react';
import { AVAILABLE_MODELS, DEFAULT_MODEL_SETTINGS, type AIModelConfig } from '@/config/models';
import { ExternalLink } from 'lucide-react';

type ModelSettings = typeof DEFAULT_MODEL_SETTINGS;

interface SharePointFields {
  clientId: string;
  clientSecret: string;
  tenantId: string;
  siteId: string;
  libraryId: string;
}

interface IntegrationConnection {
  id: string;
  integrationType: string;
  name: string;
  config: Record<string, unknown>;
  status: string;
}

interface ClaudeFields {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

const EMPTY_SP: SharePointFields = { clientId: '', clientSecret: '', tenantId: '', siteId: '', libraryId: '' };
const EMPTY_CLAUDE: ClaudeFields = { clientId: '', clientSecret: '', redirectUri: '' };

export default function SettingsPage() {
  const [settings, setSettings] = useState<ModelSettings>(DEFAULT_MODEL_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // SharePoint
  const [spFields, setSpFields] = useState<SharePointFields>(EMPTY_SP);
  const [spConnection, setSpConnection] = useState<IntegrationConnection | null>(null);
  const [spTesting, setSpTesting] = useState(false);
  const [spSaving, setSpSaving] = useState(false);
  const [spStatus, setSpStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [showSecrets, setShowSecrets] = useState(false);

  // Claude / Anthropic
  type ClaudeProviderStatus = 'none' | 'configured' | 'active';
  const [claudeProviderStatus, setClaudeProviderStatus] = useState<ClaudeProviderStatus>('none');
  const [claudeFields, setClaudeFields] = useState<ClaudeFields>(EMPTY_CLAUDE);
  const [claudeModels, setClaudeModels] = useState<AIModelConfig[]>([]);
  const [claudeConnection, setClaudeConnection] = useState<IntegrationConnection | null>(null);
  const [claudeStatus, setClaudeStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [claudeSaving, setClaudeSaving] = useState(false);
  const [claudeDisconnecting, setClaudeDisconnecting] = useState(false);
  const [showClaudeSecret, setShowClaudeSecret] = useState(false);
  const [editingClaudeCredentials, setEditingClaudeCredentials] = useState(false);

  useEffect(() => {
    // Surface OAuth callback results from URL params, then clean the URL.
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('claude_connected') === '1') {
        setClaudeStatus({ ok: true, message: 'Claude connected successfully.' });
        window.history.replaceState(null, '', window.location.pathname);
      }
      const claudeErr = params.get('claude_error');
      if (claudeErr) {
        const desc = params.get('claude_error_desc');
        setClaudeStatus({ ok: false, message: desc || `OAuth error: ${claudeErr}` });
        window.history.replaceState(null, '', window.location.pathname);
      }
    }

    Promise.all([
      fetch('/api/settings').then(r => r.json()),
      fetch('/api/settings/integrations').then(r => r.json()),
      fetch('/api/ai/claude-models').then(r => r.json()),
    ]).then(([aiData, intData, claudeData]) => {
      if (aiData.success && aiData.settings) setSettings(aiData.settings);
      if (aiData.providers?.anthropic?.status) {
        setClaudeProviderStatus(aiData.providers.anthropic.status);
      }
      if (intData.success && Array.isArray(intData.data)) {
        const sp = intData.data.find((c: IntegrationConnection) => c.integrationType === 'sharepoint');
        if (sp) {
          setSpConnection(sp);
          const cfg = sp.config as Partial<SharePointFields>;
          setSpFields({
            clientId: cfg.clientId || '',
            clientSecret: cfg.clientSecret || '',
            tenantId: cfg.tenantId || '',
            siteId: cfg.siteId || '',
            libraryId: cfg.libraryId || '',
          });
        }
        const claude = intData.data.find((c: IntegrationConnection) => c.integrationType === 'anthropic');
        if (claude) {
          setClaudeConnection(claude);
          const cfg = claude.config as Partial<ClaudeFields>;
          setClaudeFields({
            clientId: cfg.clientId || '',
            clientSecret: cfg.clientSecret || '',
            redirectUri: cfg.redirectUri || '',
          });
        }
      }
      if (Array.isArray(claudeData.models)) setClaudeModels(claudeData.models);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  async function handleTestSharePoint() {
    setSpTesting(true);
    setSpStatus(null);
    try {
      const res = await fetch('/api/settings/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'sharepoint', ...spFields }),
      });
      const data = await res.json();
      setSpStatus({ ok: data.success, message: data.message });
    } catch (e) {
      setSpStatus({ ok: false, message: e instanceof Error ? e.message : 'Unknown error' });
    } finally {
      setSpTesting(false);
    }
  }

  async function handleSaveSharePoint() {
    setSpSaving(true);
    setSpStatus(null);
    try {
      const payload = {
        integrationType: 'sharepoint',
        name: 'SharePoint',
        config: spFields,
      };
      const res = spConnection
        ? await fetch('/api/settings/integrations', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: spConnection.id, config: spFields }),
          })
        : await fetch('/api/settings/integrations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Save failed');
      setSpConnection(data.data);
      setSpStatus({ ok: true, message: 'SharePoint configuration saved' });
    } catch (e) {
      setSpStatus({ ok: false, message: e instanceof Error ? e.message : 'Unknown error' });
    } finally {
      setSpSaving(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || data.errors?.join(', ') || 'Save failed');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  }

  // Merge static OpenRouter models with dynamically fetched Claude models.
  const allModels = [...AVAILABLE_MODELS, ...claudeModels];
  const extractionModels = allModels.filter(m => m.tier === 'extraction');
  const reviewModels = allModels.filter(m => m.tier === 'review');
  const analysisModels = allModels.filter(m => m.tier === 'analysis');

  async function handleSaveClaudeCredentials() {
    if (!claudeFields.clientId || !claudeFields.clientSecret || !claudeFields.redirectUri) return;
    setClaudeSaving(true);
    setClaudeStatus(null);
    try {
      const res = claudeConnection
        ? await fetch('/api/settings/integrations', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: claudeConnection.id, config: claudeFields }),
          })
        : await fetch('/api/settings/integrations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ integrationType: 'anthropic', name: 'Claude (Anthropic)', config: claudeFields }),
          });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Save failed');
      setClaudeConnection(data.data);
      if (claudeProviderStatus === 'none') setClaudeProviderStatus('configured');
      setEditingClaudeCredentials(false);
      setClaudeStatus({ ok: true, message: 'Credentials saved. Click "Connect with Claude" to authorise.' });
    } catch (e) {
      setClaudeStatus({ ok: false, message: e instanceof Error ? e.message : 'Save failed' });
    } finally {
      setClaudeSaving(false);
    }
  }

  async function handleClaudeDisconnect() {
    if (!claudeConnection) return;
    setClaudeDisconnecting(true);
    setClaudeStatus(null);
    try {
      const res = await fetch(`/api/settings/integrations?id=${claudeConnection.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Disconnect failed');
      setClaudeProviderStatus('none');
      setClaudeConnection(null);
      setClaudeModels([]);
      setClaudeFields(EMPTY_CLAUDE);
      setEditingClaudeCredentials(false);
      setClaudeStatus({ ok: true, message: 'Claude disconnected.' });
    } catch (e) {
      setClaudeStatus({ ok: false, message: e instanceof Error ? e.message : 'Disconnect failed' });
    } finally {
      setClaudeDisconnecting(false);
    }
  }

  function ModelSelect({
    label,
    description,
    value,
    models,
    onChange,
  }: {
    label: string;
    description: string;
    value: string;
    models: AIModelConfig[];
    onChange: (v: string) => void;
  }) {
    const selected = models.find(m => m.model === value);
    return (
      <div className="py-5 border-b border-[rgba(148,163,184,0.12)] last:border-0">
        <div className="flex items-start justify-between gap-6">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[#0F172A]">{label}</p>
            <p className="mt-0.5 text-xs text-[#64748B]">{description}</p>
            {selected && (
              <p className="mt-1 text-xs text-[#94A3B8]">{selected.description}</p>
            )}
          </div>
          <div className="w-64 shrink-0">
            <select
              value={value}
              onChange={e => onChange(e.target.value)}
              className="w-full rounded-[0.75rem] border border-[rgba(148,163,184,0.3)] px-3 py-2 text-sm focus:border-[#10B981] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
            >
              {models.length === 0 && (
                <option value="" disabled>No models available</option>
              )}
              {models.map(m => (
                <option key={m.id} value={m.model}>
                  {m.provider === 'anthropic' ? '[Claude] ' : ''}
                  {m.displayName}{m.isFree ? ' (Free)' : m.costPer1kTokens ? ` ($${m.costPer1kTokens}/1k)` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="skeleton w-8 h-8 rounded-full" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">Settings</h1>
        <p className="mt-1 text-[0.875rem] text-[#64748B]">Configure AI models and platform behaviour</p>
      </div>

      <div className="space-y-6">
        {/* Claude / Anthropic OAuth */}
        <div className="bg-white rounded-xl border border-[rgba(148,163,184,0.15)] overflow-hidden">
          <div className="px-6 py-4 border-b border-[rgba(148,163,184,0.12)] flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-[#0F172A]">Claude / Anthropic</h2>
              <p className="mt-0.5 text-xs text-[#64748B]">Enter your OAuth app credentials to connect and import Claude models</p>
            </div>
            {claudeProviderStatus === 'active' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]">
                Connected
              </span>
            )}
            {claudeProviderStatus === 'configured' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]">
                Credentials saved
              </span>
            )}
          </div>
          <div className="px-6 py-5 space-y-4">
            {claudeStatus && (
              <div className={`px-4 py-2.5 rounded-[0.75rem] text-sm ${
                claudeStatus.ok ? 'bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]' : 'bg-[#FEF2F2] text-[#B91C1C] border border-[#FECACA]'
              }`}>
                {claudeStatus.message}
              </div>
            )}

            {/* Credential form — shown when not connected, or when editing */}
            {(claudeProviderStatus !== 'active' || editingClaudeCredentials) && (
              <div className="space-y-4">
                <p className="text-xs text-[#64748B]">
                  Register an OAuth app at{' '}
                  <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer"
                    className="text-[#10B981] hover:underline inline-flex items-center gap-0.5">
                    console.anthropic.com <ExternalLink className="h-3 w-3" />
                  </a>
                  {' '}then paste the credentials below.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-[#334155] mb-1">Client ID <span className="text-[#EF4444]">*</span></label>
                    <input
                      type="text"
                      value={claudeFields.clientId}
                      onChange={e => setClaudeFields(s => ({ ...s, clientId: e.target.value }))}
                      placeholder="Your OAuth client ID"
                      className="w-full rounded-[0.75rem] border border-[rgba(148,163,184,0.3)] px-3 py-2 text-sm font-mono focus:border-[#10B981] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#334155] mb-1">
                      Client Secret <span className="text-[#EF4444]">*</span>
                      <button type="button" onClick={() => setShowClaudeSecret(s => !s)}
                        className="ml-2 text-[#94A3B8] hover:text-[#64748B] text-xs font-normal">
                        {showClaudeSecret ? 'hide' : 'show'}
                      </button>
                    </label>
                    <input
                      type={showClaudeSecret ? 'text' : 'password'}
                      value={claudeFields.clientSecret}
                      onChange={e => setClaudeFields(s => ({ ...s, clientSecret: e.target.value }))}
                      placeholder="Your OAuth client secret"
                      className="w-full rounded-[0.75rem] border border-[rgba(148,163,184,0.3)] px-3 py-2 text-sm font-mono focus:border-[#10B981] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-[#334155] mb-1">Redirect URI <span className="text-[#EF4444]">*</span></label>
                    <input
                      type="url"
                      value={claudeFields.redirectUri}
                      onChange={e => setClaudeFields(s => ({ ...s, redirectUri: e.target.value }))}
                      placeholder="https://your-app.com/api/auth/claude/callback"
                      className="w-full rounded-[0.75rem] border border-[rgba(148,163,184,0.3)] px-3 py-2 text-sm font-mono focus:border-[#10B981] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                    />
                    <p className="mt-1 text-[10px] text-[#94A3B8]">Must match the redirect URI registered in your Anthropic OAuth app.</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleSaveClaudeCredentials}
                    disabled={claudeSaving || !claudeFields.clientId || !claudeFields.clientSecret || !claudeFields.redirectUri}
                    className="px-4 py-2 text-sm font-medium text-white bg-[#10B981] rounded-[0.75rem] hover:bg-[#059669] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {claudeSaving ? 'Saving…' : 'Save Credentials'}
                  </button>
                  {editingClaudeCredentials && (
                    <button
                      onClick={() => setEditingClaudeCredentials(false)}
                      className="px-4 py-2 text-sm font-medium text-[#64748B] border border-[rgba(148,163,184,0.3)] rounded-[0.75rem] hover:bg-[#F8FAFC] transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Ready to connect — credentials saved, OAuth not yet done */}
            {claudeProviderStatus === 'configured' && !editingClaudeCredentials && (
              <a
                href="/api/auth/claude"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#10B981] rounded-[0.75rem] hover:bg-[#059669] transition-colors"
              >
                Connect with Claude
              </a>
            )}

            {/* Connected — show models */}
            {claudeProviderStatus === 'active' && !editingClaudeCredentials && (
              <div className="space-y-4">
                {claudeModels.length > 0 ? (
                  <div>
                    <p className="text-xs font-medium text-[#64748B] mb-2">
                      {claudeModels.length} model{claudeModels.length !== 1 ? 's' : ''} imported
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {claudeModels.map(m => (
                        <div key={m.id} className="flex items-center justify-between rounded-[0.5rem] border border-[rgba(148,163,184,0.15)] bg-[#F8FAFC] px-3 py-2">
                          <span className="text-xs font-mono text-[#0F172A] truncate">{m.model}</span>
                          <span className="ml-2 shrink-0 rounded-full bg-[#F1F5F9] px-2 py-0.5 text-[10px] font-medium text-[#64748B] uppercase tracking-wide">
                            {m.tier}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-[#64748B]">No models returned from Anthropic API.</p>
                )}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setEditingClaudeCredentials(true)}
                    className="px-4 py-2 text-sm font-medium text-[#334155] border border-[rgba(148,163,184,0.3)] rounded-[0.75rem] hover:bg-[#F8FAFC] transition-colors"
                  >
                    Edit Credentials
                  </button>
                  <button
                    onClick={handleClaudeDisconnect}
                    disabled={claudeDisconnecting}
                    className="px-4 py-2 text-sm font-medium text-[#B91C1C] border border-[#FECACA] rounded-[0.75rem] hover:bg-[#FEF2F2] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {claudeDisconnecting ? 'Disconnecting…' : 'Disconnect'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* AI Model Configuration */}
        <div className="bg-white rounded-xl border border-[rgba(148,163,184,0.15)] overflow-hidden">
          <div className="px-6 py-4 border-b border-[rgba(148,163,184,0.12)]">
            <h2 className="text-base font-semibold text-[#0F172A]">AI Model Configuration</h2>
            <p className="mt-0.5 text-xs text-[#64748B]">Select models for each processing tier — includes Claude models when connected above</p>
          </div>
          <div className="px-6">
            <ModelSelect
              label="Default Model"
              description="Used for general-purpose AI tasks"
              value={settings.defaultModel}
              models={allModels}
              onChange={v => setSettings(s => ({ ...s, defaultModel: v }))}
            />
            <ModelSelect
              label="Extraction Model"
              description="Document parsing, entity extraction, and classification"
              value={settings.extractionModel}
              models={extractionModels}
              onChange={v => setSettings(s => ({ ...s, extractionModel: v }))}
            />
            <ModelSelect
              label="Review Model"
              description="Contract review, clause analysis, and risk assessment"
              value={settings.reviewModel}
              models={reviewModels}
              onChange={v => setSettings(s => ({ ...s, reviewModel: v }))}
            />
            <ModelSelect
              label="Analysis Model"
              description="Deep legal analysis, compliance checks, and reasoning"
              value={settings.analysisModel}
              models={analysisModels}
              onChange={v => setSettings(s => ({ ...s, analysisModel: v }))}
            />
          </div>
        </div>

        {/* Automation */}
        <div className="bg-white rounded-xl border border-[rgba(148,163,184,0.15)] overflow-hidden">
          <div className="px-6 py-4 border-b border-[rgba(148,163,184,0.12)]">
            <h2 className="text-base font-semibold text-[#0F172A]">Automation</h2>
          </div>
          <div className="px-6 divide-y divide-gray-100">
            <div className="py-5 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#0F172A]">Require Human Approval</p>
                <p className="mt-0.5 text-xs text-[#64748B]">AI actions require manual sign-off before executing</p>
              </div>
              <button
                role="switch"
                aria-checked={settings.requireHumanApproval}
                onClick={() => setSettings(s => ({ ...s, requireHumanApproval: !s.requireHumanApproval }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.requireHumanApproval ? 'bg-[#10B981]' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.requireHumanApproval ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            <div className="py-5 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#0F172A]">Auto-Classify Documents</p>
                <p className="mt-0.5 text-xs text-[#64748B]">Automatically classify document types on upload</p>
              </div>
              <button
                role="switch"
                aria-checked={settings.autoClassifyDocuments}
                onClick={() => setSettings(s => ({ ...s, autoClassifyDocuments: !s.autoClassifyDocuments }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.autoClassifyDocuments ? 'bg-[#10B981]' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.autoClassifyDocuments ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* SharePoint Integration */}
        <div className="bg-white rounded-xl border border-[rgba(148,163,184,0.15)] overflow-hidden">
          <div className="px-6 py-4 border-b border-[rgba(148,163,184,0.12)] flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-[#0F172A]">SharePoint Integration</h2>
              <p className="mt-0.5 text-xs text-[#64748B]">Azure AD app credentials for Microsoft Graph API access</p>
            </div>
            {spConnection && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#15803D]" />
                Configured
              </span>
            )}
          </div>
          <div className="px-6 py-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#334155] mb-1">Azure AD Client ID <span className="text-[#EF4444]">*</span></label>
                <input
                  type="text"
                  value={spFields.clientId}
                  onChange={e => setSpFields(s => ({ ...s, clientId: e.target.value }))}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  className="w-full rounded-[0.75rem] border border-[rgba(148,163,184,0.3)] px-3 py-2 text-sm font-mono focus:border-[#10B981] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#334155] mb-1">Azure AD Tenant ID <span className="text-[#EF4444]">*</span></label>
                <input
                  type="text"
                  value={spFields.tenantId}
                  onChange={e => setSpFields(s => ({ ...s, tenantId: e.target.value }))}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  className="w-full rounded-[0.75rem] border border-[rgba(148,163,184,0.3)] px-3 py-2 text-sm font-mono focus:border-[#10B981] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-[#334155] mb-1">
                  Client Secret <span className="text-[#EF4444]">*</span>
                  <button
                    type="button"
                    onClick={() => setShowSecrets(s => !s)}
                    className="ml-2 text-[#94A3B8] hover:text-gray-600 text-xs font-normal"
                  >
                    {showSecrets ? 'hide' : 'show'}
                  </button>
                </label>
                <input
                  type={showSecrets ? 'text' : 'password'}
                  value={spFields.clientSecret}
                  onChange={e => setSpFields(s => ({ ...s, clientSecret: e.target.value }))}
                  placeholder="Enter client secret value"
                  className="w-full rounded-[0.75rem] border border-[rgba(148,163,184,0.3)] px-3 py-2 text-sm font-mono focus:border-[#10B981] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#334155] mb-1">Site ID <span className="text-[#94A3B8] font-normal">(optional)</span></label>
                <input
                  type="text"
                  value={spFields.siteId}
                  onChange={e => setSpFields(s => ({ ...s, siteId: e.target.value }))}
                  placeholder="e.g. contoso.sharepoint.com,abc123..."
                  className="w-full rounded-[0.75rem] border border-[rgba(148,163,184,0.3)] px-3 py-2 text-sm font-mono focus:border-[#10B981] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#334155] mb-1">Document Library ID <span className="text-[#94A3B8] font-normal">(optional)</span></label>
                <input
                  type="text"
                  value={spFields.libraryId}
                  onChange={e => setSpFields(s => ({ ...s, libraryId: e.target.value }))}
                  placeholder="Library drive ID"
                  className="w-full rounded-[0.75rem] border border-[rgba(148,163,184,0.3)] px-3 py-2 text-sm font-mono focus:border-[#10B981] focus:outline-none focus:ring-2 focus:ring-[#10B981]"
                />
              </div>
            </div>

            {spStatus && (
              <div className={`px-4 py-2.5 rounded-[0.75rem] text-sm ${spStatus.ok ? 'bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]' : 'bg-[#FEF2F2] text-[#B91C1C] border border-[#FECACA]'}`}>
                {spStatus.message}
              </div>
            )}

            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={handleTestSharePoint}
                disabled={spTesting || !spFields.clientId || !spFields.clientSecret || !spFields.tenantId}
                className="px-4 py-2 text-sm font-medium text-[#334155] border border-[rgba(148,163,184,0.3)] rounded-[0.75rem] hover:bg-[#F8FAFC] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {spTesting ? 'Testing…' : 'Test Connection'}
              </button>
              <button
                onClick={handleSaveSharePoint}
                disabled={spSaving || !spFields.clientId || !spFields.clientSecret || !spFields.tenantId}
                className="px-4 py-2 text-sm font-medium text-white bg-[#10B981] rounded-[0.75rem] hover:bg-[#059669] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {spSaving ? 'Saving…' : spConnection ? 'Update' : 'Save Connection'}
              </button>
            </div>
          </div>
        </div>

        {/* Save */}
        <div className="flex items-center justify-end gap-3">
          {error && <p className="text-sm text-[#B91C1C]">{error}</p>}
          {saved && <p className="text-sm text-emerald-600">Saved</p>}
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#10B981] text-white text-sm font-medium rounded-[0.75rem] hover:bg-[#059669] disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
