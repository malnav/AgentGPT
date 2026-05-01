# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

**Root workspace:**
```bash
pnpm run build         # Typecheck libs, then build all artifacts
pnpm run typecheck     # Full TypeScript check across workspace
```

**Frontend (`@workspace/agentgpt`):**
```bash
pnpm --filter @workspace/agentgpt run dev        # Vite dev server
pnpm --filter @workspace/agentgpt run build      # Production build
pnpm --filter @workspace/agentgpt run typecheck  # TypeScript check
```

**Backend (`@workspace/api-server`):**
```bash
pnpm --filter @workspace/api-server run dev        # Build + start (NODE_ENV=development)
pnpm --filter @workspace/api-server run build      # esbuild bundle to dist/index.mjs
pnpm --filter @workspace/api-server run typecheck  # TypeScript check
```

**Database (`@workspace/db`):**
```bash
pnpm --filter @workspace/db run push        # Apply Drizzle schema migrations (requires DATABASE_URL)
pnpm --filter @workspace/db run push-force  # Force migration
```

**API codegen (`@workspace/api-spec`):**
```bash
pnpm --filter @workspace/api-spec run codegen  # Regenerate client + Zod schemas from openapi.yaml
```

There are no tests or lint commands — only TypeScript type checking.

## Architecture

This is a **pnpm monorepo** with two top-level directories:

- `artifacts/` — deployable apps (agentgpt frontend, api-server backend, mockup-sandbox)
- `lib/` — shared non-deployable libraries (db, api-spec, api-client-react, api-zod)

### Data Flow

```
lib/api-spec/openapi.yaml
        │
        ▼ (pnpm codegen via Orval)
        ├──► lib/api-client-react/src/generated/  (React Query hooks)
        └──► lib/api-zod/src/generated/            (Zod schemas)
                    │                                      │
                    ▼                                      ▼
         artifacts/agentgpt          ◄──────   artifacts/api-server
         (React 19 + Vite)                     (Express 5 + Node.js 24)
                    │                                      │
                    │ /api proxy (vite dev)                │
                    └──────────────────────────────────────┘
                                                           │
                                                    lib/db (Drizzle + PostgreSQL)
```

**API-first design**: The source of truth for the API contract is `lib/api-spec/openapi.yaml`. After modifying it, run codegen to regenerate the React Query hooks and Zod validation types used by both frontend and backend.

### Key Packages

| Package | Path | Role |
|---|---|---|
| `@workspace/agentgpt` | `artifacts/agentgpt/` | React 19 SPA with Radix UI, Tailwind CSS 4, Wouter routing |
| `@workspace/api-server` | `artifacts/api-server/` | Express 5 REST API; exports app for Vercel serverless |
| `@workspace/db` | `lib/db/` | Drizzle ORM client + schema definitions for PostgreSQL |
| `@workspace/api-spec` | `lib/api-spec/` | OpenAPI 3.1 spec + Orval codegen config |
| `@workspace/api-client-react` | `lib/api-client-react/` | Generated React Query hooks (do not hand-edit) |
| `@workspace/api-zod` | `lib/api-zod/` | Generated Zod schemas (do not hand-edit) |

### Backend Routes

The api-server mounts these routes under `/api`:
- `GET /healthz` — health check
- `GET /weather` — Open-Meteo weather API integration
- `GET /fetch-url` — proxy endpoint for fetching external URLs
- `GET|POST /imap` — IMAP email operations
- `GET|POST /gmail` — Gmail API integration

### TypeScript Build Strategy

Libraries use composite project references with `emitDeclarationOnly: true`. Actual bundling is done by esbuild (api-server) and Vite (agentgpt) — not `tsc`. Running `pnpm run typecheck` uses `tsc --build --emitDeclarationOnly` across the workspace.

All packages extend `tsconfig.base.json` (ES2022 target, `moduleResolution: bundler`, strict mode).

### Deployment

- **Replit**: Hosts api-server and mockup-sandbox. Post-merge hook runs `pnpm install --frozen-lockfile && pnpm --filter db push`.
- **Vercel**: Deploys from `main` branch only (preview deployments disabled). api-server exports the Express app for Vercel Serverless Functions instead of calling `.listen()`.
- Frontend dev server proxies `/api` requests to `localhost:8080`.
