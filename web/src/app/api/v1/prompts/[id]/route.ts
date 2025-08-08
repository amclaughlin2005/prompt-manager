import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(_: Request, { params }: any) {
  const prompt = await prisma.prompt.findUnique({ where: { id: params.id }, include: { versions: { orderBy: { version: 'desc' } } } });
  if (!prompt) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({ prompt });
}

export async function PATCH(req: Request, { params }: any) {
  const body = await req.json();
  const prompt = await prisma.prompt.update({ where: { id: params.id }, data: { name: body.name, description: body.description } });
  return NextResponse.json({ prompt });
}
