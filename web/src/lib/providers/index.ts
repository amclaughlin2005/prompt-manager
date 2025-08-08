import { ChatRequest, ChatResponse } from '@/lib/types/model';
import { chatOpenAI } from './openai';
import { chatAnthropic } from './anthropic';
import { chatGoogle } from './google';

export async function chat(req: ChatRequest): Promise<ChatResponse> {
  if (req.model.startsWith('openai:')) return chatOpenAI(req);
  if (req.model.startsWith('anthropic:')) return chatAnthropic(req);
  if (req.model.startsWith('google:')) return chatGoogle(req);
  throw new Error(`Unknown provider for model: ${req.model}`);
}

export function listModels() {
  return [
    { key: 'openai:gpt-4o-mini', provider: 'openai', tools: true },
    { key: 'openai:gpt-4o', provider: 'openai', tools: true },
    { key: 'anthropic:claude-3-5-sonnet', provider: 'anthropic', tools: true },
    { key: 'google:gemini-1.5-pro', provider: 'google', tools: true },
  ];
}
