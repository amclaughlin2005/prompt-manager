export type Price = { inputPer1K: number; outputPer1K: number };

export const MODEL_PRICING: Record<string, Price> = {
  // keys are normalized provider:model IDs
  'openai:gpt-4o-mini': { inputPer1K: 0.15, outputPer1K: 0.6 },
  'openai:gpt-4o': { inputPer1K: 5, outputPer1K: 15 },
  'anthropic:claude-3-5-sonnet': { inputPer1K: 3, outputPer1K: 15 },
  'google:gemini-1.5-pro': { inputPer1K: 3.5, outputPer1K: 10.5 },
};

export function estimateCostUsd(modelKey: string, inputTokens = 0, outputTokens = 0): number | undefined {
  const price = MODEL_PRICING[modelKey];
  if (!price) return undefined;
  const cost = (inputTokens / 1000) * price.inputPer1K + (outputTokens / 1000) * price.outputPer1K;
  return Math.round(cost * 1e6) / 1e6;
}
