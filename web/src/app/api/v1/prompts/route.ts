import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET() {
  const prompts = await prisma.prompt.findMany({
    orderBy: { createdAt: 'desc' },
    include: { versions: { orderBy: { version: 'desc' }, take: 1 } },
  });
  return NextResponse.json({ prompts });
}

export async function POST(req: Request) {
  const body = await req.json();
  if (!body?.name) return NextResponse.json({ error: 'name required' }, { status: 400 });
  const prompt = await prisma.prompt.create({ data: { name: body.name, description: body.description || null } });
  return NextResponse.json({ prompt });
}
