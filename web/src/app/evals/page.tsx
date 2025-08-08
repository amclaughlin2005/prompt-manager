'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function EvalsPage() {
  const [datasets, setDatasets] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const load = async () => {
    const r = await fetch('/api/v1/evals/datasets');
    const j = await r.json();
    setDatasets(j.datasets || []);
  };

  useEffect(() => { load(); }, []);

  const onCreate = async () => {
    const r = await fetch('/api/v1/evals/datasets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, description }) });
    if (r.ok) { setName(''); setDescription(''); load(); }
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Evals</h1>
        <Link href="/" className="text-sm text-neutral-600 hover:underline">Home</Link>
      </div>

      <div className="card p-5 mb-6 space-y-3">
        <h2 className="text-lg font-medium">Create Dataset</h2>
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="label">Name</label>
            <input className="input" value={name} onChange={e=>setName(e.target.value)} placeholder="Dataset name" />
          </div>
          <div>
            <label className="label">Description</label>
            <input className="input" value={description} onChange={e=>setDescription(e.target.value)} placeholder="Optional" />
          </div>
        </div>
        <button className="btn-primary" disabled={!name} onClick={onCreate}>Create</button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {datasets.map(ds => (
          <div key={ds.id} className="card p-4 flex items-center justify-between">
            <div>
              <div className="font-medium">{ds.name}</div>
              {ds.description && <div className="text-sm text-neutral-600">{ds.description}</div>}
            </div>
            <Link className="text-blue-600 hover:underline" href={`/evals/${ds.id}`}>Open →</Link>
          </div>
        ))}
        {datasets.length === 0 && <div className="text-sm text-neutral-600">No datasets yet.</div>}
      </div>
    </div>
  );
}
