# HHDC Admin — Project Context

Domain knowledge for AI agents working on this codebase.

---

## Product

CRM / admin platform for dance school "DDC" (Talent Center): client/student records, dance groups, schedule/calendar, choreographers, branches, invoicing and recurring payments (Mollie), email workflows, users/roles, settings, and a local (Ollama) AI email assistant with a RAG knowledge base.

## Domain Language

| Term | Meaning |
|---|---|
| Client | A person enrolled at the school (student), or their parent/guardian who pays. |
| Group / Dance group | A scheduled class (style + level + choreographer + hall + time slot). |
| Choreographer | An instructor who teaches one or more groups. |
| Branch / Filiya | A physical location / studio. |
| Invoice | Generated monthly per client for active groups. PDF + online payment link. |
| Mollie | Payment gateway: client profiles, subscriptions, mandates, payments, reconciliation. |
| Mandate | Recurring payment authorisation (Mollie). |
| Payment reminder | Automated email sequence for unpaid invoices. |
| Invoice audit log | Per-invoice change history (`InvoiceAuditLog`: action + before/after value snapshot). Distinct from the security audit event log. |
| Local AI email assistant | Private, on-prem (Ollama) pipeline: reads inbound email, classifies it, drafts replies with RAG knowledge, and sends only after human approval via Telegram. No cloud LLM API. |
| Knowledge base (RAG) | Local indexed copy of the DDC website (sitemap/WordPress discovery), manually crawled URLs, and imported files (PDF/DOCX/TXT/MD/HTML), chunked and embedded locally (`bge-m3`), stored in MySQL, retrieved via hybrid cosine+BM25+RRF search as attributable draft context. |
| RAG v2 (layered) | Opt-in (`RAG_VERSION=v2`) retrieval over the curated `server/knowledge/ddc-knowledge-v2` KB, namespaced `kb_version='v2'` in the same tables: business rules → current facts → FAQ → style examples, metadata-filtered before semantic ranking, with a deterministic grounding validator on the draft. Examples are never a factual source. See `docs/spec/DDC_RAG_V2_OPERATIONS.md`. |
| Embedding | Local vector representation of a knowledge chunk; retrieval ranks chunks by cosine similarity with configurable top-K. |
| Telegram notification | One-way service message from the bot to staff (new or deleted student, new or deleted Mollie customer, Mollie mandate and subscription changes, Mollie payment, login blocked, new device, role changed, new email). Each type has an ADMIN-controlled on/off switch on the "Уведомления" page; every switch change is announced to the admin group. Not a customer channel. |
| Draft approval | Human-in-the-loop Telegram flow over a generated draft: approve / edit / reject / mark spam; SMTP sending happens only after explicit approval. |

## System Overview

TypeScript monorepo, two packages, no shared root `node_modules`:

- `client/` — React 19 admin SPA, Redux Toolkit, custom webpack (not CRA), SCSS Modules
- `server/` — Express 5 API, Prisma 6 ORM, MySQL 8, Zod validation
- `docker/` — Dockerfiles and nginx config for dev and prod
- `docs/` — product, infrastructure, security, roadmap, Graphify documentation
- `plugins/` — local ESLint plugins (FSD path checker)
- `e2e/` — Playwright setup plus authentication and business-flow specs

Two agent harnesses share the same Graphify-generated context: `.mcp.json` wires it into
Claude Code, `.codex/config.toml` wires the identical `graphify-out/graph.json` into the
OpenAI Codex CLI. Term glossary (`code-only`, semantic pass, clustering, wiki) and the
generation workflow: [Graphify Workflow](docs/spec/GRAPHIFY_WORKFLOW.md).

## Client Architecture

`client/src` follows Feature-Sliced Design:

```
app -> pages -> widgets -> features -> entities -> shared
```

- Slices import only through their public API (`index.ts`) or from lower layers.
- `@/` alias → `client/src/`.
- FSD path rules enforced by `eslint-plugin-denys-fix-fsd-path-plugin` (`path-checker`).
- Redux state: two mandatory root reducers (`user`, `ui`) always mounted, plus optional lazy
  ("feature") reducers registered on demand via `DynamicModuleLoader`. The full contract —
  `StateSchema` interface listing every optional slice, and `ReducerManager.add`/`.remove` — lives
  in `client/src/app/providers/StoreProvider/config/StateSchema.ts`.
