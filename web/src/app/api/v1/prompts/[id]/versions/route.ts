import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { extractVariables } from '@/lib/prompt/templating';

export async function POST(req: Request, { params }: any) {
  const body = await req.json();
  const template: string = body?.template;
  if (!template) return NextResponse.json({ error: 'template required' }, { status: 400 });
  const prompt = await prisma.prompt.findUnique({ where: { id: params.id }, include: { versions: true } });
  if (!prompt) return NextResponse.json({ error: 'prompt not found' }, { status: 404 });
  const nextVersion = (prompt.versions?.reduce((m, v) => Math.max(m, v.version), 0) || 0) + 1;
  const variables = body?.variables ?? extractVariables(template).reduce((acc: any, v: string) => { acc[v] = ''; return acc; }, {});
  const created = await prisma.promptVersion.create({
    data: {
      promptId: params.id,
      version: nextVersion,
      template,
      variables,
      metadata: body?.metadata || null,
    },
  });
  return NextResponse.json({ version: created });
}
