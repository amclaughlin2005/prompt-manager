export type ToolSpec = {
  name: string;
  description?: string;
  // JSON Schema
  parameters?: Record<string, any>;
};

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string; // tool name for role 'tool'
};

export type ChatRequest = {
  model: string; // e.g., openai:gpt-4o-mini, anthropic:claude-3-5-sonnet, google:gemini-1.5-pro
  messages: ChatMessage[];
  tools?: ToolSpec[];
  toolChoice?: 'auto' | 'none' | { type: 'function'; function: { name: string } };
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  autoExecuteTools?: boolean;
};

export type ChatUsage = {
  inputTokens?: number;
  outputTokens?: number;
  costUsd?: number;
};

export type ChatResponse = {
  id: string;
  model: string;
  content: string;
  toolCalls?: { name: string; arguments: any }[];
  usage?: ChatUsage;
  toolRunLog?: Array<{ name: string; args?: any; ok: boolean; durationMs: number; error?: string }>;
};
