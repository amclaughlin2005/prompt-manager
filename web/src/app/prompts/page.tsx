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
    <div className="max-w-4xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-semibold mb-6">Prompts</h1>

      <div className="border rounded p-4 mb-8 space-y-3">
        <h2 className="text-lg font-medium">Create Prompt</h2>
        <input className="w-full border rounded px-3 py-2" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="w-full border rounded px-3 py-2" placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
        <button className="bg-black text-white rounded px-4 py-2" disabled={loading || !name} onClick={onCreate}>{loading ? 'Creating…' : 'Create'}</button>
        {error && <div className="text-red-600 text-sm">{error}</div>}
      </div>

      <div className="space-y-2">
        {prompts.map((p) => (
          <div key={p.id} className="border rounded p-3 flex items-center justify-between">
            <div>
              <div className="font-medium">{p.name}</div>
              {p.description && <div className="text-sm text-neutral-600">{p.description}</div>}
            </div>
            <Link className="text-blue-600 underline" href={`/prompts/${p.id}`}>Open →</Link>
          </div>
        ))}
        {prompts.length === 0 && <div className="text-neutral-500 text-sm">No prompts yet.</div>}
      </div>
    </div>
  );
}
