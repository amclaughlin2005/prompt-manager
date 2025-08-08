'use client';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

function toCSV(rows: any[]): string {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const esc = (v: any) => {
    const s = String(v ?? '');
    if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  };
  return [headers.join(','), ...rows.map(r => headers.map(h => esc(r[h])).join(','))].join('\n');
}

export default function DatasetDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [dataset, setDataset] = useState<any>(null);
  const [examples, setExamples] = useState<any[]>([]);
  const [inputsJson, setInputsJson] = useState<string>('{}');
  const [expectedJson, setExpectedJson] = useState<string>('');
  const [inputsErr, setInputsErr] = useState<string>('');

  const [prompts, setPrompts] = useState<any[]>([]);
  const [selectedPVIds, setSelectedPVIds] = useState<string[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);

  const [judgeType, setJudgeType] = useState<'contains' | 'regex' | 'llm'>('contains');
  const [judgeKey, setJudgeKey] = useState<string>('success');
  const [judgeModel, setJudgeModel] = useState<string>('openai:gpt-4o-mini');

  const [running, setRunning] = useState(false);
  const [runId, setRunId] = useState<string>('');
  const [run, setRun] = useState<any>(null);
  const [progress, setProgress] = useState<{ total: number; completed: number } | null>(null);

  const load = async () => {
    const dsr = await fetch(`/api/v1/evals/datasets/${id}`);
    const dsj = await dsr.json();
    if (dsr.ok) { setDataset(dsj.dataset); setExamples(dsj.dataset.examples || []); }
    const pr = await fetch('/api/v1/prompts');
    const pj = await pr.json();
    if (pr.ok) setPrompts(pj.prompts || []);
    const mr = await fetch('/api/v1/models');
    const mj = await mr.json();
    if (mr.ok) setModels(mj.models || []);
  };

  useEffect(() => { if (id) load(); }, [id]);

  const onAddExample = async () => {
    try {
      const inputs = inputsJson ? JSON.parse(inputsJson) : {};
      setInputsErr('');
      const expected = expectedJson ? JSON.parse(expectedJson) : undefined;
      const r = await fetch('/api/v1/evals/examples', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ datasetId: id, inputs, expected }) });
      if (r.ok) { setInputsJson('{}'); setExpectedJson(''); load(); }
    } catch {
      setInputsErr('Invalid JSON');
    }
  };

  const pvOptions = useMemo(() => {
    return prompts.flatMap((p: any) => (p.versions || []).map((v: any) => ({ value: v.id, label: `${p.name} v${v.version}` })));
  }, [prompts]);

  const onRun = async () => {
    if (!selectedPVIds.length || !selectedModels.length) return;
    setRunning(true);
    setRunId(''); setRun(null);
    const body: any = {
      datasetId: id,
      promptVersionIds: selectedPVIds,
      modelKeys: selectedModels,
    };
    if (judgeType === 'llm') {
      body.judge = { type: 'llm', config: { modelKey: judgeModel, rubric: judgeKey } };
    } else {
      body.judge = { type: 'heuristic', config: judgeType === 'contains' ? { type: 'contains', key: judgeKey } : { type: 'regex', pattern: judgeKey } };
    };
    const r = await fetch('/api/v1/evals/run', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json();
    if (r.ok) {
      setRunId(j.evalRunId);
      const poll = async () => {
        const rr = await fetch(`/api/v1/evals/${j.evalRunId}`);
        const rj = await rr.json();
        if (rr.ok) {
          setRun(rj.run);
          const s = rj.run?.summary || {};
          if (typeof s.total === 'number' && typeof s.completed === 'number') setProgress({ total: s.total, completed: s.completed });
          if (!rj.run?.finishedAt) {
            setTimeout(poll, 1200);
          } else {
            setRunning(false);
          }
        } else {
          setRunning(false);
        }
      };
      poll();
    } else {
      setRunning(false);
    }
  };

  const exportRows = useMemo(() => {
    if (!run?.results) return [];
    return run.results.map((r: any) => ({
      createdAt: r.createdAt,
      model: r.modelKey,
      promptVersionId: r.promptVersionId,
      exampleId: r.exampleId,
      score: r.scores?.score,
      reason: r.scores?.reason,
      latencyMs: r.latencyMs,
      costUsd: r.costUsd,
      output: r.output?.content?.slice(0, 200),
    }));
  }, [run]);

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/evals" className="text-blue-600 hover:underline">← Back</Link>
          <h1 className="text-2xl font-semibold">{dataset?.name || 'Dataset'}</h1>
        </div>
        <Link href="/" className="text-sm text-neutral-600 hover:underline">Home</Link>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card p-5 space-y-3">
          <h2 className="text-lg font-medium">Add Example</h2>
          <div>
            <label className="label">Inputs (JSON)</label>
            <textarea className={`textarea h-28 ${inputsErr?'border-red-500':''}`} value={inputsJson} onChange={e=>setInputsJson(e.target.value)} />
            {inputsErr && <div className="text-xs text-red-600">{inputsErr}</div>}
          </div>
          <div>
            <label className="label">Expected (optional, JSON)</label>
            <textarea className="textarea h-20" value={expectedJson} onChange={e=>setExpectedJson(e.target.value)} />
          </div>
          <button className="btn-primary" onClick={onAddExample}>Add Example</button>
        </div>

        <div className="card p-5 space-y-3">
          <h2 className="text-lg font-medium">Run Eval</h2>
          <div>
            <label className="label">Prompt Versions</label>
            <select multiple className="select h-28" value={selectedPVIds} onChange={e=>setSelectedPVIds(Array.from(e.target.selectedOptions).map(o=>o.value))}>
              {pvOptions.map(o => (<option key={o.value} value={o.value}>{o.label}</option>))}
            </select>
          </div>
          <div>
            <label className="label">Models</label>
            <select multiple className="select h-28" value={selectedModels} onChange={e=>setSelectedModels(Array.from(e.target.selectedOptions).map(o=>o.value))}>
              {models.map((m:any)=>(<option key={m.key} value={m.key}>{m.key}</option>))}
            </select>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="label">Judge</label>
              <select className="select" value={judgeType} onChange={e=>setJudgeType(e.target.value as any)}>
                <option value="contains">Contains</option>
                <option value="regex">Regex</option>
                <option value="llm">LLM (beta)</option>
              </select>
            </div>
            <div>
              <label className="label">{judgeType==='llm' ? 'Rubric' : 'Key / Pattern'}</label>
              <input className="input" value={judgeKey} onChange={e=>setJudgeKey(e.target.value)} placeholder={judgeType==='llm' ? 'Define success criteria' : ''} />
            </div>
          </div>
          {judgeType==='llm' && (
            <div>
              <label className="label">Judge Model</label>
              <select className="select" value={judgeModel} onChange={e=>setJudgeModel(e.target.value)}>
                {models.map((m:any)=>(<option key={m.key} value={m.key}>{m.key}</option>))}
              </select>
            </div>
          )}
          <button className="btn-primary" disabled={!selectedPVIds.length || !selectedModels.length || running} onClick={onRun}>{running? 'Running…':'Run Eval'}</button>
        </div>
      </div>

      <div className="card p-5 mt-6">
        <h2 className="text-lg font-medium mb-2">Examples</h2>
        <div className="text-sm text-neutral-600 mb-2">{examples.length} example(s)</div>
        <div className="space-y-2 max-h-64 overflow-auto">
          {examples.map((ex:any)=>(
            <div key={ex.id} className="border border-neutral-200 dark:border-neutral-800 rounded p-2 text-sm">
              <div className="font-mono text-xs text-neutral-500">{ex.id}</div>
              <div>inputs: <span className="font-mono text-xs">{JSON.stringify(ex.inputs)}</span></div>
              {ex.expected && <div>expected: <span className="font-mono text-xs">{JSON.stringify(ex.expected)}</span></div>}
            </div>
          ))}
          {examples.length===0 && <div className="text-sm text-neutral-600">No examples yet.</div>}
        </div>
      </div>

      {run && (
        <div className="card p-5 mt-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-medium">Results</h2>
            <div className="flex items-center gap-3 text-sm">
              <button className="btn-primary" onClick={()=>{
                const csv = toCSV(exportRows);
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url; a.download = `eval-${run.id}.csv`; a.click(); URL.revokeObjectURL(url);
              }}>Export CSV</button>
              <button className="btn-primary" onClick={()=>{
                const blob = new Blob([JSON.stringify(run, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url; a.download = `eval-${run.id}.json`; a.click(); URL.revokeObjectURL(url);
              }}>Export JSON</button>
            </div>
          </div>
          <div className="text-sm text-neutral-600 mb-3">{exportRows.length} result(s){progress && progress.total ? ` • Progress: ${progress.completed}/${progress.total}` : ''}</div>
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-neutral-200 dark:border-neutral-800">
                  <th className="py-2 pr-3">Example</th>
                  <th className="py-2 pr-3">Model</th>
                  <th className="py-2 pr-3">PV</th>
                  <th className="py-2 pr-3">Score</th>
                  <th className="py-2 pr-3">Latency</th>
                  <th className="py-2 pr-3">Cost</th>
                </tr>
              </thead>
              <tbody>
                {run.results.map((r:any)=>(
                  <tr key={r.id} className="border-b border-neutral-100/70 dark:border-neutral-800/60">
                    <td className="py-2 pr-3 font-mono text-xs text-neutral-600">{r.exampleId.slice(0,8)}</td>
                    <td className="py-2 pr-3">{r.modelKey}</td>
                    <td className="py-2 pr-3 font-mono text-xs">{r.promptVersionId.slice(0,8)}</td>
                    <td className="py-2 pr-3">{r.scores?.score}</td>
                    <td className="py-2 pr-3">{r.latencyMs ?? '-' } ms</td>
                    <td className="py-2 pr-3">{r.costUsd ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

