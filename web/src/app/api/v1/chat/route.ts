import { NextResponse } from 'next/server';
import { chat } from '@/lib/providers';
import { ChatRequest } from '@/lib/types/model';

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ChatRequest;
    if (!body?.model || !body?.messages) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    const result = await chat(body);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}
