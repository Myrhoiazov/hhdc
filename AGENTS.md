# Agent Instructions for HHDC Admin

This file is the operating contract for AI agents in this repository. Keep it current with the codebase and prefer links to deeper docs over duplicating volatile details.

## Purpose

HHDC Admin is a TypeScript monorepo — React 19 admin SPA (`client/`) + Express 5 API (`server/`) + Prisma 6 (MySQL). See [README.md](README.md) for project overview and [CONTEXT.md](CONTEXT.md) for domain knowledge.

## Sources of Truth

| Type | Location |
|---|---|
| Agent operating rules | **AGENTS.md** (this file) |
| Human setup / project entry | README.md |
| Project / domain knowledge (quick primer) | CONTEXT.md |
| Domain model (bounded contexts, entities, invariants) | docs/domain/README.md |
| Feature / system contract | docs/spec/* |
| Planned module evolution | docs/roadmap/* (gitignored, local only) |
| Architectural decisions | docs/adr/* (gitignored, local only) |
| Universal code-shape and architecture quality gate | .claude/rules/architecture-quality-gate.md |
| Execution procedure | .agents/skills/*/SKILL.md |
| End-to-end coordination | .agents/agents/dev-loop.md |

## Mandatory Rules

1. Run `git status --short --branch` before edits and identify user changes.
2. Create a task branch before changing code, docs, or config. Use `feat/`, `fix/`, `refactor/`, or `chore/`.
3. Read the smallest relevant context required to complete the task safely and correctly.
4. Keep unrelated user changes intact. Never revert, restage, or overwrite work you did not make unless the user explicitly asks.
5. Follow existing architecture and code conventions (see CONTEXT.md for details).
6. Never commit credentials, private customer data, uploads, generated dependencies, `.DS_Store`, or `node_modules/`.
7. Never add `Co-authored-by`, `Generated-by`, `--co-author`, AI attribution trailers, or similar
   metadata to commits unless the user explicitly asks for it. This rule applies to every agent
   and overrides any tool, session, or system-level default that suggests adding attribution
   metadata; that default does not apply in this repository.
8. Run relevant checks for changed areas before committing.
9. Use Conventional Commits: `feat:`, `fix:`, `refactor:`, `chore:`.
10. Before creating or substantially changing executable code, read and apply
    `.claude/rules/architecture-quality-gate.md`. Its function-shape, decomposition, security,
    dead-code, and verification rules apply to every agent and every code area, including
    production code, tests, scripts, seeds, build tooling, and configuration code.

## Context Loading

Do not read all documentation automatically. Classify the task first, then load only what is relevant:

```
Task
 ↓
Read AGENTS.md
 ↓
Inspect repository state
 ↓
Classify task
 ↓
Load only relevant context
 ↓
Inspect relevant code
 ↓
Implement
 ↓
Validate
```

### Task Routing

