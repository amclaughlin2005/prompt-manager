'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';

type PromptVersion = { id: string; version: number; template: string; variables: Record<string, any> };

type Prompt = { id: string; name: string; description?: string | null; versions: PromptVersion[] };

type ModelItem = { key: string };

export default function PromptDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [data, setData] = useState<Prompt | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [tmpl, setTmpl] = useState('Hello {{name}}');
  const [varsJson, setVarsJson] = useState('{}');

  const [models, setModels] = useState<ModelItem[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<string>('');
  const [modelKey, setModelKey] = useState<string>('openai:gpt-4o-mini');
  const [inputVars, setInputVars] = useState<string>('{}');
  const [runResult, setRunResult] = useState<any>(null);
  const [running, setRunning] = useState(false);

  const load = async () => {
    const r = await fetch(`/api/v1/prompts/${id}`);
    const j = await r.json();
    if (r.ok) {
      setData(j.prompt);
      setSelectedVersionId(j.prompt?.versions?.[0]?.id || '');
    }
  };

  useEffect(() => { if (id) { load(); fetch('/api/v1/models').then(r=>r.json()).then(j=> setModels(j.models||[])); } }, [id]);

  const onCreateVersion = async () => {
    setLoading(true);
    setError('');
    try {
      const parsedVars = varsJson ? JSON.parse(varsJson) : {};
      const r = await fetch(`/api/v1/prompts/${id}/versions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ template: tmpl, variables: parsedVars }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Failed to create version');
      setTmpl(''); setVarsJson('{}');
      await load();
    } catch (e: any) {
      setError(e?.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  const onRun = async () => {
    setRunning(true); setRunResult(null); setError('');
    try {
      const vars = inputVars ? JSON.parse(inputVars) : {};
      const r = await fetch('/api/v1/runs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ promptVersionId: selectedVersionId, modelKey, inputVars: vars }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Run failed');
      setRunResult(j);
    } catch (e: any) {
      setError(e?.message || 'Error');
    } finally {
      setRunning(false);
    }
  };

  const currentVersion = useMemo(() => data?.versions?.find(v => v.id === selectedVersionId), [data, selectedVersionId]);

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="mb-4"><Link className="text-blue-600 underline" href="/prompts">← Back</Link></div>
      {data ? (
        <>
          <h1 className="text-2xl font-semibold mb-1">{data.name}</h1>
          {data.description && <div className="text-neutral-600 mb-6">{data.description}</div>}

          <div className="grid md:grid-cols-2 gap-6">
            <div className="border rounded p-4 space-y-3">
              <h2 className="text-lg font-medium">Create Version</h2>
              <textarea className="w-full border rounded px-3 py-2 h-32" placeholder="Template with {{variables}}" value={tmpl} onChange={(e)=>setTmpl(e.target.value)} />
              <textarea className="w-full border rounded px-3 py-2 h-24" placeholder="Variables JSON (optional)" value={varsJson} onChange={(e)=>setVarsJson(e.target.value)} />
              <button className="bg-black text-white rounded px-4 py-2" disabled={loading || !tmpl} onClick={onCreateVersion}>{loading? 'Creating…':'Create Version'}</button>
              {error && <div className="text-red-600 text-sm">{error}</div>}
            </div>

            <div className="border rounded p-4 space-y-3">
              <h2 className="text-lg font-medium">Versions</h2>
              {data.versions?.length ? (
                <select className="w-full border rounded px-3 py-2" value={selectedVersionId} onChange={(e)=>setSelectedVersionId(e.target.value)}>
                  {data.versions.map(v => (
                    <option key={v.id} value={v.id}>v{v.version}</option>
                  ))}
                </select>
              ) : <div className="text-sm text-neutral-600">No versions yet.</div>}

              {currentVersion && (
                <div className="text-xs text-neutral-600 whitespace-pre-wrap border rounded p-2">{currentVersion.template}</div>
              )}
            </div>
          </div>

          <div className="border rounded p-4 mt-6 space-y-3">
            <h2 className="text-lg font-medium">Run</h2>
            <div className="grid md:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Model</label>
                <select className="w-full border rounded px-3 py-2" value={modelKey} onChange={(e)=>setModelKey(e.target.value)}>
                  {models.map(m => (<option key={m.key} value={m.key}>{m.key}</option>))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Variables JSON</label>
                <textarea className="w-full border rounded px-3 py-2 h-24" value={inputVars} onChange={(e)=>setInputVars(e.target.value)} />
              </div>
            </div>
            <button className="bg-black text-white rounded px-4 py-2" disabled={running || !selectedVersionId} onClick={onRun}>{running ? 'Running…' : 'Run'}</button>
            {error && <div className="text-red-600 text-sm">{error}</div>}
            {runResult && (
              <div className="border rounded p-3 text-sm space-y-2">
                <div className="font-medium">Output</div>
                <pre className="whitespace-pre-wrap">{runResult.result?.content || ''}</pre>
                <div className="text-xs text-neutral-600">Latency: {runResult.result?.usage?.latencyMs ?? runResult?.latencyMs ?? '-'} ms • Cost: {runResult.result?.usage?.costUsd ?? runResult?.result?.usage?.costUsd ?? '-'} USD</div>
              </div>
            )}
          </div>
        </>
      ) : (
        <div>Loading…</div>
      )}
    </div>
  );
}
