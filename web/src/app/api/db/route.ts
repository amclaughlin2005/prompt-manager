import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET() {
  const promptCount = await prisma.prompt.count();
  return NextResponse.json({ ok: true, promptCount });
}
