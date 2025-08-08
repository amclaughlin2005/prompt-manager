import { ToolSpec } from '@/lib/types/model';

export type ToolHandler = (args: any) => Promise<any> | any;

type RegisteredTool = { spec: ToolSpec; handler: ToolHandler };

const registry = new Map<string, RegisteredTool>();

function register(spec: ToolSpec, handler: ToolHandler) {
  registry.set(spec.name, { spec, handler });
}

export function getToolSpecs(): ToolSpec[] {
  return Array.from(registry.values()).map(r => r.spec);
}

export async function runTool(name: string, args: any, timeoutMs = 4000): Promise<any> {
  const entry = registry.get(name);
  if (!entry) throw new Error(`Tool not found: ${name}`);

  const result = entry.handler(args);
  const asPromise = result instanceof Promise ? result : Promise.resolve(result);
  const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('Tool timeout')), timeoutMs));
  return Promise.race([asPromise, timeout]);
}

// Default tools
register(
  {
    name: 'calculator',
    description: 'Evaluate simple arithmetic expressions like 2 + 2 * 5',
    parameters: { type: 'object', properties: { expression: { type: 'string' } }, required: ['expression'] },
  },
  ({ expression }) => {
    // Very basic and safe-ish evaluator for + - * / () digits and dots
    const safe = String(expression).replace(/[^0-9+\-*/().\s]/g, '');
    // eslint-disable-next-line no-new-func
    const fn = new Function(`return (${safe})`);
    const value = fn();
    return { value };
  }
);

register(
  {
    name: 'now',
    description: 'Get current ISO timestamp',
    parameters: { type: 'object', properties: {} },
  },
  () => ({ now: new Date().toISOString() })
);

register(
  {
    name: 'echo',
    description: 'Echo provided payload',
    parameters: { type: 'object', properties: { payload: {} }, required: ['payload'] },
  },
  ({ payload }) => ({ payload })
);
