import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST(req: Request) {
  const body = await req.json();
  const { datasetId, inputs, expected, metadata } = body || {};
  if (!datasetId || !inputs) return NextResponse.json({ error: 'datasetId and inputs required' }, { status: 400 });
  const ex = await prisma.evalExample.create({ data: { datasetId, inputs, expected: expected || null, metadata: metadata || null } });
  return NextResponse.json({ example: ex });
}
