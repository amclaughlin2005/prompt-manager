import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(_: Request, { params }: any) {
  const ds = await prisma.evalDataset.findUnique({ where: { id: params.id }, include: { examples: true } });
  if (!ds) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({ dataset: ds });
}

export async function DELETE(_: Request, { params }: any) {
  await prisma.evalDataset.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
