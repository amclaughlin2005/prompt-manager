import OpenAI from 'openai';
import { ChatRequest, ChatResponse, ChatUsage } from '@/lib/types/model';
import { runTool } from '@/lib/tools/registry';
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
  let content = choice.message.content ?? '';

  // Naive auto-execute single round
  if (req.autoExecuteTools && toolCalls?.length) {
    const toolResults: any[] = [];
    const log: Array<{ name: string; args?: any; ok: boolean; durationMs: number; error?: string }> = [];
    for (const call of toolCalls.slice(0, 3)) {
      try {
        const started = Date.now();
        const result = await runTool(call.name, call.arguments);
        log.push({ name: call.name, args: call.arguments, ok: true, durationMs: Date.now() - started });
        toolResults.push({ name: call.name, result });
        // follow-up call with tool result to let model finalize
        const follow = await getClient().chat.completions.create({
          model,
          messages: [
            ...(system ? [{ role: 'system' as const, content: system }] : []),
            ...(messages as any[]),
            // Note: we cannot reference tool_call_id here with this simplified flow,
            // so if the model does not use this context, we will fall back to showing tool results.
            { role: 'tool' as const, content: JSON.stringify(result), name: call.name },
          ],
          temperature: req.temperature,
          max_tokens: req.maxTokens,
        });
        content = follow.choices[0].message.content ?? content;
      } catch (e: any) {
        log.push({ name: call.name, args: call.arguments, ok: false, durationMs: 0, error: e?.message });
        // ignore tool execution errors for now
      }
    }
    if ((!content || content.trim().length === 0) && toolResults.length > 0) {
      content = `Tool results: ${JSON.stringify(toolResults)}`;
    }
    const usageAuto: ChatUsage = {
      inputTokens: completion.usage?.prompt_tokens,
      outputTokens: completion.usage?.completion_tokens,
    };
    usageAuto.costUsd = estimateCostUsd(modelKey, usageAuto.inputTokens, usageAuto.outputTokens);
    return {
      id: completion.id,
      model: modelKey,
      content,
      toolCalls,
      usage: usageAuto,
      toolRunLog: log,
    };
  }

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
