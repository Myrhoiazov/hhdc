# Backend Modular Refactoring — Full Service Orchestration

## Source of Truth

Before starting, read:

- `AGENTS.md`
- `docs/spec/BACKEND_MODULAR_REFACTORING_SPEC.md`

Reference implementation:

- `server/src/modules/comments/`

The `Comments` module is the verified reference for the migration workflow.

Do not blindly copy its files or structure.

Use it as an example of:

- module boundaries;
- structural migration;
- API response shaping;
- Prisma projections;
- DTO usage when justified;
- contract tests;
- verification workflow.

---

# Goal

Progressively migrate the remaining backend from the current layer-first structure into feature/domain-based modules.

Current legacy structure may include:

```text
server/src/
├── controllers/
├── services/
├── routes/
├── models/
├── helpers/
├── middlewares/
├── schemas/
├── types/
└── ...
```

Target direction:

```text
server/src/
├── modules/
├── integrations/
├── common/
├── db/
├── config/
├── app.ts
└── index.ts
```

The migration must preserve existing behavior unless an explicit task authorizes a behavior change.

---

# Critical Rule

## One module at a time

Never refactor the entire backend in one pass.

For each module:

```text
discover
→ plan
→ structural migration
→ verify
→ API/data analysis
→ optimize contract
→ tests
→ verify
→ report
```

Only after one module is complete may you continue to the next module.

Do not mix multiple business modules in the same implementation batch unless a shared dependency makes it unavoidable.

---

# Token / Context Rules

Minimize LLM context at all times.

Use:

```text
Graphify
→ rg
→ targeted read
→ full file read only when required
```

Rules:

- Do not read all of `server/src`.
- Do not load all specs.
- Do not read every test.
- Do not reread unchanged files unnecessarily.
- Prefer `git diff` after edits.
- Read the smallest useful range.
- Preserve correctness over token savings when more context is genuinely required.

---

# Initial Discovery

Before modifying code, determine the remaining legacy modules.

Use Graphify and `rg` to identify business areas represented across:

- controllers;
- services;
- routes;
- schemas;
- models;
- types;
- tests;
- Prisma usage.

Do not classify files only by filename.

Determine actual ownership and dependencies.

Produce a candidate migration order.

---

# Migration Order

Prefer low-coupling modules first.

General preference:

```text
simple isolated modules
→ medium business modules
→ shared/domain modules
→ billing/integrations
→ users
→ auth
```

Avoid starting with the most coupled module.

Use actual dependency analysis to determine the order.

If a safer order differs from the specification examples, explain why.

---

# Module Checklist

For EACH module execute the following checklist.

## PHASE 1 — Discovery

Do not modify code yet.

### Find all relevant files

Use Graphify first.

Then confirm with `rg`.

Find:

- controller;
- service;
- routes;
- schemas;
- types;
- Prisma access;
- tests;
- helpers;
- middleware dependencies;
- imports from other modules;
- modules importing this code;
- external integrations.

Create a minimal dependency map.

Example:

```text
route
→ controller
→ service
→ Prisma

service
→ email integration
→ auth helper
```

### Identify ownership

For every reusable dependency classify it as:

```text
feature-specific
domain-shared
application common
external integration
database infrastructure
```

Do not move shared code yet unless necessary for the current module.

### Baseline verification

Before changes:

- identify existing tests;
- identify real `package.json` scripts;
- run the narrowest useful baseline check.

If tests already fail before refactoring, report this clearly.

Do not silently fix unrelated failures.

---

## PHASE 2 — Structural Migration

Move the module into:

```text
server/src/modules/<module>/
```

Typical files MAY include:

```text
<module>.controller.ts
<module>.service.ts
<module>.routes.ts
<module>.schema.ts
<module>.types.ts
```

Only create files that are actually needed.

### During structural migration

Allowed:

- file moves;
- import path updates;
- module-local naming cleanup;
- route wiring updates required by the move.

Not allowed:

- response contract changes;
- Prisma query optimization;
- DTO introduction unless required to preserve behavior;
- business logic cleanup;
- endpoint renames;
- validation changes;
- unrelated refactors.

### Naming

When moving a file, normalize names if useful.

Example:

```text
controller.Certificates.ts
→ certificates.controller.ts
```

Do not perform repository-wide renames.

---

## PHASE 3 — Structural Verification

Run:

```text
module-specific tests
→ relevant server tests
→ typecheck/build
```

Then inspect:

```bash
git diff --stat
git diff
```

Confirm:

- routes unchanged;
- methods unchanged;
- status codes unchanged;
- request contracts unchanged;
- response contracts unchanged;
- no unrelated files changed.

If structural migration is not clean, fix it before continuing.

---

## PHASE 4 — API Contract Discovery

After structural migration is stable, inspect the module's API behavior.

For each endpoint determine:

- request shape;
- Prisma query;
- fields loaded;
- relations loaded;
- response shape;
- frontend consumers.

Use targeted frontend search only.

Do not read the entire client.

Search specific:

- endpoint paths;
- thunk/query names;
- response field names;
- selectors/components using the result.

Create an inventory:

| Endpoint | Prisma query | Current response | Frontend-used fields | Extra fields |
|---|---|---|---|---|

Do not remove a field only because it appears unnecessary on the backend.

Confirm frontend usage first.

---

## PHASE 5 — Data Projection

Where safe, replace broad Prisma reads with minimal projections.

Prefer:

```ts
select: {
  ...
}
```

instead of full model loads.

Avoid unrestricted:

```ts
include: {
  relation: true
}
```

when only a subset is needed.

### Rules

- query only fields required by the use case;
- query only nested relation fields required by the use case;
- do not expose internal persistence fields accidentally;
- do not optimize queries unrelated to the current module.

