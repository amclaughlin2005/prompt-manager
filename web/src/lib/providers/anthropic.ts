import Anthropic from '@anthropic-ai/sdk';
import { ChatRequest, ChatResponse, ChatUsage } from '@/lib/types/model';
import { runTool } from '@/lib/tools/registry';
import { estimateCostUsd } from '@/lib/costs/pricing';

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set');
  return new Anthropic({ apiKey });
}

export async function chatAnthropic(req: ChatRequest): Promise<ChatResponse> {
  const modelKey = req.model.startsWith('anthropic:') ? req.model : `anthropic:${req.model}`;
  const model = modelKey.split(':')[1];
  const system = req.messages.find(m => m.role === 'system')?.content;
  const messages = req.messages.filter(m => m.role !== 'system');

  const tools = req.tools?.map(t => ({
    name: t.name,
    description: t.description || '',
    input_schema: (t.parameters as any) || { type: 'object', properties: {} },
  }));

  const result = await getClient().messages.create({
    model,
    system: system,
    messages: messages.map(m => ({ role: m.role as any, content: m.content })),
    tools,
    temperature: req.temperature,
    max_tokens: req.maxTokens || 1024,
  });

  const contentText = result.content?.map(p => (p.type === 'text' ? (p as any).text : '')).join('') || '';
  const toolCalls = result.content?.filter(p => p.type === 'tool_use').map((p: any) => ({ name: p.name, arguments: p.input })) || undefined;

  if (req.autoExecuteTools && toolCalls?.length) {
    const log: Array<{ name: string; args?: any; ok: boolean; durationMs: number; error?: string }> = [];
    for (const call of toolCalls.slice(0, 3)) {
      try {
        const started = Date.now();
        const toolResult = await runTool(call.name, call.arguments);
        log.push({ name: call.name, args: call.arguments, ok: true, durationMs: Date.now() - started });
        const follow = await getClient().messages.create({
          model,
          system,
          messages: [
            ...(messages.map(m => ({ role: m.role as any, content: m.content }))),
            { role: 'tool', content: JSON.stringify(toolResult) } as any,
          ],
          temperature: req.temperature,
          max_tokens: req.maxTokens || 1024,
        });
        const txt = follow.content?.map(p => (p.type === 'text' ? (p as any).text : '')).join('') || '';
        // overwrite content with the follow-up result
        return { id: follow.id, model: modelKey, content: txt, usage: { inputTokens: undefined, outputTokens: undefined, costUsd: undefined }, toolRunLog: log };
      } catch (e: any) {
        log.push({ name: call.name, args: call.arguments, ok: false, durationMs: 0, error: e?.message });
      }
    }
  }
  const usage: ChatUsage = {
    inputTokens: result.usage?.input_tokens,
    outputTokens: result.usage?.output_tokens,
  };
  usage.costUsd = estimateCostUsd(modelKey, usage.inputTokens, usage.outputTokens);

  return { id: result.id, model: modelKey, content: contentText, toolCalls, usage };
}
