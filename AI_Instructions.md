## AI Instructions — Prompt Manager (Living Doc)

This is the authoritative, living documentation for the repository. Update this file with every non-trivial code or docs change. Keep sections in sync with reality.

### Purpose
- Explain what the app does, how it’s structured, and how components interact
- Provide a service map, file/folder map, data models, and API shapes
- Define the provider-agnostic tool-calling and model-proxy contracts
- Record changelog entries so future AI/humans can understand evolution

### What This App Does
- **Model Proxy**: Unified interface to OpenAI, Anthropic, and Google (Gemini) for chat/completions/streaming/tool calling. Centralized cost accounting and observability.
- **Prompt Manager**: Create prompts, versions, variables; test against models; compare outputs; persist runs with costs and latency.
- **Eval System**: Create datasets, run experiment matrices across prompt versions and models, judge outputs (heuristic and LLM-as-judge), and visualize results.
- **Tool Calling**: Provider-agnostic tool schema and adapters; safe execution with allowlist + sandbox + audit logs.

---

### File & Folder Map (React via Next.js; Vercel target)
(Update as directories and files are added. Replace "planned" with actual structure as it appears.)

- `web/` — Next.js app (React) and backend API routes
  - `app/` — Next.js app router (UI and API)
    - `api/` — Server route handlers (currently: `health`, `db`)
    - `(prompts)/` — Prompt management UI (planned)
    - `(evals)/` — Datasets, runs, results UI (planned)
  - `prisma/` — Prisma schema, migrations, SQLite dev DB
  - `src/` — Source code
    - `generated/prisma/` — Prisma Client output
    - `lib/` — Core logic helpers
      - `db.ts` — Prisma client singleton
    - `app/` — (optional future relocation for co-locating under src)
  - `package.json`, `eslint.config.mjs`, `tsconfig.json`
- Root: `PROJECT_PLAN.md`, `AI_Instructions.md`, `AI_System_Prompt.md`

Deployment/Hosting
- GitHub repository as source of truth
- Vercel for deployments: Preview on PRs, Production on `main`

---

### Service Map

- Model Proxy (`web/src/lib/providers/*`, API (planned): `/api/v1/chat`, `/api/v1/models`)
  - Responsibilities: vendor-agnostic interface, streaming, tool calling, cost usage
  - Key modules: provider adapters, model registry, cost calculator

- Prompt Manager (`web/src/lib/prompt/*`, API (planned): `/api/v1/prompts`, `/api/v1/runs`)
  - Responsibilities: prompt CRUD, versioning, interpolation, run persistence
  - Key modules: templating, variable resolver, run exporter

- Tooling (`web/src/lib/tools/*`)
  - Responsibilities: tool schema, registry, safe execution with audit logs
  - Key modules: schema validator, adapters to vendor formats, runner

- Eval System (`web/src/lib/eval/*`, API (planned): `/api/v1/evals/*`)
  - Responsibilities: datasets, runners, judges, metrics, reports
  - Key modules: dataset store, matrix runner, heuristic and LLM judges, report generator

- Observability & Costs (`web/src/lib/costs/*`)
  - Responsibilities: pricing tables, token usage aggregation, cost calculations
  - Key modules: per-vendor pricing definitions and calculator utilities

---

### Data Models (initial)

- Prompt
  - id, name, description, createdAt, updatedAt
- PromptVersion
  - id, promptId, version (semver/int), template (string), variables (JSON), metadata (JSON), createdAt
- Run
  - id, promptVersionId, modelKey, inputVars (JSON), output (JSON/string), toolCalls (JSON), usage (JSON), costUsd (number), latencyMs (number), createdAt
- EvalDataset
  - id, name, description, createdAt
- EvalExample
  - id, datasetId, inputs (JSON), expected (JSON/string), metadata (JSON)
- EvalRun
  - id, datasetId, matrixConfig (JSON), judgeConfig (JSON), startedAt, finishedAt, summary (JSON)
