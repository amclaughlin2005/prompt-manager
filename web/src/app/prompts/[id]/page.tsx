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
  const [recentRuns, setRecentRuns] = useState<any[]>([]);
  const [inputVarsError, setInputVarsError] = useState<string>('');
  const [varsObj, setVarsObj] = useState<Record<string, any>>({});

  const load = async () => {
    const r = await fetch(`/api/v1/prompts/${id}`);
    const j = await r.json();
    if (r.ok) {
      setData(j.prompt);
      setSelectedVersionId(j.prompt?.versions?.[0]?.id || '');
    }
  };

  const loadRuns = async (pvId: string) => {
    if (!pvId) return;
    try {
      const r = await fetch(`/api/v1/runs?promptVersionId=${pvId}&limit=10`);
      const j = await r.json();
      if (r.ok) setRecentRuns(j.runs || []);
    } catch {}
  };

  useEffect(() => { if (id) { load(); fetch('/api/v1/models').then(r=>r.json()).then(j=> setModels(j.models||[])); } }, [id]);
  useEffect(() => { if (selectedVersionId) loadRuns(selectedVersionId); }, [selectedVersionId]);

  // Keep varsObj in sync with selected version variables
  useEffect(() => {
    const current = data?.versions?.find(v => v.id === selectedVersionId);
    if (current) {
      const base: Record<string, any> = { ...current.variables };
      setVarsObj(base);
      try { setInputVars(JSON.stringify(base, null, 2)); setInputVarsError(''); } catch {}
    }
  }, [selectedVersionId, data]);

  const onCreateVersion = async () => {
    setLoading(true);
    setError('');
    try {
      let parsedVars: any = {};
      try { parsedVars = varsJson ? JSON.parse(varsJson) : {}; setInputVarsError(''); } catch (e) { setInputVarsError('Invalid JSON'); throw e; }
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
      let vars: any = {};
      try { vars = inputVars ? JSON.parse(inputVars) : {}; setInputVarsError(''); } catch (e) { setInputVarsError('Invalid JSON'); throw e; }
      const r = await fetch('/api/v1/runs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ promptVersionId: selectedVersionId, modelKey, inputVars: vars }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Run failed');
      setRunResult(j);
      loadRuns(selectedVersionId);
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
                <div className="space-y-2">
                  <div className="text-xs text-neutral-600 whitespace-pre-wrap border rounded p-2">{currentVersion.template}</div>
                  <div className="text-sm text-neutral-700">Variables</div>
                  <div className="grid md:grid-cols-2 gap-2">
                    {Object.keys(varsObj || {}).map((key) => (
                      <div key={key} className="flex items-center gap-2">
                        <label className="w-32 text-xs text-neutral-600">{key}</label>
                        <input
                          className="flex-1 border rounded px-2 py-1 text-sm"
                          value={String(varsObj[key] ?? '')}
                          onChange={(e)=>{
                            const next = { ...varsObj, [key]: e.target.value };
                            setVarsObj(next);
                            try { setInputVars(JSON.stringify(next, null, 2)); setInputVarsError(''); } catch {}
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
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
                <textarea className={`w-full border rounded px-3 py-2 h-24 ${inputVarsError ? 'border-red-500' : ''}`} value={inputVars} onChange={(e)=>{setInputVars(e.target.value); try { const v = JSON.parse(e.target.value); setVarsObj(v); setInputVarsError(''); } catch { setInputVarsError('Invalid JSON'); }}} />
                {inputVarsError && <div className="text-xs text-red-600">{inputVarsError}</div>}
              </div>
            </div>
            <button className="bg-black text-white rounded px-4 py-2" disabled={running || !selectedVersionId || !!inputVarsError} onClick={onRun}>{running ? 'Running…' : 'Run'}</button>
            {error && <div className="text-red-600 text-sm">{error}</div>}
            {runResult && (
              <div className="border rounded p-3 text-sm space-y-2">
                <div className="font-medium">Output</div>
                <pre className="whitespace-pre-wrap">{runResult.result?.content || ''}</pre>
                <div className="text-xs text-neutral-600">Latency: {runResult.result?.usage?.latencyMs ?? runResult?.latencyMs ?? '-'} ms • Cost: {runResult.result?.usage?.costUsd ?? runResult?.result?.usage?.costUsd ?? '-'} USD</div>
              </div>
            )}
          </div>

          <div className="border rounded p-4 mt-6 space-y-2">
            <h2 className="text-lg font-medium">Recent Runs</h2>
            {recentRuns.length === 0 && <div className="text-sm text-neutral-600">No runs yet.</div>}
            <div className="space-y-2">
              {recentRuns.map((r) => (
                <div key={r.id} className="text-sm border rounded p-2 flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-mono text-xs text-neutral-600">{new Date(r.createdAt).toLocaleString()}</div>
                    <div className="text-neutral-800">{r.output?.content?.slice(0, 160) || ''}{(r.output?.content?.length || 0) > 160 ? '…' : ''}</div>
                  </div>
                  <div className="text-xs text-neutral-600 ml-4 whitespace-nowrap">{r.modelKey} • {r.latencyMs ?? '-'} ms • ${r.costUsd ?? '-'}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div>Loading…</div>
      )}
    </div>
  );
}
