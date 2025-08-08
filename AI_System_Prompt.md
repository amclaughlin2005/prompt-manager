## AI System Prompt — Prompt Manager

You are contributing (as AI or human) to the Prompt Manager repository. Follow these rules to keep the codebase coherent, testable, and well-documented.

### Mission
- Build a local-first app that:
  - Proxies to multiple AI providers (OpenAI, Anthropic, Google/Gemini) via a unified API with streaming and tool calling
  - Manages prompts, versions, and test runs with latency and cost tracking
  - Runs evals at scale across prompts and models with heuristic and LLM judges

### Stack
- TypeScript, Node.js 20+
- Next.js (React) for UI + API routes
- Prisma ORM (SQLite dev, Postgres prod)
- Optional: Langfuse for tracing; OpenTelemetry for logs/metrics if added
- Hosting: GitHub → Vercel (Preview on PRs, Production on `main`)

### Folder Semantics (planned; update as you create)
- `app/`: Next.js app router
  - `api/`: backend route handlers
  - `(prompts)/`: prompt manager UI
  - `(evals)/`: eval UI
- `lib/`: core logic
  - `providers/`: model provider adapters (OpenAI/Anthropic/Google)
  - `prompt/`: prompt templating/versioning
  - `tools/`: tool schema/registry/runner and vendor adapters
  - `eval/`: dataset store, runner, judges, reports
  - `costs/`: pricing tables and calculators
  - `sdk/`: Node SDK and CLI helpers
- `prisma/`: schema and migrations
- `scripts/`: CLI entry points
- Root: `PROJECT_PLAN.md`, `AI_Instructions.md`, `AI_System_Prompt.md`

If you create new top-level folders, document their purpose here immediately.

### Contribution Rules
1) Always update docs with every substantive change
   - `AI_Instructions.md`: file/folder map, service map, models, API contracts, changelog
   - `PROJECT_PLAN.md`: milestones status and next steps
   - `AI_System_Prompt.md`: if conventions or folder semantics change
2) Keep code readable and typed. Follow clear naming and guard-clause patterns. Avoid deep nesting.
3) Add tests for core logic (providers, tools, eval runner) when implemented.
4) Prefer small, vertical slices: backend + UI + docs updated in one iteration.
5) Secrets live in `.env*`. Never commit keys.

### Model Proxy Guidance
- Implement a provider-agnostic interface and thin adapters per vendor
- Support chat/completions, streaming, tool calling
- Normalize errors; compute costs using centralized pricing tables
- Expose `/api/v1/chat` with SSE streaming

### Tool Calling Guidance
- Use an OpenAI-compatible function spec: `{ name, description, parameters(JSONSchema) }`
- Adapters translate to vendor formats
- Execution via allowlisted registry with timeouts and audit logging

### Eval System Guidance
- Datasets with examples; matrix runner across (prompt version × model)
- Judges: heuristic and LLM-as-judge; store scores, cost, and latency
- Provide export (CSV/JSON) and basic UI visualizations

### How to Maintain the Instruction Files
- `AI_Instructions.md` must reflect the current state at all times
  - Update File & Folder Map, Service Map, Data Models, API Contracts
  - Append a Changelog entry for every change (one line is fine)
- `PROJECT_PLAN.md` should track milestone progress and immediate next steps
- `AI_System_Prompt.md` only changes when contributor rules or folder semantics change

### Quality Bar
- Code must build and run locally
- Lint/type-check clean
- Core flows tested manually (or with automated tests once added)
- Docs updated before considering a change “done”

### Getting Started (once scaffolded)
- Install deps, run db migrations, set `.env` with API keys
- Start dev server; open the Prompt Manager UI; run a test chat via `/api/v1/chat`
- Set up Vercel project linked to GitHub; add env vars in Vercel dashboard; confirm Preview deploys from PRs

### Security & Safety
- Tool execution is always explicitly allowlisted, sandboxed, and time-limited
- Audit tool calls and store arguments and outcomes when safe to do so
- Validate all JSONSchema-defined inputs to tools and APIs


