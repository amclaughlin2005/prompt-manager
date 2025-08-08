'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type Prompt = { id: string; name: string; description?: string | null; versions?: any[] };

export default function PromptsPage() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    const r = await fetch('/api/v1/prompts');
    const j = await r.json();
    setPrompts(j.prompts || []);
  };

  useEffect(() => { load(); }, []);

  const onCreate = async () => {
    setLoading(true);
    setError('');
    try {
      const r = await fetch('/api/v1/prompts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, description }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Failed to create');
      setName('');
      setDescription('');
      await load();
    } catch (e: any) {
      setError(e?.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Prompts</h1>
        <div className="flex items-center gap-4 text-sm text-neutral-600">
          <Link href="/" className="hover:underline">Home</Link>
          <Link href="/bench" className="hover:underline">Bench →</Link>
        </div>
      </div>

      <div className="card p-5 mb-8 space-y-4">
        <h2 className="text-lg font-medium">Create Prompt</h2>
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="label">Name</label>
            <input className="input" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="label">Description</label>
            <input className="input" placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </div>
        <button className="btn-primary" disabled={loading || !name} onClick={onCreate}>{loading ? 'Creating…' : 'Create'}</button>
        {error && <div className="text-red-600 text-sm">{error}</div>}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {prompts.map((p) => (
          <div key={p.id} className="card p-4 flex items-center justify-between">
            <div>
              <div className="font-medium">{p.name}</div>
              {p.description && <div className="text-sm text-neutral-600">{p.description}</div>}
            </div>
            <Link className="text-blue-600 hover:underline" href={`/prompts/${p.id}`}>Open →</Link>
          </div>
        ))}
        {prompts.length === 0 && <div className="text-neutral-500 text-sm">No prompts yet.</div>}
      </div>
    </div>
  );
}
