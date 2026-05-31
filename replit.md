# LuxeState CRM

A luxury real estate CRM with lead tracking, WhatsApp integration, property management, analytics, and deal pipeline — designed for high-end brokers.

## Run & Operate

- `pnpm --filter @workspace/luxestate run dev` — run the frontend (auto-started via workflow)
- `pnpm --filter @workspace/api-server run dev` — run the API server (auto-started via workflow)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Tailwind CSS v4, wouter (routing), shadcn/ui
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)

## Where things live

- `artifacts/luxestate/` — React/Vite frontend (the main app)
- `artifacts/luxestate/src/pages/` — all page components (marketing + dashboard)
- `artifacts/luxestate/src/components/` — UI and dashboard components
- `artifacts/api-server/` — Express backend
- `lib/api-spec/openapi.yaml` — API contract (source of truth)
- `lib/db/src/schema/` — database schema

## Product

- **Marketing page** — public landing page at `/`
- **Dashboard** — overview with stats, performance charts, quick actions
- **Leads** — lead management table with filtering, archiving, scheduling
- **Properties** — property listings and showcase
- **Deals** — deal pipeline and stage management
- **Analytics** — charts and business analytics
- **Messages** — messaging/WhatsApp widget
- **Calendar** — appointment scheduling
- **AI Intelligence** — AI-powered insights
- **Automations** — workflow automations
- **Team** — team management
- **Documents** — document storage
- **Settings** — account settings

## User preferences

_Populate as you build._

## Gotchas

- App runs via Replit workflows, not root-level `pnpm dev`
- Frontend base path is `/` (wouter uses BASE_URL from env)
- API routes are prefixed `/api`