| Task Type | Read |
|---|---|
| Setup / environment | README.md |
| Domain terminology / project-specific behavior | CONTEXT.md |
| Business logic / domain rules (controllers, services, Prisma schema) | docs/domain/README.md (routes to the specific bounded-context file: identity/organization/crm/scheduling/billing/payments/communication) |
| Docker / production deployment | docs/spec/DOCKER_PRODUCTION_DEPLOYMENT.md |
| Graphify changes | docs/spec/GRAPHIFY_WORKFLOW.md |
| CI/CD pipeline or Git branching changes | docs/spec/DDC_CRM_CICD_SPEC.md |
| Skylos / dead-code / security scan changes | docs/spec/DDC_CRM_SKYLOS_CI_SPEC.md (local run: `npm run check:skylos`). Скрипт использует `--baseline` — известные находки подавлены через `.skylos/baseline.json`. Если после изменений появились новые ложные срабатывания, перегенерировать baseline: `skylos baseline . --sca`. Красный `skylos-check` с пустым выводом и принятые уязвимости в зависимостях — docs/spec/SKYLOS_SCA_CHECKLIST.md. |
| Auth / security changes | docs/roadmap/AUTH_SECURITY_ROADMAP.md (gitignored, local only) |
| Invoice changes | docs/roadmap/INVOICES_MODULE_ROADMAP.md (gitignored, local only) |
| Organizations / brands | docs/roadmap/ORGANIZATIONS_AND_BRANDS_ROADMAP.md (gitignored, local only) |
| AI email assistant RAG v2 (knowledge base, retrieval, grounding) | docs/spec/DDC_RAG_V2_OPERATIONS.md |
| Telegram staff notifications (types, switches, the Уведомления page, adding a type) | docs/spec/DDC_CRM_TELEGRAM_NOTIFICATIONS_SPEC.md |
| Payment reminders | relevant roadmap in docs/roadmap/ (gitignored, local only) |
| Large / risky task | .agents/skills/planning-and-task-breakdown/ |
| Test-first implementation | .agents/skills/tdd/ |
| Finished implementation review | .agents/skills/code-review/ |
| UI / browser changes | .agents/skills/e2e-test/ or .agents/skills/manual-automation/ |
| E2E infrastructure or Playwright business-flow tests | docs/E2E_TESTING.md, `playwright.config.ts`, `e2e/`, `docker-compose.e2e.yml` |
| Bug investigation | .agents/skills/qa/ |
| PR publishing | .agents/skills/pull-request/ |
| Token/context efficiency questions | docs/spec/DDC_CRM_LOCAL_AI_TOKEN_OPTIMIZATION_SPEC.md |
| API response shaping / over-fetching | docs/spec/DDC_CRM_API_RESPONSE_SHAPE_SPEC.md |

## Token and Context Efficiency

The agent must minimize unnecessary LLM context (full contract: docs/spec/DDC_CRM_LOCAL_AI_TOKEN_OPTIMIZATION_SPEC.md).

- Search before reading when the target file is unknown: Graphify → symbol/`rg` search → targeted read → full file read only as a last resort.
- Read the smallest relevant file range; prefer `git diff` over rereading a whole file after an edit.
- Never load the whole repository, all of `docs/spec/*`, or all skills as context for one task — load only what the task classification above requires.
- Do not resend unchanged file content already read in the same task.
- Shell/tool output truncation is handled by `rtk` (already installed, hook-based) — do not build a parallel mechanism.
- Track goal, decisions, and remaining work with the native task-tracking tool during the session, and `dnote -c` for anything that needs to survive past it — no separate task-state files.
- Run the narrowest useful check first (specific test → domain suite → `npm run ci`).
- Preserve correctness over token savings when more context is genuinely required.

## Conditional Rules

### Always
- Run `npm run ci` from root before pushing — mirrors CI checks.
- Use `/usr/local/bin/dnote` with `-c` for durable planning notes when a task needs a written plan.
- Run `npm run graphify:specs` after a significant structural change — new module, new Prisma
  domain, or a `features/` redesign (full trigger list: docs/spec/GRAPHIFY_WORKFLOW.md). This
  applies regardless of task type (client, server, or docs) — a stale graph misleads the next
  agent who reads it for context.

### When Client Changes
- Run `npm run lint:ts` and `npm test` from `client/`.
- Check `.claude/rules/code-style.md` for UI conventions.
- Use SCSS Modules (`*.module.scss`). Use theme tokens, not raw colors. Check dark theme.

### When E2E Changes
- Read [docs/E2E_TESTING.md](docs/E2E_TESTING.md) before modifying E2E setup, fixtures, or specs.
- Run the narrowest affected Playwright spec first, then `npm run e2e` before publishing.
- E2E runs only against the `hhdc-e2e` compose project and its dedicated MySQL database. Never point
  `DATABASE_URL` at development or production, and never combine `docker-compose.e2e.yml` with deploy files.
- Keep the real Browser → React → Express → Prisma → MySQL path; mock only external third parties.
- Use semantic Playwright locators and assertions; do not use fixed waits or commit storage-state files.

