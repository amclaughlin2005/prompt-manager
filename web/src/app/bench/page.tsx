'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type ModelItem = { key: string; provider: string; tools: boolean };

type ChatMessage = { role: 'system' | 'user' | 'assistant' | 'tool'; content: string };

type ChatRequest = {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
};

export default function BenchPage() {
  const [models, setModels] = useState<ModelItem[]>([]);
  const [model, setModel] = useState<string>('openai:gpt-4o-mini');
  const [system, setSystem] = useState<string>('You are a helpful assistant.');
  const [prompt, setPrompt] = useState<string>('Say hello in 3 words.');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<string>('');
  const [usage, setUsage] = useState<{ inputTokens?: number; outputTokens?: number; costUsd?: number }>();
  const [error, setError] = useState<string>('');

  useEffect(() => {
    fetch('/api/v1/models')
      .then((r) => r.json())
      .then((j) => {
        setModels(j.models || []);
        if (j.models?.length && !j.models.find((m: ModelItem) => m.key === model)) {
          setModel(j.models[0].key);
        }
      })
      .catch(() => {});
  }, []);

  const onRun = async () => {
    setLoading(true);
    setError('');
    setResponse('');
    setUsage(undefined);
    try {
      const body: ChatRequest = {
        model,
        messages: [
          ...(system ? [{ role: 'system', content: system } as ChatMessage] : []),
          { role: 'user', content: prompt },
        ],
        maxTokens: 256,
      };
      const r = await fetch('/api/v1/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Request failed');
      setResponse(j.content || '');
      setUsage(j.usage);
    } catch (e: any) {
      setError(e?.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  const modelOptions = useMemo(() => models.map((m) => ({ value: m.key, label: `${m.key}` })), [models]);

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Prompt Bench</h1>
        <Link href="/" className="text-sm text-neutral-600 hover:underline">Home</Link>
      </div>

      <div className="card p-5 space-y-6">
        <div>
          <label className="label">Model</label>
          <select
            className="select"
            value={model}
            onChange={(e) => setModel(e.target.value)}
          >
            {modelOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">System</label>
          <textarea className="textarea h-20" value={system} onChange={(e) => setSystem(e.target.value)} />
        </div>

        <div>
          <label className="label">User Prompt</label>
          <textarea className="textarea h-28" value={prompt} onChange={(e) => setPrompt(e.target.value)} />
        </div>

        <button
          onClick={onRun}
          disabled={loading}
          className="btn-primary"
        >
          {loading ? 'Running…' : 'Run'}
        </button>

        {error && <div className="text-red-600 text-sm">{error}</div>}

        {(response || usage) && (
          <div className="card p-4 space-y-3">
            {response && (
              <div>
                <div className="text-sm font-medium mb-1">Response</div>
                <pre className="whitespace-pre-wrap text-sm">{response}</pre>
              </div>
            )}
            {usage && (
              <div className="text-xs text-neutral-600">Tokens: in {usage.inputTokens ?? '-'} / out {usage.outputTokens ?? '-'} • Cost: {usage.costUsd ?? '-'} USD</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

