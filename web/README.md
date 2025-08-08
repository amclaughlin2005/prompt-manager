## Prompt Manager — Web (Next.js)

### Getting Started (Local)

- Install deps: `npm install`
- Create `.env` from `.env.example` and set:
  - `DATABASE_URL="file:./dev.db"`
  - Optional: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_API_KEY`
- Run Prisma (SQLite):
  - `npx prisma migrate dev`
  - `npm run prisma:generate`
- Start dev server:
  - `npm run dev`
- Health checks:
  - `GET /api/health`
  - `GET /api/db` (returns `promptCount`)

### Production Deploy (Vercel + Neon Postgres)

- In Vercel Project Settings → Environment Variables (Preview & Production):
  - `DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DB?sslmode=require`
  - `OPENAI_API_KEY` (optional)
  - `ANTHROPIC_API_KEY` (optional)
  - `GOOGLE_API_KEY` (optional)
- Build Command (default `npm run build`) will:
  - Generate Prisma client and run `prisma migrate deploy` against Postgres (`schema.postgres.prisma`)
  - Build Next.js
- Branching:
  - PRs → Preview deployments
  - `main` → Production
- Notes:
  - Prefer Neon’s pooled connection string if using many concurrent requests
  - Ensure Neon role has permission to run migrations; otherwise run migrations manually and use `prisma generate` only

### Schemas

- Local dev: `prisma/schema.prisma` (SQLite)
- Production: `prisma/schema.postgres.prisma` (Postgres/Neon)

### Scripts

- `npm run dev`: Next dev server (Turbopack)
- `npm run build`: Prisma generate + migrate deploy (Postgres) + Next build
- `npm run start`: Next start
- `npm run prisma:generate`: Generate Prisma client (uses default schema paths)
- `npm run prisma:migrate:deploy`: Deploy migrations to Postgres schema

### Troubleshooting

- ESLint warnings from `src/generated/prisma/*` are ignored via `eslint.config.mjs`
- If build fails on Vercel due to DB perms, pre-run migrations and remove migrate step from `build` script
