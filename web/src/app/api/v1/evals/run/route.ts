import { NextResponse } from 'next/server';
import { runEvalMatrix } from '@/lib/eval/runner';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const res = await runEvalMatrix(body);
    return NextResponse.json(res);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}
