# HHDC Admin

> Admin platform for Talent Center "DDC" — a dance school CRM. Manage clients, dance groups and
> schedule, choreographers, branches, invoicing and recurring payments (Mollie), and email workflows.

**HHDC Admin** is a TypeScript monorepo powering the daily operations of a dance school: client and
student records, group schedule and calendar, choreographer and branch management, invoicing with
online payment links, Mollie subscriptions and mandates, emails (IMAP/SMTP), Telegram and Instagram
integrations, users, roles and settings.

## Tech Stack

| Layer   | Technology |
| ------- | ---------- |
| Client  | React 19, Redux Toolkit, TypeScript, SCSS Modules, Webpack, Jest, Storybook |
| Server  | Express 5, Prisma 6, MySQL 8, Redis (rate limiting), Zod, Node test runner |
| E2E     | Playwright, Chromium, real SPA/API/Prisma path, isolated MySQL |
| Auth    | Cookie sessions, CSRF double-submit, Argon2id, 2FA email, Telegram OIDC login (ADMIN-only), endpoint rate limiting |
| Payments| Mollie (payments, subscriptions, mandates, reconciliation) |
| AI      | Local LLM via Ollama (`qwen3`), local embeddings (`bge-m3`), RAG knowledge base, human-approved email drafts via Telegram |
| Infra   | Docker Compose (dev + prod), nginx, GitHub Actions (CI only — deploy is manual) |

## Repository Layout

```text
client/  React admin SPA (Feature-Sliced Design)
server/  Express API + Prisma + MySQL + Redis
docker/  Dockerfiles and nginx config (client & server, dev + prod)
docs/    product, security, infrastructure and roadmap documentation
scripts/ repository-level tooling (dev, deploy, docs generation)
e2e/     Playwright setup and end-to-end business-flow specs
plugins/ local ESLint plugins (FSD path checker)
```

The root package only orchestrates project-level commands. Install dependencies separately in
`client/` and `server/` when working without Docker; the containers install their own.

## Features

- **Clients & Students** — records, filters, pagination, details, comments, payment status
- **Schedule** — groups, halls, calendar, dance styles, choreographers
- **Invoicing** — invoices, PDF, payment links, reminders and Mollie reconciliation
- **Mollie** — client profiles, subscriptions, mandates, payments and incident matrix
- **Emails** — IMAP/SMTP accounts, messages, attachments (encrypted)
- **Local AI email assistant** — private, on-prem (Ollama) pipeline: bounded email normalization,
  deterministic spam checks, LLM classification, hybrid RAG retrieval, draft generation, Telegram
  human-approval flow, and approved-only SMTP sending. Every worker is opt-in and disabled by
  default; nothing is ever sent without human approval. Both LLM prompts (classification + draft
  body) are admin-editable and DB-backed.
- **Knowledge base (RAG)** — ingests the DDC website (sitemap/WordPress discovery), files
  (PDF/DOCX/TXT/MD/HTML), and manually crawled URLs; normalizes, categorizes and chunks content;
  stores local embeddings in MySQL; retrieves via hybrid cosine+BM25+RRF search (optional LLM
  query expansion + reranker) as attributable context for AI drafts. Managed from an in-app
  Knowledge Base admin page — upload, crawl, categorize/tag, re-embed, plus a prompt-library editor
  and an email-simulation panel to preview model output without sending anything.
- **Telegram notifications** — service messages to the staff group about payments, security
  events, new students and new Mollie customers; an admin switches each type on or off on the
  "Уведомления" page, and every switch change is announced to the group
- **Users, Roles, Settings** — organization, brands, company pages, content hub
- **Security** — Argon2id password hashing, cookie sessions with CSRF, 2FA email flow, Telegram OIDC
  login as an additional ADMIN-only provider, rate limiting (Redis-based with in-memory fallback),
  security audit event log

## Getting Started

> Development runs on **Docker** (the supported path used in production).

### Prerequisites

- Docker + Docker Compose v2
- Node.js 20+ (only needed to run repo-level tooling outside the containers)

### 1. Configure environment

Copy the example env file and fill in the values:

```bash
cp .env.example .env
```

`docker compose` reads this file at the repository root. All variables are documented inline in
`.env.example`, including the prod-only `*_PROD` values used by `docker-compose.prod.yml`.

### 2. Start the dev stack

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

This brings up MySQL, Redis, the backend API and the frontend dev server, with the ports defined in
your `.env` (defaults: frontend `3000`, backend `18080`, MySQL and Redis on Docker-internal network).

> **Note:** the database/Redis containers are stateful. To start from a clean slate after changing
> DB credentials or ports, remove the corresponding volumes (`docker compose down -v`) — this
> re-runs the MySQL init scripts.