- API access: `$api` (unauthenticated) and `$apiPrivate` (cookie session + CSRF).
- UI text via i18next. Components are functional, often wrapped with `memo()`.
- SCSS Modules (`*.module.scss`). Global styles in `app/styles`.
- UI conventions: `.claude/rules/code-style.md` — theme tokens (prefer `*-redesigned`), dark theme awareness.

## Server Architecture

Feature/domain-based modules:

```
modules/<name>/<name>.routes.ts -> <name>.controller.ts -> <name>.service.ts
```

- Business modules under `server/src/modules/`: `auth` (incl. `auth/telegram/` — Telegram OIDC
  login/link, ADMIN-only; `auth/telegram-miniapp/` — HMAC-verified `initData` auth for the
  Telegram Mini App, a third, still-distinct Telegram integration, see Integrations below), `users`,
  `clients`, `company`, `schedule`, `comments`, `search`, `transactions`, `invoices`, `payments`
  (Mollie), `payment-reminders`, `communication` (`email`/`instagram`/`telegram` sub-modules — this
  `telegram` is outbound staff notifications plus their ADMIN-controlled per-type switches, a
  different Telegram integration from either `auth/telegram/` or `auth/telegram-miniapp/`), `telegram-admin-bot` (the Mini App's root-menu
  `/start` handler — routes admins into the Mini App via `web_app`/`url` deep links depending on
  chat type, see Integrations below), `health`, `ai-email-assistant`, `knowledge-ingestion`.