- EvalResult
  - id, evalRunId, exampleId, promptVersionId, modelKey, output, scores (JSON), costUsd, latencyMs

Note: Actual Prisma schema may refine types and relations.

---

### Unified API Contracts (high-level)

- ChatRequest
  - model: string (e.g., "openai:gpt-4o", "anthropic:claude-3.5-sonnet", "google:gemini-1.5-pro")
  - messages: [{ role: system|user|assistant|tool, content: string|parts }]
  - tools?: Tool[]
  - toolChoice?: "auto" | "none" | { type: "function", function: { name: string } }
  - stream?: boolean
  - temperature?, topP?, maxTokens?
  - metadata?: { runId?: string, tags?: string[] }

- ChatResponse
  - id, model, choices|stream, toolCalls?, usage: { inputTokens, outputTokens }, costUsd

- Tool
  - name: string
  - description: string
  - parameters: JSONSchema (draft-07+)

- EvalRunRequest
  - datasetId: string
  - promptVersionIds: string[]
  - modelKeys: string[]
  - judge: { type: "heuristic" | "llm", config: any }
  - repeats?: number

---

### Provider Adapters (Model Proxy)

- OpenAI Adapter
  - Translate unified ChatRequest to OpenAI API
  - Map tools to functions/tools, handle function_call
  - Compute usage and cost based on model pricing

- Anthropic Adapter
  - Translate unified ChatRequest to Messages API with tools
  - Compute usage and cost

- Google (Gemini) Adapter
  - Translate unified ChatRequest to function calling
  - Compute usage and cost

Common Adapter Requirements
- Streaming via SSE
- Tool-call aggregation and replay support
- Error normalization and retry/backoff policy

---

### Tool Calling Spec (Provider-Agnostic)

- Tool definition mirrors OpenAI function schema for portability:
  - `{ name, description, parameters: JSONSchema }`
- Runtime behavior
  - toolChoice: auto/none/specific function
  - When a tool call is returned, the runner validates args against JSONSchema and executes the registered function with timeouts
  - All tool executions produce audit logs with name, args, duration, and result size; errors are recorded

Adapters
- Map to each vendor’s specific tool/function schema; ensure required fields and max lengths are respected.

---

### Costs & Usage
- Centralize pricing in `lib/costs/pricing.ts` with per-model input/output rates
- Usage aggregation comes from provider response usage fields; fallback to tokenizer approximations if absent
- `costUsd = (inputTokens * inputRate) + (outputTokens * outputRate)`; store per-run

---

### Environment Variables (Vercel)
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `GOOGLE_API_KEY`
- `DATABASE_URL` (SQLite for dev; Postgres in prod)
- Optional: `LANGFUSE_*`

---

### Eval Methodology
- Offline: datasets with labeled inputs/expectations
- Matrix: (promptVersion × model) × repeats
- Judges: heuristic rules or LLM-as-judge with rubric
- Metrics: accuracy/score, latency, cost; export CSV/JSON

---

### Update Policy (MANDATORY)
On any change:
1. Update the File & Folder Map with new/changed/removed files
2. Update Service Map if responsibilities or modules change
3. Update Data Models and Unified API Contracts if types, fields, or routes change
4. Append a Changelog entry with a one-liner and impacted sections
5. If conventions change, update `AI_System_Prompt.md`
6. If plan changes, update `PROJECT_PLAN.md` milestones and next steps

---

### Instruction Files Index
- `AI_Instructions.md` (this file): living, detailed system map and contracts
- `AI_System_Prompt.md`: high-level contributor rules, conventions, and how to maintain docs
- `PROJECT_PLAN.md`: milestones, tasks, acceptance criteria, and next steps

---

### Changelog
- v0.0.1: Initial instruction system and project plan created; structure defined and ready for iteration.
- v0.0.2: Clarified React via Next.js frontend and GitHub→Vercel deployment; added environment variables section.
- v0.0.3: Scaffolded Next.js app under `web/` with Prisma (SQLite), initial schema/models, and basic API routes (`/api/health`, `/api/db`). Updated folder and service maps.


