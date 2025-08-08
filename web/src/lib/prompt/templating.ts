export function extractVariables(template: string): string[] {
  const re = /\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g;
  const vars = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(template))) vars.add(m[1]);
  return Array.from(vars);
}

export function renderTemplate(template: string, variables: Record<string, any>): string {
  const required = extractVariables(template);
  const missing = required.filter((v) => variables[v] === undefined || variables[v] === null);
  if (missing.length > 0) {
    throw new Error(`Missing variables: ${missing.join(', ')}`);
  }
  return template.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_, key) => String(variables[key]));
}
