# VANTA OS — Shopify Embedded AI Agent App

> **The Operating System for Your Shopify Store.**

Production-grade, Shopify App Store–compliant embedded app that lets merchants instruct a Gemini-powered AI agent to read/write store data via the official Shopify Admin GraphQL API — with guardrails, blast-radius checks, undo, audit trail, and proactive monitoring.

---

## Distribution Type

This build targets a **private/custom app** (Section 1 of the build spec) — single store or agency's clients, not on the public App Store yet. OAuth, embedding, and the 3 mandatory compliance webhooks (Section 5.2) are still implemented because they apply to **any** app using the Admin API.

To switch to a public App Store listing later, re-enable Section 14 in full (screencast, App Store copy, Built-for-Shopify visual conformity).

---

## Tech Stack

| Layer        | Tech                                                                |
| ------------ | ------------------------------------------------------------------- |
| Frontend     | React 18 + Remix + Vite, Tailwind CSS, Framer Motion, Polaris, App Bridge React |
| Backend      | Node 20 + Remix server routes, `@shopify/shopify-app-remix`        |
| Database     | PostgreSQL 16 + Prisma 5 (official session storage adapter)        |
| Queue        | Redis 7 + BullMQ (separate worker process)                          |
| AI           | Google Gemini API via `@google/generative-ai` (single `lib/ai.ts`)  |
| Email        | Resend (transactional)                                              |
| Error tracking | Sentry                                                            |
| Tests        | Vitest (unit) + Playwright (E2E)                                    |
| Containers   | Docker multi-stage + docker-compose                                 |

---

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Copy env

```bash
cp .env.example .env
# Fill in: SHOPIFY_API_KEY, SHOPIFY_API_SECRET, GEMINI_API_KEY, SHOPIFY_PARTNER_API_TOKEN, etc.
```

### 3. Spin up the local stack

```bash
docker compose up -d
# This brings up Postgres + Redis only (web/worker run via npm run dev for hot reload)
```

### 4. Apply migrations + generate Prisma client

```bash
npm run generate
npm run migrate:deploy
npm run seed
```

### 5. Run the dev server (web) + worker in two terminals

```bash
# Terminal 1 — web (Remix dev server + Shopify CLI tunnel)
npm run dev

# Terminal 2 — worker (BullMQ consumer)
npm run dev:worker
```

### 6. Open the app

Visit the URL printed by `shopify app dev` (typically `https://<your-tunnel>.trycloudflare.com/app`).

---

## package.json Scripts (Section 4)

| Script             | Purpose                                                          |
| ------------------ | ---------------------------------------------------------------- |
| `dev`              | Shopify CLI dev server with Cloudflare tunnel + hot reload       |
| `dev:web`          | Bare Remix Vite dev (no Shopify CLI)                             |
| `dev:worker`       | BullMQ worker in watch mode                                       |
| `build`            | Production Remix build                                            |
| `build:worker`     | Compile + bundle worker to `dist/worker/index.js`                |
| `start`            | Run production web server                                         |
| `start:worker`     | Run production worker                                             |
| `migrate`          | `prisma migrate dev` (creates new migration in dev)              |
| `migrate:deploy`   | `prisma migrate deploy` (applies pending migrations, CI-safe)    |
| `migrate:reset`    | Drop + recreate schema (dev only)                                 |
| `generate`         | `prisma generate`                                                |
| `studio`           | `prisma studio` GUI                                               |
| `seed`             | Seed default feature flags                                        |
| `backup:db`        | `pg_dump` to `./backups` (30-day retention by default)            |
| `restore:db`       | Restore from a `.sql.gz` backup file                              |
| `test`             | Run all Vitest unit tests                                         |
| `test:watch`       | Watch mode                                                        |
| `test:e2e`         | Playwright E2E suite                                              |
| `lint`             | ESLint                                                            |
| `format`           | Prettier                                                          |
| `typecheck`        | TS typecheck (web)                                                |
| `typecheck:worker` | TS typecheck (worker)                                             |
| `deploy`           | `shopify app deploy`                                              |

---

## Database Backup Strategy (Section 79)

Daily automated backups:

```bash
# Add to crontab — runs at 02:00 daily
0 2 * * * cd /app && npm run backup:db >> /var/log/vanta-backup.log 2>&1
```

Backups are gzipped SQL dumps, retained 30 days, written to `./backups/`. Test restore once during initial setup:

```bash
npm run restore:db -- backups/vanta-os-2026-06-20T02-00-00.sql.gz
```

For S3-compatible storage, pipe the script's output through `aws s3 cp -`.

---

## API Versioning (Section 80)

All Shopify GraphQL/REST calls import `SHOPIFY_API_VERSION` from `app/lib/shopify/constants.ts`. Quarterly upgrades are a one-line constant change + regression test run.

---

## Authorship & Copyright

- **Project:** VANTA OS v1.0.0
- **License:** UNLICENSED (private)

---

## Phase Status

- ✅ **Phase 1** — Project scaffold, package.json, shopify.app.toml, Prisma schema, env template, Docker, PWA, config files
- ⏳ **Phase 2** — Core auth, Shopify API utilities, mandatory webhooks
- ⏳ **Phase 3** — BullMQ worker, Gemini integration, background execution
- ⏳ **Phase 4** — Frontend UI (App Bridge, Polaris, Agent Canvas, all Section 9 screens)
- ⏳ **Phase 5+** — Docker polish, OpenAPI, white-label, advanced features
