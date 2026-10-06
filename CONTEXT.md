# HHDC Admin — Project Context

This is the short context that agents should use for new work. It describes the target product, while explicitly marking inherited implementation that still needs migration.

## Product

HHDC Admin is an internal administration workspace for High Heels Dance Camp, a dance event. It supports event operations: client and contact records, event communications, email, payments, content and documents, users, roles, and settings.

It is an event administration product, not a dance-school CRM. There are no new student, class, lesson, attendance, choreographer, or branch workflows.

## Domain language

| Term | Meaning |
|---|---|
| Event | A High Heels Dance Camp edition or related event activity. |
| Client | A participant, lead, contact, partner, supplier, or other event-facing person or organisation. |
| Event edition | A dated camp instance with its venue, programme, capacity, and operational settings. |
| Communication | An inbound or outbound email, note, template, or team conversation connected to event work. |
| Payment | A transaction, invoice, refund, or payment-provider operation for an event client. |
| Admin user | A person with a role and permissions in the internal workspace. |

Use these terms in new UI, API names, tests, and documentation. Avoid school vocabulary even when the subject is dance. If an inherited module still uses an old name, document the migration boundary instead of copying the name into new features.

## Current implementation

The repository is a TypeScript monorepo:

- `client/` — React 19, Redux Toolkit, custom webpack, SCSS Modules, and i18next.
- `server/` — Express 5, Prisma 6, MySQL 8, Zod validation, and domain modules under `server/src/modules/`.
- `docker/` — development and production images and nginx configuration.
- `e2e/` — Playwright setup and browser flows.
- `plugins/` — local ESLint plugins.

The codebase is being migrated from an earlier DDC school-oriented product. Legacy clients, schedule, invoice, Mollie, Telegram, and AI-email modules can still exist in the implementation. They are compatibility surfaces, not the target domain model. New work must follow the HHDC event language and should avoid adding new school-specific dependencies.

## Client architecture

`client/src` follows Feature-Sliced Design:

```text
app -> pages -> widgets -> features -> entities -> shared
```

Use public slice APIs, the `@/` alias, Redux `DynamicModuleLoader` for optional reducers, `$api` for unauthenticated calls, and `$apiPrivate` for cookie-session and CSRF-protected calls. UI text belongs in i18next. Use SCSS Modules and the `-redesigned` theme tokens described in [.claude/rules/code-style.md](.claude/rules/code-style.md).

## Server architecture

Server modules follow:

```text
modules/<name>/<name>.routes.ts -> <name>.controller.ts -> <name>.service.ts
```

Authentication, users, clients, company/settings, communication, email, payments, transactions, search, and health are existing areas. Keep validation at API boundaries and keep business rules in services. Do not make a legacy module the source of new event terminology without an explicit migration decision.

## Integrations and operations

Email uses IMAP/SMTP configuration. Payment-provider and Telegram integrations are inherited capabilities and must be changed only when the current event workflow requires them. Local development uses Docker Compose and a local MySQL database; never use development data for E2E runs.

## Documentation

The committed technical references are [README.md](README.md), [AGENTS.md](AGENTS.md), and [Graphify Workflow](docs/spec/GRAPHIFY_WORKFLOW.md). Task plans are working material and are not product truth.
