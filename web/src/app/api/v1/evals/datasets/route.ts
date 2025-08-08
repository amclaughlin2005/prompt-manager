import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET() {
  const datasets = await prisma.evalDataset.findMany({ orderBy: { createdAt: 'desc' } });
  return NextResponse.json({ datasets });
}

export async function POST(req: Request) {
  const body = await req.json();
  if (!body?.name) return NextResponse.json({ error: 'name required' }, { status: 400 });
  const ds = await prisma.evalDataset.create({ data: { name: body.name, description: body.description || null } });
  return NextResponse.json({ dataset: ds });
}