- `ai-email-assistant` keeps the whole AI workflow in one module boundary: normalize/bounded
  persistence → deterministic spam checks → LLM classification (`classifyEmail`, strict runtime
  schema, one repair retry) → CRM read-only projection (`createPrismaCrmReader`) → RAG context →
  draft generation (`generateEmailDraft`; reply language/subject/confidence computed
  deterministically, only the body comes from the LLM) → Telegram approval (webhook
  `POST /api/v1/telegram/webhook` with `X-Telegram-Bot-Api-Secret-Token`, or long-polling behind
  `TELEGRAM_POLLING_ENABLED`) → approved-only SMTP send (`runSendPipeline`, atomic
  `APPROVED -> SENDING -> SENT|FAILED`, idempotency-keyed so retries can't double-send). Both LLM
  prompts (classification + draft body) are DB-backed and admin-editable (`prompt-library.service.ts`,
  `AiPrompt` model, `/ai-email/prompts` API) — only the instructions text is stored/editable; the
  dynamic per-email data is always appended programmatically and can never be omitted. At most one
  active prompt per slot; no active row falls back to the hardcoded default, so an empty table
  changes nothing. The active prompt drives real production classify/draft calls, not just
  simulation.
- `knowledge-ingestion` covers website discovery (sitemap-first, WordPress REST fallback;
  canonical-language and domain allowlist filtering so translations are never indexed as
  duplicates), manual URL crawling and file import (`.pdf` via pdf-parse, `.docx` via mammoth,
  `.txt/.md/.html`) from the Knowledge Base admin page, category (`KnowledgeCategory` enum) and
  LLM-derived metadata (priority + tags) per document, HTML normalization with content hashing,
  semantic chunking with configurable size/overlap (`RAG_CHUNK_SIZE`/`RAG_CHUNK_OVERLAP`, default
  700/100 characters — no tokenizer wired up, ~2-2.5 chars/token for Cyrillic), local `bge-m3`
  embeddings via Ollama, MySQL persistence (`knowledge_documents`/`knowledge_chunks`), and
  incremental sync planning. Retrieval (`KnowledgeRetrievalService`) is hybrid: cosine similarity
  first establishes the qualifying set (`minimumScore` bar + de-dup, unchanged since V1), then BM25
  + Reciprocal Rank Fusion re-rank within that set, with an optional LLM-based query expansion pass
  before search and an optional reranker pass after (`RAG_QUERY_EXPANSION_ENABLED`/
  `RAG_RERANK_ENABLED`/`RAG_RERANK_MODEL`, default off in production, always available in the
  "Симуляция письма" admin panel for evaluation first). The returned `score` field is always the
  plain cosine similarity, never a BM25/RRF/rerank score, because `ollama.client.ts`'s
  `CONFIDENT_KNOWLEDGE_SCORE` threshold depends on it. All ingestion/classification/draft workers
  are opt-in cron jobs behind `AI_EMAIL_*_ENABLED` / `KNOWLEDGE_SYNC_ENABLED` and default off.
- RAG v2 (`RAG_VERSION=v2`, default `v1`): `knowledge-ingestion/kb-v2/` parses front matter /
  path metadata, chunks by H2 and indexes via `npm run knowledge:validate|index|reindex`;
  `ai-email-assistant/rag-v2/` refines the unchanged LLM classification deterministically
  (intent v2, subintent, entities), plans and runs layered retrieval, builds a sectioned prompt,
  validates grounding (one regeneration max, then needs staff review) and stores `rag_trace` on
  the draft. Live evaluation: `npm run knowledge:eval`. Details: `docs/spec/DDC_RAG_V2_OPERATIONS.md`.
- Knowledge Base admin page (`client/src/pages/KnowledgeBasePage/`, sidebar-linked) covers file
  upload, URL crawling, category/metadata assignment, manual embedding trigger, paginated document
  list (20/page), the prompt library editor, and an email-simulation panel that runs the real
  classify → retrieve → draft pipeline against arbitrary test input to preview model output
  (including query-expansion/reranker toggles) without sending anything or touching a real inbox.
  Every LLM-touching stage of a simulation run reports its model/duration/token usage inline and
  persists to a separate `ai_simulation_runs`/`ai_simulation_run_metrics` history (never the real
  `ai_email_*` tables), browsable in a paginated, provider-filterable history table with a per-run
  detail view — lets an admin compare prompts/providers over time, not just within one run.
- Domain-agnostic shared infrastructure under `server/src/common/`: `errors/` (ApiError + error
  middleware), `middleware/` (query stats), `validation/` (generic Zod schema-validation
  middleware), `logger/`, `utils/` (crypto, paths, file upload).
- Validation: Zod schemas colocated with each module (e.g. `modules/auth/auth.schema.ts`), applied
  via `common/validation/validate-schema.middleware.ts`.
- Auth: cookie sessions, CSRF double-submit, Argon2id, 2FA email flow, endpoint-specific rate
  limiting — all in `modules/auth/` (`auth.middleware.ts`, `auth.csrf.middleware.ts`,
  `auth.login-rate-limit.middleware.ts`, `auth.two-factor-rate-limit.middleware.ts`). Telegram OIDC
  is an additional, ADMIN-only login provider (`modules/auth/telegram/`) — it replaces password
  entry only, still goes through the same 2FA/session issuance; see
  [Identity domain](docs/domain/identity.md).
- Rate limiting: Redis-based when `REDIS_URL` is set; in-memory process-local fallback otherwise.
- Health: `GET /api/v1/health` (no auth, no DB) — for Docker health checks, `modules/health/`.
- Migrated from a layer-first `controllers/`/`services/`/`routes/` structure — see
  `docs/spec/BACKEND_MODULAR_REFACTORING_SPEC.md` for the migration workflow and rationale.

## Data / Prisma

- Schema split across `server/prisma/schema/*.prisma`: client, company, email, invoice, mollie, payment-reminder, schedule, user, ai-email, knowledge.
- `schema.prisma` contains datasource/generator and shared models (`Comment`, `Transaction`).
- MySQL via `DATABASE_URL`.
- After editing any `.prisma` file: `cd server && npm run prisma:generate` (also runs in `npm run build` via `prebuild`).

## Integrations

- **Mollie** (`@mollie/api-client`): client payment profiles, subscriptions, mandates, reconciliation.
- **Email**: IMAP/SMTP via `imapflow`/`nodemailer`/`mailparser`. Separate model in `email.prisma`.
- **2FA email**: Sent via nodemailer directly using SMTP creds from `EmailAccount` whose `username` matches `TWO_FACTOR_SENDER_EMAIL` env — does not go through `service.EmailSmtp` and does not create a message in the Email module.
- **Telegram** — three independent integrations sharing one physical bot/token, easy to conflate by name alone:
  - *Notification bot* (`communication/telegram/`, `TELEGRAM_TOKEN`/`TELEGRAM_CHAT_ID`): one-way outbound alerts to the shared admin group via the Bot API — Mollie payments, login-blocked, new-device, role-changed, and (off by default) new students and new Mollie customers. A second, personal channel exists on the same module: `TELEGRAM_EMAIL_NOTIFY_CHAT_ID` pings one admin's own private chat with the bot when a new non-spam email arrives (`notifyNewEmail`, wired into `communication/email/email-imap.service.ts`'s IMAP sync) — deliberately not posted to the shared group. Every type has an ADMIN-controlled switch (`TelegramNotificationSetting`, `GET`/`PUT /api/v1/telegram-notifications`, page `client/src/pages/NotificationsPage/` at `/notifications`); a switch change is itself announced to the group and cannot be disabled. Contract and "how to add a type": [`docs/spec/DDC_CRM_TELEGRAM_NOTIFICATIONS_SPEC.md`](docs/spec/DDC_CRM_TELEGRAM_NOTIFICATIONS_SPEC.md).
  - *Telegram Login* (`auth/telegram/`, `TELEGRAM_OIDC_CLIENT_ID`/`TELEGRAM_OIDC_CLIENT_SECRET`/`TELEGRAM_OIDC_REDIRECT_URI`): OIDC Authorization Code + PKCE against `oauth.telegram.org`, ADMIN-only additional login provider. Configured via a bot's Login Widget in `@BotFather` (OpenID Connect mode, not the legacy hash-based widget). Inert (button/widget hidden) until all three env vars are set. `AuthIdentity.providerUserId` here is an opaque OIDC `sub`, **not** the Bot API numeric user id — see [identity.md](docs/domain/identity.md).
  - *Telegram Mini App* (`auth/telegram-miniapp/` + `telegram-admin-bot/` + `client/telegram-mini-app/`, `TELEGRAM_MINIAPP_URL`/`TELEGRAM_BOT_USERNAME`): a small dependency-free TS/esbuild web app (Dashboard/student search/new-student screens) reusing the existing REST API, authenticated via a `X-Telegram-Init-Data` header (HMAC-verified against `TELEGRAM_TOKEN`, distinct `AuthProvider.TELEGRAM_MINIAPP` identity — see [identity.md](docs/domain/identity.md)). Production is served by the **frontend** nginx container (`client/build/telegram-admin/`, built by `client/package.json`'s `build:prod`), not the backend's own `express.static` copy (`server/public/telegram-admin/`, dev-only). The bot's `/start` opens it via `web_app` inline buttons in a private chat, or a `url` deep-link into a private chat first if `/start` came from a group — Telegram rejects `web_app` buttons everywhere except a private 1:1 chat with the bot. Design/rollout history: `docs/superpowers/specs/2026-09-23-telegram-mini-app-design.md`, `docs/superpowers/plans/2026-09-23-telegram-mini-app.md`.
- **Ollama (local LLM)**: `OllamaLlmClient` in `modules/ai-email-assistant/` is the narrow LLM boundary; no application code may hard-code a model name. Classification uses `OLLAMA_MODEL` (default `qwen3:0.6b`), embeddings use `OLLAMA_EMBEDDING_MODEL` (default `bge-m3`). Compose runs an `ollama` service with env-driven memory/CPU limits; production must not enable any `AI_EMAIL_*_ENABLED` / `KNOWLEDGE_SYNC_ENABLED` flag until `scripts/benchmark-ollama*.sh` measurements exist for the real host.

## Security Context

- Cookie sessions + CSRF double-submit
- Argon2id password hashing
- 2FA email flow on login
- Telegram OIDC login (ADMIN-only, must be explicitly linked first — never bypasses 2FA)
- Telegram Mini App auth (`X-Telegram-Init-Data` header, HMAC-SHA256-verified against
  `TELEGRAM_TOKEN`, distinct `AuthProvider.TELEGRAM_MINIAPP` identity, ADMIN-only, CSRF-exempt
  since it carries no session cookie — its own HMAC signature is the authenticity proof)
- Endpoint-specific rate limiting
- Security audit event log
- AI email assistant: local LLM only (no cloud), the LLM has no SMTP/DB/filesystem/shell tools,
  and **no email is ever sent without explicit human approval** — Telegram approval actions are
  actor-allowlisted (`TELEGRAM_APPROVER_IDS`) and version-locked against the draft, so a stale
  approval can't act on a newer draft.
- Planned security hardening is tracked locally (gitignored `docs/roadmap/AUTH_SECURITY_ROADMAP.md`), not part of the repo.

## Infrastructure Context

- Production: single Docker Compose stack on VPS.
- Full topology in `docs/spec/DOCKER_PRODUCTION_DEPLOYMENT.md`.
- `docker-compose.yml` (MySQL + Redis, shared), `docker-compose.dev.yml`, `docker-compose.prod.yml`.
- E2E uses `docker-compose.e2e.yml` under the separate `hhdc-e2e` compose project, with its own
  MySQL container, volume, port, reset, and seed. It must never be combined with deploy compose files.
- Container names driven by env values (`DB_CONTAINER_NAME`, etc.).
- Deploy is manual (`npm run deploy` from repo root), not GitHub Actions.
- GitHub Actions: CI only (`ci.yml`: `client-checks`/`server-checks`/`docs-links`/`skylos-check`; and
  `e2e.yml`: isolated Playwright Chromium suite). Neither workflow deploys production.
- `skylos-check` is informational (Phase A), not a required status check.
  It runs `scripts/check-skylos.sh`: a diff-scan against the target branch. Exit 2 with empty
  output means the dependency scan was `incomplete` (a lockfile entry Skylos cannot parse),
  not that findings exist. Accepted dependency vulnerabilities without an upstream fix live in
  `dependency_baseline` inside `.skylos/baseline.json`, read from the target branch via
  `--baseline-ref`.

## Important Existing Decisions

- Only one supported production deploy path: Docker Compose. No PM2, no other Docker stacks.
- No parallel production deploy paths.
- Graphify and docs generation are dev-only — not wired into production deploy.
- GitHub ruleset blocking direct pushes to `main` is planned but not yet created (as of CI/CD rebuild).
- Old `deploy.yml` (PM2, frontend only, broken) has been deleted.
- ADRs recorded in `docs/adr/` (gitignored, local only): branch protection rationale, manual deploy rationale.
- AI email assistant defaults to safe: every worker flag (`AI_EMAIL_CLASSIFICATION_ENABLED`,
  `AI_EMAIL_DRAFT_ENABLED`, `AI_EMAIL_SEND_ENABLED`, `KNOWLEDGE_SYNC_ENABLED`) is `false`, and
  production enabling requires real-host benchmark evidence first. Sending is approved-only and
  idempotency-keyed — retries can never double-send.
- Draft reply language is enforced deterministically (computed from message language, not parsed
  from model JSON); only the body text comes from the LLM.
- The only supported sending path is the existing IMAP/SMTP mailbox that received the original
  message (`replyToMessage`), preserving thread headers.

## Related Documentation

- [README.md](README.md) — setup, commands, project overview
- [AGENTS.md](AGENTS.md) — agent operating contract
- [Docker Production Deployment](docs/spec/DOCKER_PRODUCTION_DEPLOYMENT.md)
- [Graphify Workflow](docs/spec/GRAPHIFY_WORKFLOW.md)
- [E2E testing](docs/E2E_TESTING.md) — isolated test topology, commands, fixture, and test authoring
- [Schema docs](docs/schema.md)
- [Local AI Email Assistant — Technical Specification](docs/spec/DDC_LOCAL_AI_EMAIL_ASSISTANT_SPEC.md)
- [Local AI Email Assistant Operations](docs/spec/DDC_LOCAL_AI_EMAIL_ASSISTANT_OPERATIONS.md)
- [Skylos CI spec](docs/spec/DDC_CRM_SKYLOS_CI_SPEC.md)
- [Skylos findings checklist](docs/spec/SKYLOS_FINDINGS_CHECKLIST.md) — code findings by wave
- [Skylos SCA checklist](docs/spec/SKYLOS_SCA_CHECKLIST.md) — why `skylos-check` was red, dependency fixes, baseline
