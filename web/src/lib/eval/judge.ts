export type HeuristicJudgeConfig = { type: 'contains'; key: string } | { type: 'regex'; pattern: string };

export function judgeHeuristic(output: string, cfg: HeuristicJudgeConfig): { score: number; reason?: string } {
  if (cfg.type === 'contains') {
    const ok = output.toLowerCase().includes(cfg.key.toLowerCase());
    return { score: ok ? 1 : 0, reason: ok ? 'contains' : 'missing' };
  }
  if (cfg.type === 'regex') {
    try {
      const re = new RegExp(cfg.pattern, 'i');
      const ok = re.test(output);
      return { score: ok ? 1 : 0, reason: ok ? 'match' : 'no-match' };
    } catch {
      return { score: 0, reason: 'invalid-regex' };
    }
  }
  return { score: 0 };
}
