## Prompt Manager — Project Plan

### Objectives
- **Model Proxy**: Unified interface to OpenAI, Anthropic, and Google models (chat, completions, embeddings, streaming, tool calling) with pluggable providers and pricing-aware cost tracking.
- **Eval System**: Run prompt/model experiments at scale, measure quality, latency, and cost. Support offline datasets, online A/B, and LLM-as-judge.
- **Prompt Manager**: Manage prompts, variables, versions, and environments. Test prompts against models, compare outputs, and persist runs.
- **Tool Calling**: Provider-agnostic tool schema with adapters to vendor-specific formats. Safe execution sandbox and audit logs.

### Scope
- Single repo with a straightforward TypeScript stack for velocity. Start local-first; support easy cloud deploy later.
- Minimize vendor lock-in via adapter-based model proxy and portable tool schema.

### Non-Goals (initially)
- Fine-tuned model hosting
- Realtime audio/video
- Multi-tenant SaaS billing

---

### Architecture Overview
- **Language**: TypeScript (Node.js 20+)
- **App Type**: Single Next.js (React) app (frontend + API routes) for simplicity
- **Database**: SQLite for local dev, Postgres in prod via Prisma ORM
- **Queue/Jobs**: Lightweight in-process workers at first; upgradeable to a job queue (e.g., BullMQ) if needed
- **Observability**: Basic structured logging + request tracing; optional Langfuse integration
- **Auth**: Local auth for now (if needed for UI); environment-scoped prompts/evals without multi-tenancy
- **Hosting & CI/CD**: GitHub repository + Vercel deployments (Preview on PRs, Production on `main`)

Planned top-level structure (will be created iteratively):
- `app/` — Next.js routes and UI
- `app/api/` — Route handlers for model proxy, evals, prompts, tools
- `lib/` — Business logic modules (model proxy, tool adapters, eval runner, cost calc)
- `lib/providers/` — Provider SDK adapters (OpenAI, Anthropic, Google)
- `lib/tools/` — Tool registry + sandboxed tool runners
- `lib/eval/` — Evaluator, judges, dataset runners, result aggregators
- `lib/prompt/` — Prompt templating, variable interpolation, versioning helpers
- `lib/costs/` — Vendor pricing tables and cost calculators
- `prisma/` — Prisma schema and migrations
- `scripts/` — CLI entry points for headless usage (e.g., run evals in CI)
- `docs/` — Documentation (this plan + instruction files live at repo root for now)

---

### Milestones and Deliverables

#### M0 — Repo bootstrap
- Initialize Next.js (TypeScript/React), set up Prisma with SQLite, env config, lint/format/test basics
- Create GitHub repo and import into Vercel
- Deliverables:
  - Running dev server
  - `prisma/schema.prisma` with initial models (Prompt, PromptVersion, Run, EvalDataset, EvalRun)
  - Baseline docs updated (`AI_Instructions.md`, `AI_System_Prompt.md`, this `PROJECT_PLAN.md`)
  - Vercel project created and linked; Preview deployments enabled
  - Implement basic health and DB check API routes

#### M1 — Model Proxy (providers + unified API)
- Implement provider-agnostic interfaces for chat/completions/streaming/tool-calls
- Add providers: OpenAI, Anthropic, Google (Gemini)
- Pricing tables + cost calculation per request/response (tokens/chars) with vendor-specific rules
- API routes:
  - `POST /api/v1/chat` (unified request)
  - `POST /api/v1/embeddings` (optional in M1)
  - `GET  /api/v1/models` (available models and capabilities)
- Deliverables:
  - `lib/providers/*` with adapters and tests
  - `lib/costs/pricing.ts` and calculator functions
  - Streaming support via Server-Sent Events

#### M2 — Prompt Manager (backend)
- Prompt and versioning models with variables and environments (dev, prod)
- CRUD API:
  - `GET/POST /api/v1/prompts`
  - `GET/PATCH /api/v1/prompts/:id`
  - `POST /api/v1/prompts/:id/versions`
- Run persistence: store model, prompt version, inputs, outputs, costs, latency
- Deliverables:
  - Prisma models and migrations
  - Library functions in `lib/prompt/*`
  - Basic unit tests

#### M3 — Prompt Manager (UI)
- Pages to create/edit prompts, manage versions and variables
- Prompt test bench: select model(s), provide variables, run, view streaming output, see cost/latency
- Comparison view across models/versions
- Deliverables:
  - `app/(prompts)/*` routes
  - Reusable components for test bench and comparisons

#### M4 — Tool Calling
- Provider-agnostic tool schema (OpenAI function-spec compatible) with adapters:
  - OpenAI: functions/tools
  - Anthropic: tools
  - Google: function calling
