import OpenAI from 'openai';
import { ChatRequest, ChatResponse, ChatUsage } from '@/lib/types/model';
import { estimateCostUsd } from '@/lib/costs/pricing';

function getClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set');
  }
  return new OpenAI({ apiKey });
}

export async function chatOpenAI(req: ChatRequest): Promise<ChatResponse> {
  const modelKey = req.model.startsWith('openai:') ? req.model : `openai:${req.model}`;
  const model = modelKey.split(':')[1];
  const system = req.messages.find(m => m.role === 'system')?.content;
  const messages = req.messages
    .filter(m => m.role !== 'system')
    .map(m => ({ role: m.role as any, content: m.content }));

  const tools = req.tools?.map(t => ({
    type: 'function' as const,
    function: { name: t.name, description: t.description, parameters: t.parameters || { type: 'object', properties: {} } },
  }));

  const tool_choice = req.toolChoice === 'none' ? 'none' : req.toolChoice === 'auto' || !req.toolChoice ? 'auto' : { type: 'function', function: { name: (req.toolChoice as any).function.name } };

  const completion = await getClient().chat.completions.create({
    model,
    messages: [
      ...(system ? [{ role: 'system' as const, content: system }] : []),
      ...(messages as any[]),
    ],
    temperature: req.temperature,
    max_tokens: req.maxTokens,
    tools: tools as any,
    tool_choice: tools ? (tool_choice as any) : undefined,
  });

  const choice = completion.choices[0];
  const toolCalls = choice.message.tool_calls?.map((tc: any) => ({ name: tc.function?.name, arguments: safeJson(tc.function?.arguments) })) || undefined;
  const content = choice.message.content ?? '';

  const usage: ChatUsage = {
    inputTokens: completion.usage?.prompt_tokens,
    outputTokens: completion.usage?.completion_tokens,
  };
  usage.costUsd = estimateCostUsd(modelKey, usage.inputTokens, usage.outputTokens);

  return {
    id: completion.id,
    model: modelKey,
    content,
    toolCalls,
    usage,
  };
}

function safeJson(s: string | null | undefined) {
  if (!s) return undefined;
  try { return JSON.parse(s); } catch { return s; }
}