---

## PHASE 6 — DTO Decision

For each endpoint decide whether a DTO is useful.

Create use-case-specific DTOs only when justified.

Examples:

```text
CommentListItemDto
CertificateListDto
CertificateDetailsDto
CreateCertificateInput
```

Avoid one giant universal DTO.

Do not create DTOs merely because Comments has them.

### DTO should be considered when:

- API representation differs from Prisma shape;
- public contract needs to be explicit;
- list/details responses differ;
- persistence fields must be hidden;
- transformation is required.

### DTO may be unnecessary when:

- Prisma projection already exactly matches the stable API response;
- adding a DTO creates no meaningful boundary.

Explain the decision either way.

---

## PHASE 7 — Mapper Decision

Add a mapper only when actual transformation is required.

Example:

```text
firstName + lastName
→ fullName
```

Do not add pass-through mappers that only copy every field unchanged.

---

## PHASE 8 — Reusable Code Review

For reusable logic discovered during the module migration:

### Feature-specific

Keep inside:

```text
modules/<feature>/
```

### Domain-shared

Move only when justified to:

```text
modules/<domain>/shared/
```

### Global domain-agnostic

Move only when justified to:

```text
common/
```

### External providers

Keep or move toward:

```text
integrations/
```

Do not turn `common/utils` into a dumping ground.

---

## PHASE 9 — Module Boundary Review

Check cross-module imports.

Avoid:

```ts
import { x } from "@/modules/payments/internal/payment.repository";
```

Prefer a public module API where appropriate:

```text
modules/payments/index.ts
```

Expose only what other modules actually need.

Do not create `index.ts` automatically for every module.

---

## PHASE 10 — Contract Tests

Add only high-value tests.

Use the existing test framework and patterns.

Do not introduce a new test framework.

Prefer tests protecting:

- response shape;
- Prisma projection;
- critical service behavior;
- authorization mapping;
- query parameter behavior where relevant.

Do not chase coverage percentage.

### Projection tests

Where useful, protect against regression from:

```text
minimal select
```

back to:

```text
full model / broad include
```

But prioritize observable contract over implementation details.

---

## PHASE 11 — Final Verification

For each completed module run the narrowest useful sequence:

```text
module tests
→ server tests
→ typecheck/build
→ server CI
→ root CI
```

Use actual scripts from `package.json`.

Do not invent commands.

Then:

```bash
git diff --stat
git diff
```

Check:

- no unrelated changes;
- no accidental API behavior changes;
- no Prisma migration unless explicitly authorized;
- no cross-module cleanup outside scope.

---

# Stop Conditions

Stop the current module and report before proceeding if:

1. migration requires public API behavior changes;
2. database schema changes are required;
3. a Prisma migration is required;
4. circular dependency is discovered;
5. ownership of shared logic is unclear;
6. baseline tests already fail;
7. the module cannot be isolated safely;
8. a cross-module change would substantially increase scope;
9. frontend usage of a response field cannot be determined safely.

Do not solve these silently.

---

# PR Strategy

Prefer one logical PR per module migration.

If a module is large, split into stacked PRs:

```text
PR A — structural migration
PR B — API projections / DTO
PR C — contract tests
```

For smaller modules, these phases may be combined if the diff remains easy to review.

Do not create massive PRs spanning unrelated modules.

---

# Commit Rules

Keep commits focused.

Examples:

```text
refactor(certificates): move module into modules/certificates

refactor(certificates): project API responses to used fields

test(certificates): add contract tests
```

Avoid unrelated formatting churn.

---

# Reporting After Each Module

After completing one module, report:

## Module

Name.

## Files moved

Old → new.

## Dependency map

Short version.

## API inventory

Endpoints and contracts.

## Data optimization

What fields/relations stopped being loaded.

## DTO decision

Added / not added and why.

## Shared code

Any ownership decisions.

## Tests

Added tests and results.

## Verification

Commands and pass/fail result.

## Behavior

Confirm whether public behavior changed.

## Follow-ups

List unrelated or deferred issues.

## Next candidate

Recommend the next module and explain why.

---

# Progress Checklist

Maintain a migration checklist based on actual discovery.

Example:

```text
[x] Comments
[ ] Certificates
[ ] Schedule
[ ] Companies
[ ] Users
[ ] Billing / Invoices
[ ] Billing / Payments
[ ] Billing / Subscriptions
[ ] Email
[ ] Auth
```

Do not mark a module complete until all required phases for that module are finished.

---

# Important Principle

`Comments` is a reference workflow, not a copy template.

Do not force every module to contain:

```text
controller
service
repository
dto
mapper
select
index
```

Create only abstractions justified by that module.

Architecture should emerge from actual needs.

---

# Final Goal

The completed backend should progressively converge toward:

```text
server/src/

├── modules/
│   ├── ...
│
├── integrations/
│   ├── ...
│
├── common/
│   ├── ...
│
├── db/
├── config/
├── app.ts
└── index.ts
```

with:

- clear module ownership;
- limited cross-module coupling;
- minimal Prisma queries;
- explicit API contracts where useful;
- reusable code in the correct ownership layer;
- high-value contract tests;
- no broad exposure of Prisma entities;
- preserved production behavior.

---

# Execution Mode

Begin by:

1. inspecting the current remaining backend structure;
2. producing the candidate module list;
3. producing a recommended migration order;
4. selecting the first uncompleted module;
5. executing its checklist completely;
6. stopping after that module;
7. reporting results and recommending the next module.

DO NOT automatically migrate every module in one continuous run.

The agent must stop after each completed module so the human can review and approve the next migration.
