## Deployment Strategy — Prompt Manager

### Overview
- Source control: GitHub (`amclaughlin2005/prompt-manager`)
- Hosting: Vercel
- Database: Neon Postgres (Production), SQLite (Local dev)

### Environments
- Preview: Every PR creates a Vercel preview
- Production: `main` branch deploys to production

### Environment Variables
Set these in Vercel (Preview & Production):
- `DATABASE_URL` (Neon connection string; include `sslmode=require`)
- `OPENAI_API_KEY` (optional)
- `ANTHROPIC_API_KEY` (optional)
- `GOOGLE_API_KEY` (optional)

Local `.env` example:
```
DATABASE_URL="file:./dev.db"
OPENAI_API_KEY=""
ANTHROPIC_API_KEY=""
GOOGLE_API_KEY=""
```

### Database & Prisma
- Local dev uses `prisma/schema.prisma` (SQLite)
- Production uses `prisma/schema.postgres.prisma` (Postgres/Neon)
- Build step on Vercel runs:
  - `prisma generate --schema prisma/schema.postgres.prisma`
  - `prisma migrate deploy --schema prisma/schema.postgres.prisma`

If Neon role cannot run migrations:
- Pre-run migrations locally or via CI/CD job, then adjust `npm run build` to only run `prisma generate` before `next build`.

### Build & Deploy
- Root Directory: set to `web/` (monorepo layout)
- Framework: Next.js
- Build Command (from `web/package.json`): `npm run build`
- Install Command: `npm install`
- Output Directory: Next.js default (`.next`)

### Post-Deploy Checks
- `GET /api/health` returns `{ ok: true }`
- `GET /api/db` returns `{ ok: true, promptCount: number }`

### Rollbacks
- Use Vercel UI to promote a previous successful deployment or revert a commit on GitHub and redeploy.

### Observability (optional)
- Add Langfuse or OpenTelemetry later for tracing; add tokens as env vars and integrate in server routes.

### Security
- Never commit API keys. Use Vercel env vars.
- Consider read-only DB credentials for Preview environments.

### CI Notes
- Pre-merge checks can run `npm run build` (without Vercel) to catch type/lint errors.
- For integration tests requiring DB, use a Neon branch or a disposable Postgres.


