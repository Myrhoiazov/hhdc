# Agent Prompt — HHDC Admin Telegram Admin Bot

You are implementing the Telegram Admin Bot described in:

`docs/spec/TELEGRAM_ADMIN_BOT_SPEC.md`

Read that specification first and treat it as the functional contract.

## Mission

Add a small, secure Telegram operational interface to the existing HHDC Admin.

This is **NOT** a second CRM and **NOT** a Telegram clone of the admin panel.

The approved scope is limited to:

- compact dashboard;
- minimal student search/select;
- create student;
- create/link Mollie Customer;
- initiate/create Mollie mandate using the existing supported flow;
- create Mollie subscription;
- create one-time Mollie payment/payment link.

Everything else remains in the web admin panel unless technically required to support one of these flows.

---

## Critical Engineering Rule

**Reuse before creating.**

Telegram must be an adapter over existing application/domain services.

Do not implement business logic directly in Telegram handlers.

Do not access Prisma/database repositories directly from Telegram handlers when an appropriate service/use case exists.

Do not implement separate Mollie logic for Telegram.

Do not create duplicate domain models, validation rules or payment calculations.

If a reusable application service is missing, make the smallest appropriate refactor/addition in the existing backend layer first and then consume it from Telegram.

---

## Required Workflow

### 1. Discovery only — no implementation yet

Before modifying code, inspect the repository and produce an implementation plan.

Use the project's normal context-efficient discovery workflow:

1. Graph/symbol tooling if available and useful.
2. `rg`/targeted search.
3. Read only relevant ranges/files.
4. Full-file reads only when required.
5. Inspect `git diff` after changes rather than repeatedly rereading files.

Do not load the entire repository or all documentation into context.

Locate and document:

- server architecture/module boundaries;
- existing Telegram authentication/integration, if any;
- CRM user model and RBAC;
- Telegram ↔ CRM account linking, if already implemented;
- student entity and student creation flow;
- student search flow;
- dashboard service/query definitions;
- Mollie client/service/adapter;
- Mollie Customer creation/linking;
- mandate implementation;
- subscription implementation;
- one-time payment/payment-link implementation;
- Mollie webhooks/payment synchronization;
- audit logging;
- validation conventions;
- error handling/logging conventions;
- localization conventions;
- existing test conventions.

Search for existing functionality before proposing anything new.

### 2. Gap analysis

For every requested feature classify it as:

- `REUSE` — existing service can be called as-is;
- `REFACTOR` — logic exists but must be extracted/reused cleanly;
- `ADD` — capability genuinely does not exist;
- `OUT OF SCOPE` — not required by the specification.

Create a concise dependency map such as:

```text
Telegram Dashboard -> existing DashboardService
Telegram Create Student -> existing StudentService.create(...)
Telegram Mollie Customer -> existing MollieCustomerService
Telegram Mandate -> existing Mandate flow
Telegram Subscription -> existing SubscriptionService
Telegram Payment Link -> existing PaymentService/MollieService
```

Use actual repository symbols after discovery; do not invent names.

### 3. Plan before code

Provide a step-by-step implementation plan with:

- files/modules to modify;
- files/modules to add only when necessary;
- existing services being reused;
- required refactors;
- data/schema changes, if any;
- security/RBAC approach;
- conversation-state approach;
- idempotency strategy;
- audit strategy;
- tests to add/update;
- risks/open questions.

Stop after the plan if the current task/request is explicitly plan-only. Otherwise proceed only once the plan is internally consistent with the repository.

---

## Implementation Constraints

### Scope

Do not add Telegram interfaces for groups, schedules, teachers, attendance, full customer editing, full payment history, settings, exports or unrelated CRM functionality.

Student search is allowed only as supporting navigation for approved operations.

### Security

Do not trust membership in a private Telegram group as authorization.

Every protected operation must resolve Telegram identity to an approved active CRM user and enforce existing permissions/RBAC.

Reuse existing Telegram account linking if available.

Never expose secrets or raw internal errors.

### Financial operations

Mollie Customer, mandate, subscription and payment creation must use existing backend/Mollie services and business rules.

Financial write actions require a confirmation step.

Protect against retries/double-clicks/duplicate creation using existing idempotency/domain mechanisms where available.

Do not treat Telegram state as proof that a payment succeeded. Mollie/webhook synchronization remains authoritative.

### Data

CRM/database remains the source of truth.

Do not create a Telegram copy of student/payment data.

Persist only Telegram-specific state/mapping when genuinely required.

### UX

Prefer inline keyboards and short guided flows.

Every multi-step flow should support Back/Cancel where sensible.

Keep messages compact and suitable for administrators on mobile devices.

Avoid posting unnecessary personal data into a shared Telegram group.

### Code quality

Follow existing project architecture and naming.

Do not introduce a new framework or abstraction without a concrete need.

Keep Telegram transport concerns separate from application/domain logic.

Keep styles/formatting/localization consistent with existing project conventions.

---

## Required Initial Deliverable

Before significant implementation, report:

```text
1. Existing architecture discovered
2. Relevant existing modules/services
3. REUSE / REFACTOR / ADD matrix
4. Proposed Telegram module boundaries
5. Security/auth flow
6. Flow-state approach
7. Mollie operation reuse map
8. Files expected to change
9. Test plan
10. Risks/questions
```

Do not assume service names or database fields. Use actual repository findings.

---

## Verification

Run the narrowest useful checks first:

```text
specific affected tests
→ module/domain tests
→ typecheck/lint
→ broader CI only when appropriate
```

Verify at minimum:

- unauthorized user cannot access CRM data;
- authorized admin can use the bot;
- dashboard values use the same definitions as web CRM;
- student creation uses existing validation;
- existing Mollie Customer is not duplicated;
- mandate flow follows the existing Mollie implementation;
- subscription prerequisites are enforced;
- financial actions require confirmation;
- duplicate/retry scenarios are safe;
- payment link is created through the existing payment layer;
- Mollie failures produce safe Telegram errors;
- write operations are audited;
- existing web CRM flows remain working.

After implementation inspect `git diff` and explicitly check for accidental scope expansion or duplicated business logic.

---

## Final Report

At completion report:

1. What was implemented.
2. Which existing services were reused.
3. Which services were refactored and why.
4. Any schema/config/env changes.
5. Security and authorization behavior.
6. Tests/checks executed and results.
7. Remaining limitations/TODOs.
8. Any deviation from `TELEGRAM_ADMIN_BOT_SPEC.md` and the reason.

Do not claim completion if critical tests are failing or Mollie operations bypass existing CRM business logic.
