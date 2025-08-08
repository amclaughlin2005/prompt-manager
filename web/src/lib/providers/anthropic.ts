import Anthropic from '@anthropic-ai/sdk';
import { ChatRequest, ChatResponse, ChatUsage } from '@/lib/types/model';
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

  const usage: ChatUsage = {
    inputTokens: result.usage?.input_tokens,
    outputTokens: result.usage?.output_tokens,
  };
  usage.costUsd = estimateCostUsd(modelKey, usage.inputTokens, usage.outputTokens);

  return { id: result.id, model: modelKey, content: contentText, toolCalls, usage };
}
