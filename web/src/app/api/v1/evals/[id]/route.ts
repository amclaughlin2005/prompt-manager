import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(_: Request, { params }: any) {
  const run = await prisma.evalRun.findUnique({ where: { id: params.id }, include: { results: true } });
  if (!run) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({ run });
}
