# HHDC Admin — Project Context

The target contract is the [Event & Talent CRM V1 specification](docs/spec/event-talent-crm-v1-spec.md). This project is being migrated to PostgreSQL and a new empty database, as explicitly requested by the owner. Preserve existing MySQL storage; no old data is imported.

## Product

HHDC Admin is an internal administration workspace for High Heels Dance Camp, a dance event. It supports event operations: client and contact records, event communications, email, payments, content and documents, users, roles, and settings.

Person is the central identity. CUSTOMER, PARTICIPANT, CHOREOGRAPHER and STAFF are roles of the same Person. EventChoreographer is an event assignment, Registration is participation, and ticket buyers can differ from ticket holders. School students, classes, lessons, attendance and branches are obsolete workflows to remove.

## Domain language

| Term | Meaning |
|---|---|
| Event | A High Heels Dance Camp edition or related event activity. |
| Person | One identity with multiple business roles; replaces legacy Client. |
| Registration | A Person participating in an Event. |
| EventChoreographer | A Person with the CHOREOGRAPHER role assigned to an Event. |
| Order / Ticket | Normalized ticketing records; buyer and holder are separate relationships. |
| Event edition | A dated camp instance with its venue, programme, capacity, and operational settings. |
| Communication | An inbound or outbound email, note, template, or team conversation connected to event work. |
| Payment | A transaction, invoice, refund, or payment-provider operation for an event client. |
| Admin user | A person with a role and permissions in the internal workspace. |

Use these terms in new UI, API names, tests, and documentation. Avoid school vocabulary even when the subject is dance. If an inherited module still uses an old name, document the migration boundary instead of copying the name into new features.

## Current implementation

The repository is a TypeScript monorepo:

- `client/` — React 19, Redux Toolkit, custom webpack, SCSS Modules, and i18next.
- `server/` — Express 5, Prisma 6, Zod validation, and domain modules under `server/src/modules/`; target storage is PostgreSQL with UUID, TIMESTAMPTZ, JSONB and exact Decimal money.
- `docker/` — development and production images and nginx configuration.
- `e2e/` — Playwright setup and browser flows.
- `plugins/` — local ESLint plugins.

The codebase is being migrated from an earlier DDC school-oriented product. Remove legacy clients, school schedule, billing, Mollie, Telegram and Instagram runtime paths and their unused dependencies as replacements become operational. Preserve and adapt useful email, AI, knowledge and dashboard capabilities. Do not hide obsolete code with TypeScript exclusions. The first milestone is login → dashboard → Person → role → Event → choreographer assignment → registration → Activity/Audit.

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

Existing email transports and AI adapters are reusable migration inputs. Target providers are Weeztix, Gmail, OpenAI and Ollama behind adapters; credentials are encrypted and never returned through normal APIs. AI drafts require persisted human approval before sending. Knowledge uses GLOBAL/EVENT scopes and hybrid PostgreSQL/pgvector retrieval. Activity and immutable AuditLog are separate histories. E2E uses an isolated PostgreSQL database and synthetic data.

## Documentation

The committed technical references are [README.md](README.md), [AGENTS.md](AGENTS.md), and [Graphify Workflow](docs/spec/GRAPHIFY_WORKFLOW.md). Task plans are working material and are not product truth.