To populate the local admin with demo data, run:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml exec backend npm run prisma:seed:demo
```

This adds 100 students, 4 branches, 8 halls, 8 choreographers, 6 dance styles, 12 groups with
weekly schedules, 100 invoices with manual payments, and 180 transactions. Existing users and
data are preserved; Mollie and external delivery are not used. Repeating the command skips the
existing demo dataset. The script requires `MODE=development` and rejects `NODE_ENV=production`.

### Running without Docker

Dependencies must be installed separately in each package:

```bash
cd client && npm install
cd server && npm install
```

From the repository root, `npm start` launches both development processes
(`scripts/start-development.js`). Alternatively, run each package directly from its own directory.

## Project Scripts

Repository root:

```bash
npm start             # dev server + client (non-Docker)
npm run deploy        # production Docker deploy
npm run deploy:docker # alias for the same production deploy
npm run ci            # mirrors CI locally: client lint/test/build + server build/test + docs-links
npm run e2e           # reset isolated E2E MySQL, then run Playwright Chromium suite
npm run e2e:ui        # run the E2E suite in Playwright UI mode
npm run e2e:down      # remove the isolated E2E MySQL container and volume
npm run docs:links    # just the markdown link check
npm run check:skylos  # Skylos audit (dead code / security / secrets / quality / SCA) — informational, not part of `ci`
```

`check:skylos` requires Python 3.10+ and Skylos installed locally (`pip install skylos`) — see
[`docs/spec/DDC_CRM_SKYLOS_CI_SPEC.md`](docs/spec/DDC_CRM_SKYLOS_CI_SPEC.md).

Client (`cd client`):

```bash
npm start            # webpack dev server on :3000
npm run build:prod   # production build -> client/build
npm run lint:ts      # ESLint (FSD path rules enforced)
npm run lint:scss    # stylelint
npm test             # Jest
npm run storybook    # Storybook on :6006
```

Server (`cd server`):

```bash
npm start                       # nodemon dev process
npm run build                   # prisma generate + tsc
npm run prisma:generate         # regenerate Prisma client
npm run pmd:dev                 # apply local Prisma schema migrations
npm run migrate:prod            # apply production migrations
npm run user:reset-password -- <email>  # interactive Argon2id password reset
npm run knowledge:sync -- --dry-run     # preview website knowledge discovery (index without --dry-run)
npm run knowledge:file -- <path>        # import a file or directory into the knowledge base
npm run ai:test-flow -- --subject "..." # run one email through the real AI pipeline locally
```

Server tests use the Node built-in test runner and are organised per domain — there is no single
server-wide command:

```bash
npm run test:auth        # also covers Telegram notifications and their switches
npm run test:mollie
npm run test:search
npm run test:email
npm run test:payment-reminders
npm run test:local-ai   # local AI email assistant + knowledge ingestion (config, classification, drafting, approval, send, Telegram, RAG)
# or a single file directly:
node --test -r ts-node/register src/modules/auth/auth.password.service.test.ts
```

Local AI setup, benchmarking, and the opt-in worker flags are documented in
[`docs/spec/DDC_LOCAL_AI_EMAIL_ASSISTANT_OPERATIONS.md`](docs/spec/DDC_LOCAL_AI_EMAIL_ASSISTANT_OPERATIONS.md).

### End-to-end tests

`npm run e2e` verifies the real Browser → React → Express → Prisma → MySQL path.
It uses a dedicated `hhdc-e2e` compose project and resets only its E2E database;
it never uses the development or production database. See [E2E testing](docs/E2E_TESTING.md)
for setup, authentication fixtures, debugging, and adding scenarios.

## Environment Variables

The single source of documented variables is [`.env.example`](.env.example). Key groups:

- **MySQL / Redis** — credentials, database name, host ports (`DB_*`, `REDIS_*`)
- **Ports / URLs** — frontend & backend ports, `CLIENT_URL`, `PUBLIC_SITE_URL`, `CLIENT_API_URL`
  plus their `*_PROD` counterparts
- **Security** — `JWT_*`, `SECRET_SALT`, `CSRF_SECRET`, `VERIFY_MARKER_SECRET`, cookie names,
  token expirations
- **Integrations** — `MOLLIE_*`, `INSTAGRAM_*`, `TELEGRAM_*` (notification bot), `TELEGRAM_OIDC_*`
  (Telegram Login, ADMIN-only — a separate integration, set up via a bot's Login Widget in
  @BotFather; unset by default, the login button/widget stay hidden until configured),
  `TWO_FACTOR_SENDER_EMAIL`
- **Local AI / Ollama** — `OLLAMA_*` (URL, model, embedding model, container limits),
  `LLM_*` (context length, temperature, keep-alive), `AI_MAX_CONCURRENCY`, opt-in
  `AI_EMAIL_*_ENABLED` / `KNOWLEDGE_SYNC_ENABLED` worker flags, Telegram approval
  (`TELEGRAM_APPROVER_IDS`, `TELEGRAM_WEBHOOK_SECRET`, `TELEGRAM_POLLING_ENABLED`), and
  `KNOWLEDGE_*` / `RAG_TOP_K` — full reference in the operations doc

Only the built frontend bundle and server receive environment at runtime; the server reads env from
the compose `environment:` block (or, when run directly with `node`/`nodemon`, from a `server/.env`
file — not required for the Docker workflow).

## Architecture

### Client — Feature-Sliced Design

`client/src` is organised into layers, top-down:

```text
app -> pages -> widgets -> features -> entities -> shared
```

A slice may import only through its own public API (`index.ts`) or from a layer **below** — never
sideways or up. This is enforced by the local `eslint-plugin-fix-path-plugin` (`path-checker` rule);
the `@/` alias maps to `client/src/`.

Most page/feature state is mounted lazily with `DynamicModuleLoader`. API access goes through
`@/shared/api/api.ts`: `$api` for unauthenticated calls and `$apiPrivate` for cookie-session calls
that automatically attach the CSRF token.

### Server — Feature/Domain Modules

```text
modules/<name>/<name>.routes.ts -> <name>.controller.ts -> <name>.service.ts
```

- Business modules live under `server/src/modules/`: `auth` (incl. `auth/telegram/` — Telegram
  OIDC login), `users`, `clients`, `company`, `schedule`, `comments`, `search`, `transactions`,
  `invoices`, `payments` (Mollie), `payment-reminders`, `communication`
  (`email`/`instagram`/`telegram` — this `telegram` is the outbound notification bot with
  admin-controlled per-type switches, a separate integration from `auth/telegram/`), `health`, `ai-email-assistant`, `knowledge-ingestion`
- The local AI email assistant stays in its own module boundary: classify → draft (RAG context) →
  Telegram approval → approved-only SMTP send. Knowledge ingestion (website sitemap/WordPress
  discovery, file import, embeddings, MySQL retrieval) lives in `knowledge-ingestion`. Both are
  opt-in via feature flags (`AI_EMAIL_*_ENABLED`, `KNOWLEDGE_SYNC_ENABLED`) and default off.
- Domain-agnostic infrastructure lives under `server/src/common/`: `errors/`, `middleware/`,
  `validation/`, `logger/`, `utils/`
- Validation via Zod schemas colocated with each module, applied through
  `common/validation/validate-schema.middleware.ts`
- Authentication: cookie sessions, CSRF double-submit, Argon2id password hashing, 2FA email flow,
  Telegram OIDC login (ADMIN-only, additional provider — replaces password entry only, still runs
  through 2FA/session issuance), endpoint-specific rate limiting (Redis when `REDIS_URL` is set,
  in-memory process-local fallback) — all in `modules/auth/`
- Prisma schema is split across `server/prisma/schema/*.prisma` (client, company, email, invoice,
  mollie, payment-reminder, schedule, user, ai-email, knowledge) pointed at MySQL via `DATABASE_URL`
- `GET /api/v1/health` (no auth, no DB) supports Docker health checks and deploy smoke tests

## Production & Deployment

Production is deployed as a **single Docker Compose stack** on a VPS, driven by

```bash
npm run deploy
```

(`npm run deploy:docker` is an alias). The deploy script (`scripts/deploy-docker.sh`) takes
`--no-cache` and `--skip-smoke` flags and uses `docker compose` with the `prod` override files.

The production topology, required env values, container names, ports and the nginx contract are
documented in full:

- [Docker Production Deployment](docs/spec/DOCKER_PRODUCTION_DEPLOYMENT.md)
- [Deploy endpoint usage](scripts/deploy-docker.sh)

GitHub Actions:
- [`ci.yml`](.github/workflows/ci.yml) — `client-checks`/`server-checks`/`docs-links` on Node 20,
  runs on PRs and pushes to `develop` and `main`
- `skylos-check` — Skylos static-analysis audit (Python 3.12), same triggers. Currently
  **informational only** (Phase A) — a failing run does not block merge yet; see
  [`docs/spec/DDC_CRM_SKYLOS_CI_SPEC.md`](docs/spec/DDC_CRM_SKYLOS_CI_SPEC.md)

Production deploy is manual (`npm run deploy`, run by the repo owner), not GitHub-Actions-triggered —
see `docs/adr/0002-manual-production-deploy-retire-github-actions-deploy.md` (gitignored, local only)
for why.

## Development Workflow

Branch model, PR process, and commit conventions are documented in [AGENTS.md](AGENTS.md#git-and-pull-requests).
Run `npm run ci` before pushing — it mirrors what CI checks.

## Documentation

- [Telegram notifications — module contract](docs/spec/DDC_CRM_TELEGRAM_NOTIFICATIONS_SPEC.md)
- [Local AI Email Assistant — Technical Specification](docs/spec/DDC_LOCAL_AI_EMAIL_ASSISTANT_SPEC.md)
- [Local AI Email Assistant Operations](docs/spec/DDC_LOCAL_AI_EMAIL_ASSISTANT_OPERATIONS.md)
- [Project dependency tree](docs/spec/PROJECT_TREE.html) (Graphify)
- [Server source tree](docs/spec/SERVER_SRC_TREE.html) and [Client source tree](docs/spec/CLIENT_SRC_TREE.html)
- [Graphify workflow](docs/spec/GRAPHIFY_WORKFLOW.md)
- [Schema documentation](docs/schema.md)

## License

No license file is included in this repository. All rights to the code are reserved by the
copyright holder. Contact the maintainer for usage permissions.
