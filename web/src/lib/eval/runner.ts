import prisma from '@/lib/db';
import { chat } from '@/lib/providers';
import { ChatMessage, ChatRequest } from '@/lib/types/model';
import { judgeHeuristic, HeuristicJudgeConfig } from './judge';

export type EvalMatrixInput = {
  datasetId: string;
  promptVersionIds: string[];
  modelKeys: string[];
  repeats?: number;
  judge: { type: 'heuristic'; config: HeuristicJudgeConfig } | { type: 'llm'; config: { modelKey: string; rubric: string } };
};

export async function runEvalMatrix(input: EvalMatrixInput) {
  const dataset = await prisma.evalDataset.findUnique({ where: { id: input.datasetId }, include: { examples: true } });
  if (!dataset) throw new Error('dataset not found');

  const startedAt = new Date();
  const total = dataset.examples.length * input.promptVersionIds.length * input.modelKeys.length;
  const run = await prisma.evalRun.create({ data: { datasetId: dataset.id, matrixConfig: input as any, judgeConfig: input.judge as any, startedAt, summary: { total, completed: 0 } as any } });

  for (const example of dataset.examples) {
    for (const pvId of input.promptVersionIds) {
      const pv = await prisma.promptVersion.findUnique({ where: { id: pvId }, include: { prompt: true } });
      if (!pv) continue;
      for (const modelKey of input.modelKeys) {
        const userContent = pv.template.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_: any, k: string) => String((example.inputs as any)?.[k] ?? ''));
        const req: ChatRequest = { model: modelKey, messages: [{ role: 'user', content: userContent } as ChatMessage], maxTokens: 512 };
        const t0 = Date.now();
        const result = await chat(req);
        const latencyMs = Date.now() - t0;
        const output = result.content || '';
        let score = 0; let reason = '';
        if (input.judge.type === 'heuristic') {
          const j = judgeHeuristic(output, (input.judge.config as any));
          score = j.score; reason = j.reason || '';
        } else {
          // Minimal LLM-as-judge: ask for a 0/1 score per rubric
          const judgePrompt = `You are a strict evaluator. Rubric: ${input.judge.config.rubric}. Given the model output, respond with only a single number 0 or 1 indicating failure(0) or success(1). Output to judge:\n\n${output}`;
          const judgeRes = await chat({ model: input.judge.config.modelKey, messages: [{ role: 'user', content: judgePrompt } as any], maxTokens: 10 });
          const text = judgeRes.content.trim();
          const parsed = /1/.test(text) ? 1 : 0;
          score = parsed; reason = 'llm-judge';
        }
        await prisma.evalResult.create({
          data: {
            evalRunId: run.id,
            exampleId: example.id,
            promptVersionId: pv.id,
            modelKey,
            output: { content: output, toolCalls: result.toolCalls },
            scores: { score, reason },
            costUsd: result.usage?.costUsd ?? null,
            latencyMs,
          },
        });
        // progress update
        const current = await prisma.evalResult.count({ where: { evalRunId: run.id } });
        await prisma.evalRun.update({ where: { id: run.id }, data: { summary: { total, completed: current } as any } });
      }
    }
  }

  const finishedAt = new Date();
  const summary = { examples: dataset.examples.length, models: input.modelKeys.length, promptVersions: input.promptVersionIds.length, total, completed: total };
  await prisma.evalRun.update({ where: { id: run.id }, data: { finishedAt, summary: summary as any } });
  return { evalRunId: run.id };
}
