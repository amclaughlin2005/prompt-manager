import { GoogleGenerativeAI } from '@google/generative-ai';
import { ChatRequest, ChatResponse, ChatUsage } from '@/lib/types/model';
// Google tool integration is not enabled yet
import { estimateCostUsd } from '@/lib/costs/pricing';

function getClient(): GoogleGenerativeAI {
  const key = process.env.GOOGLE_API_KEY;
  if (!key) throw new Error('GOOGLE_API_KEY is not set');
  return new GoogleGenerativeAI(key);
}

export async function chatGoogle(req: ChatRequest): Promise<ChatResponse> {
  const modelKey = req.model.startsWith('google:') ? req.model : `google:${req.model}`;
  const model = modelKey.split(':')[1];
  const genModel = getClient().getGenerativeModel({ model });

  const system = req.messages.find(m => m.role === 'system')?.content;
  const text = req.messages.filter(m => m.role !== 'system').map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n');
  const prompt = system ? `${system}\n\n${text}` : text;

  const result = await genModel.generateContent({ contents: [{ role: 'user', parts: [{ text: prompt }] }] });
  const response = await result.response;
  const content = response.text() || '';

  const usage: ChatUsage = { inputTokens: undefined, outputTokens: undefined };
  usage.costUsd = estimateCostUsd(modelKey, 0, 0);

  return { id: Math.random().toString(36).slice(2), model: modelKey, content, usage };
}