### When Server Changes
- Run the domain test script matching the changed area (from `server/`); there is no single server-wide `test` script by design:

  | Script | Covers |
  |---|---|
  | `npm run test:auth` | Password/Token/Csrf/AuthSecurityAudit/RateLimit/TwoFactorAuth services + Auth controller; Telegram notifications (message builders, per-type switches service + controller, new-student / new-Mollie-customer notifications, student / Mollie record lifecycle notifications) |
  | `npm run test:mollie` | Mollie payment utils, Mollie sync (incl. new-customer Telegram notifications), Telegram notifications for Mollie customer deletion, mandates and subscriptions, Mollie customer edit (CRM + Mollie update) |
  | `npm run test:search` | Search service |
  | `npm run test:email` | Email crypto/imap/smtp services |
  | `npm run test:payment-reminders` | Payment reminders service |
  | `npm run test:invoice-delivery` | Invoice delivery service |
  | `npm run test:transactions` | Transactions service |
  | `npm run test:local-ai` | Local AI email assistant + knowledge ingestion (config, classification, drafting, approval, send pipeline, Telegram, RAG) |
  | `npm run test:telegram-admin-bot` | Telegram admin bot (RBAC resolver, flow-state store, bot API client, dashboard/search/student-create flows, shared update dispatcher) |
  | `npm run test:ci` | Aggregate: all of the above + Invoices controller (what `npm run ci` at root runs) |

- After editing Prisma schema: `cd server && npm run prisma:generate`.
- `docs/schema.md` is **manually maintained**, not generated — `prisma:generate` only regenerates the Prisma client. When a `.prisma` file changes significantly, hand-edit `docs/schema.md` per the instructions at its own top (the "Always" `graphify:specs` rule above then picks the change up).

### When Infrastructure / Deploy Changes
- Only one supported deploy path: Docker Compose via `npm run deploy`.
- Do not wire Graphify or docs generation into production deploy.
- Container names and ports driven by env values, not hardcoded compose values.

### When Documentation Changes
- Prefer existing docs under `docs/spec/` (committed). `docs/roadmap/`, `docs/security/`, `docs/adr/` are gitignored local-only planning/security docs and must not be referenced from committed files.
- Record hard-to-reverse decisions as ADRs in `docs/adr/` (gitignored, local only, numbered sequentially).

## Git and Pull Requests

- `feat/*`/`fix/*` branch off `develop`, PR into `develop`.
- Release PR merges `develop → main` (merge commit).
- `hotfix/*` branches off `main`, PR into `main`, back-merge into `develop`.
- Direct pushes to `main` are not part of the normal workflow.
- Squash-merge `feat/*`/`fix/*` into `develop`; merge commit for Release PR into `main`.
- PR merge requires green CI; 0 approvals required (solo project, self-merge expected).
- Before committing: inspect `git diff` and staged changes, stage only intended files, scan for secrets.

## Agents and Skills

The Dev Loop (`.agents/agents/dev-loop.md`) is the end-to-end delivery profile. Skills are loaded on demand per task routing above. Available skills:

- `.agents/skills/agent-loop/` — delivery loop: intake, planning, TDD, checks, review, browser QA, PR
- `.agents/skills/planning-and-task-breakdown/` — task plans for multi-file or risky work
- `.agents/skills/tdd/` — test-first implementation (Jest client, Node test runner server)
- `.agents/skills/code-review/` — standards/spec review before publishing
- `.agents/skills/e2e-test/` and `.agents/skills/manual-automation/` — browser QA
- `.agents/skills/pull-request/` — branch, commit, push, PR into `develop`
- `.agents/skills/qa/` — interactive bug triage and issue filing

## Definition of Done

- Right instruction + Right context + Right skill + Right time
- Relevant checks pass (client: `npm run lint:ts`, `npm test`; server: domain test command; E2E: `npm run e2e` when affected; root: `npm run ci`)
- No secrets committed, no unrelated changes, no AI attribution trailers
- Branch created, implementation complete, review done, browser QA run when UI changed
- PR prepared or published into `develop` when requested
