import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { renderTemplate } from '@/lib/prompt/templating';
import { chat } from '@/lib/providers';
import { ChatMessage, ChatRequest } from '@/lib/types/model';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { promptVersionId, modelKey, inputVars } = body || {};
    if (!promptVersionId || !modelKey) return NextResponse.json({ error: 'promptVersionId and modelKey required' }, { status: 400 });

    const pv = await prisma.promptVersion.findUnique({ where: { id: promptVersionId }, include: { prompt: true } });
    if (!pv) return NextResponse.json({ error: 'prompt version not found' }, { status: 404 });

    const userContent = renderTemplate(pv.template, inputVars || {});

    const reqBody: ChatRequest = {
      model: modelKey,
      messages: [{ role: 'user', content: userContent } as ChatMessage],
      maxTokens: 512,
    };

    const started = Date.now();
    const result = await chat(reqBody);
    const latencyMs = Date.now() - started;

    const run = await prisma.run.create({
      data: {
        promptVersionId: pv.id,
        modelKey,
        inputVars: inputVars || {},
        output: { content: result.content, toolCalls: result.toolCalls },
        usage: result.usage || {},
        costUsd: result.usage?.costUsd || null,
        latencyMs,
      },
    });

    return NextResponse.json({ runId: run.id, result });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}
