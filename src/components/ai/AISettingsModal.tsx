import React, { useEffect, useState } from 'react';
import { AIProviderId, AISettingsConfig, DEFAULT_AI_SETTINGS } from '../../types/game';
import { CheckCircle2, Cpu, Loader2, PlugZap, X, XCircle } from 'lucide-react';
import { safeFetchJson } from '../../utils/apiClient';

interface AISettingsModalProps {
  onClose: () => void;
}

const PROVIDER_MODELS: Record<AIProviderId, string[]> = {
  gemini: ['gemini-4-hydrogen', 'gemini-4-argon'],
  openrouter: ['google/gemini-2.5-flash', 'openai/gpt-4o-mini', 'anthropic/claude-3.5-haiku'],
  anthropic: ['claude-3-5-haiku-latest', 'claude-3-7-sonnet-latest'],
  openai: ['gpt-4o-mini', 'gpt-4o'],
};

export const AISettingsModal: React.FC<AISettingsModalProps> = ({ onClose }) => {
  const [settings, setSettings] = useState<AISettingsConfig>(DEFAULT_AI_SETTINGS);
  const [providersConfigured, setProvidersConfigured] = useState<Record<AIProviderId, boolean>>({
    gemini: false,
    openrouter: false,
    anthropic: false,
    openai: false,
  });
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    safeFetchJson<{ settings?: AISettingsConfig; providers?: Record<AIProviderId, boolean> }>(
      '/api/ai/settings'
    )
      .then((res) => {
        if (!res.ok || !res.data) return;
        if (res.data.settings) setSettings(res.data.settings);
        if (res.data.providers) setProvidersConfigured(res.data.providers);
      })
      .catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await safeFetchJson('/api/ai/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await safeFetchJson<{ ok?: boolean; message?: string }>('/api/ai/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: settings.provider, model: settings.model }),
      });
      if (!result.ok || !result.data) {
        setTestResult({ ok: false, message: result.error || 'Koneksi gagal.' });
        return;
      }
      setTestResult({ ok: !!result.data.ok, message: result.data.message || 'Test selesai.' });
    } catch (err: any) {
      setTestResult({ ok: false, message: err?.message || 'Koneksi gagal.' });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#09090D]/85 p-4">
      <div className="bg-[#171820] border border-white/15 rounded-2xl shadow-2xl max-w-md w-full p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-[#7029FF]" />
            <h2 className="font-display text-base font-bold text-[#F4F1EA]">AI Provider Settings</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#20222D] text-[#A6A9B7] hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-[11px] text-[#A6A9B7] leading-relaxed">
          Kunci API disimpan eksklusif pada server environment Secrets (bukan di browser). Pilih provider
          aktif dan model untuk generasi kuis &amp; studi kasus kimia:
        </p>

        <div className="space-y-3 text-xs">
          <div>
            <label className="block font-bold text-[#A6A9B7] mb-1">Active AI Provider</label>
            <div className="grid grid-cols-2 gap-1.5">
              {(['gemini', 'openrouter', 'anthropic', 'openai'] as AIProviderId[]).map((p) => {
                const ready = providersConfigured[p];
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() =>
                      setSettings((s) => ({
                        ...s,
                        provider: p,
                        model: PROVIDER_MODELS[p][0],
                      }))
                    }
                    className={`p-2 rounded-lg border text-left flex items-center justify-between cursor-pointer ${
                      settings.provider === p
                        ? 'bg-[#7029FF]/25 border-[#7029FF] text-white font-bold'
                        : 'bg-[#20222D] border-white/10 text-[#A6A9B7] hover:text-white'
                    }`}
                  >
                    <span className="capitalize">{p}</span>
                    <span
                      className={`text-[9px] font-mono ${
                        ready ? 'text-[#32C48D]' : 'text-[#A6A9B7]/70'
                      }`}
                    >
                      {ready ? 'SECRET OK' : 'UNSET'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-bold text-[#A6A9B7] mb-1">Model</label>
              <select
                value={settings.model}
                onChange={(e) => setSettings((s) => ({ ...s, model: e.target.value }))}
                className="w-full px-2.5 py-2 rounded-lg bg-[#09090D] border border-white/15 text-[#F4F1EA] font-mono text-[11px]"
              >
                {PROVIDER_MODELS[settings.provider].map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-[#A6A9B7] mb-1">Fallback Provider</label>
              <select
                value={settings.fallbackProvider}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, fallbackProvider: e.target.value as any }))
                }
                className="w-full px-2.5 py-2 rounded-lg bg-[#09090D] border border-white/15 text-[#F4F1EA] text-[11px]"
              >
                <option value="none">None (Strict)</option>
                <option value="gemini">Gemini</option>
                <option value="openrouter">OpenRouter</option>
                <option value="anthropic">Claude</option>
                <option value="openai">OpenAI</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block font-bold text-[#A6A9B7] mb-1">Difficulty</label>
              <select
                value={settings.difficulty}
                onChange={(e) => setSettings((s) => ({ ...s, difficulty: e.target.value as any }))}
                className="w-full px-2 py-2 rounded-lg bg-[#09090D] border border-white/15 text-[#F4F1EA] text-[11px]"
              >
                <option value="mudah">Mudah</option>
                <option value="sedang">Sedang</option>
                <option value="sulit">Sulit</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-[#A6A9B7] mb-1">Timeout (ms)</label>
              <input
                type="number"
                min={5000}
                max={60000}
                step={1000}
                value={settings.timeoutMs}
                onChange={(e) => setSettings((s) => ({ ...s, timeoutMs: Number(e.target.value) }))}
                className="w-full px-2 py-2 rounded-lg bg-[#09090D] border border-white/15 text-[#F4F1EA] font-mono text-[11px]"
              />
            </div>
            <div>
              <label className="block font-bold text-[#A6A9B7] mb-1">Max Tokens</label>
              <input
                type="number"
                min={400}
                max={4096}
                step={100}
                value={settings.maxOutputTokens}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, maxOutputTokens: Number(e.target.value) }))
                }
                className="w-full px-2 py-2 rounded-lg bg-[#09090D] border border-white/15 text-[#F4F1EA] font-mono text-[11px]"
              />
            </div>
          </div>
        </div>

        {testResult && (
          <div
            className={`p-2.5 rounded-lg border text-[11px] flex items-center gap-2 ${
              testResult.ok
                ? 'bg-[#14291D] border-[#32C48D] text-[#86EFAC]'
                : 'bg-[#3B161B] border-[#F45B69] text-[#FCA5A5]'
            }`}
          >
            {testResult.ok ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{testResult.message}</span>
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            disabled={testing}
            onClick={handleTest}
            className="px-3 py-2.5 rounded-xl bg-[#20222D] hover:bg-[#2C2F3D] border border-white/15 text-[#F4F1EA] font-bold text-xs flex items-center gap-1.5 cursor-pointer"
          >
            {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PlugZap className="w-3.5 h-3.5 text-[#FF8733]" />}
            <span>Test Connection</span>
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="flex-1 py-2.5 rounded-xl bg-[#286BFF] hover:bg-[#1D57DC] text-white font-bold text-xs cursor-pointer"
          >
            {saving ? 'Saving...' : 'Save AI Settings'}
          </button>
        </div>
      </div>
    </div>
  );
};