- Safe execution layer:
  - Tool registry with explicit allowlist
  - Sandboxed execution and timeouts
  - Audit logging of tool calls and arguments
- UI to define tools (JSONSchema) and test them in the Prompt test bench
- Deliverables:
  - `lib/tools/registry.ts`, `lib/tools/runner.ts`, provider adapters
  - Example tools: calculator, web-search (stub), time

#### M5 — Eval System
- Datasets and examples with labels/expected behaviors
- Experiment runner producing a matrix of (prompt version × model) with repeated trials
- Judges:
  - Heuristic (regex, JSON validity, score extractors)
  - LLM-as-judge with rubric
- Metrics and storage: quality scores, latency, cost, pass/fail
- API + UI:
  - `POST /api/v1/evals/run`
  - `GET /api/v1/evals/:id`
  - UI pages for datasets, runs, and comparisons
- Deliverables:
  - `lib/eval/runner.ts`, `lib/eval/judges/*`, `lib/eval/report.ts`
  - Visualization components for results

#### M6 — CLI / Headless SDK
- CLI to run single prompts and full evals from terminal/CI
- Node SDK to invoke the model proxy and prompt manager programmatically
- Deliverables:
- `scripts/pm` (CLI), `lib/sdk/*`

#### M7 — Observability, Config, Deploy
- Request tracing, structured logs, error boundaries
- Optional Langfuse integration
- Env configuration and secrets management
- Vercel configuration and deployment guide (GitHub → Vercel). Optional Dockerfile for non-Vercel targets

---

### Data Model (initial, to be refined during M2/M5)
- Prompt(id, name, description, createdAt, updatedAt)
- PromptVersion(id, promptId, version, template, variables, metadata, createdAt)
- Run(id, promptVersionId, modelKey, inputVars, output, toolCalls, cost, latencyMs, createdAt)
- EvalDataset(id, name, description)
- EvalExample(id, datasetId, inputs, expected, metadata)
- EvalRun(id, datasetId, matrixConfig, judgeConfig, startedAt, finishedAt, summary)
- EvalResult(id, evalRunId, exampleId, promptVersionId, modelKey, output, scores, cost, latencyMs)

---

### Unified API Shapes (high-level)
- ChatRequest: { model, messages, tools?, toolChoice?, stream?, system?, temperature?, maxTokens? }
- ChatResponse: { id, model, choices|stream, usage: { inputTokens, outputTokens, costUsd }, toolCalls? }
- Tool: { name, description, parameters: JSONSchema }
- EvalRunRequest: { datasetId, promptVersionIds, modelKeys, judge, repeats }

---

### Risks & Mitigations
- Provider feature drift: keep adapters thin and well-tested; version provider SDKs
- Pricing changes: centralize pricing tables, add tests, document updates
- Tool execution safety: strict allowlist + sandbox + timeouts + audit logs
- Eval cost: enable dry-runs, sampling, and budget caps

---

### Immediate Next Steps (Iteration 1)
1) Scaffold Next.js (React) + Prisma + SQLite
2) Add `.env` with API keys placeholders and config loader
3) Implement minimal `lib/providers/openai.ts` and `/api/v1/chat` passthrough for OpenAI only
4) Wire streaming back to UI
5) Update `AI_Instructions.md` and this plan with actual files created

---

### Deployment Plan (GitHub + Vercel)
1) Create GitHub repo and push code
2) In Vercel, "Import Project" from GitHub; Framework: Next.js, Node.js 20
3) Environment Variables (Preview & Production):
   - `OPENAI_API_KEY`
   - `ANTHROPIC_API_KEY`
   - `GOOGLE_API_KEY`
   - `DATABASE_URL` (e.g., file:./dev.db for SQLite; Postgres URL in prod)
   - Optional: `LANGFUSE_*` if used
4) Build settings:
   - Install: `pnpm install` (or `npm ci`)
   - Build: `pnpm prisma generate && pnpm prisma migrate deploy && pnpm build`
   - Output: Next.js default
5) Branching:
   - PRs → Preview deployments
   - `main` → Production
6) Migrations:
   - Use `prisma migrate deploy` in Vercel build step for Postgres
   - For SQLite, avoid write during serverless runtime; prefer Postgres for production

Note: If you prefer Svelte, an alternative is SvelteKit with a similar API structure and Vercel adapter. Current plan proceeds with Next.js by default for Vercel alignment.

---

### Done Criteria for v0
- Single app runs locally; you can create a prompt, test it against at least OpenAI/Anthropic/Google, invoke a sample tool, log run metrics, and run a small eval


