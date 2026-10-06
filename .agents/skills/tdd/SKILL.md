---
name: tdd
description: Test-driven development for HHDC Admin feature and bugfix work. Use for behavior changes in client components/slices/services or server endpoints/services/schemas.
---

# HHDC Admin Test-Driven Development

TDD is the red → green loop. This skill is the reference that makes that loop produce tests worth keeping: what a good test is, where tests go, the anti-patterns, and the rules of the loop. Every section applies on every cycle — consult them before and during the loop, not after.

When exploring the codebase, read `AGENTS.md` and `CONTEXT.md` so test names and checks match the project's domain language.

## What a good test is

Tests verify behavior through public interfaces, not implementation details. Code can change entirely; tests shouldn't. A good test reads like a specification — "admin can search event clients by name" tells you exactly what capability exists — and survives refactors because it doesn't care about internal structure.

See [tests.md](tests.md) for examples and [mocking.md](mocking.md) for mocking guidelines.

## HHDC Admin Seams

A seam is the public boundary where behavior can be observed without reaching into internals. For this monorepo, prefer:

Client (`client/`, Jest):

- Redux slice reducers and selectors in `client/src/**/model/`.
- Component behavior through the public slice API (via `index.ts`, not deep imports).
- API helpers in `shared/api`.

Server (`server/`, Node built-in test runner via `ts-node/register`):

- Service functions in `server/src/services/` (e.g. `service.Password.test.ts`).
- Controller/route behavior where integration matters.
- Validation schemas in `server/src/schemas/`.

Prisma: verify model/query behavior through the service that owns the data access, not by constructing raw queries.

For planned work, record seams in `tasks/plan.md`. For tiny work, choose the narrowest obvious seam and state it in the final verification. Ask the user only when multiple seams would materially change the implementation.

## Anti-patterns

- **Implementation-coupled** — mocks internal collaborators, tests private methods, or verifies through a side channel (querying the database instead of calling the service the way the client/route would). The tell: the test breaks when you refactor but behavior hasn't changed.
- **Tautological** — the assertion recomputes the expected value the way the code does (`expect(add(a, b)).toBe(a + b)`, a snapshot derived by hand the same way, a constant asserted equal to itself), so it passes by construction and can never disagree with the code. Expected values must come from an independent source of truth — a known-good literal, a worked example, the spec.
- **Horizontal slicing** — writing all tests first, then all implementation. Bulk tests verify _imagined_ behavior: you test the _shape_ of things rather than user-facing behavior, the tests go insensitive to real changes, and you commit to test structure before understanding the implementation. Work in **vertical slices** instead — one test → one implementation → repeat, each test a **tracer bullet** that responds to what the last cycle taught you.

## Rules of the loop

- **Red before green.** Write the failing test first, then only enough code to pass it. Don't anticipate future tests or add speculative features.
- **One slice at a time.** One seam, one test, one minimal implementation per cycle.
- **Refactoring is not part of the loop.** It belongs to the review stage (see the `code-review` skill), not the red → green implementation cycle.

## Running the tests

Client: run a single file with `npx jest path/to/File.test.tsx`, or `npm test` for the full suite, from `client/`.

Server: there is no single server-wide test command. Run the domain script that matches the changed area from `server/`:

```bash
npm run test:auth
npm run test:mollie
npm run test:search
npm run test:email
npm run test:payment-reminders
```

Or invoke one file directly:

```bash
node --test -r ts-node/register src/services/service.Password.test.ts
```

## When Tests Are Not Available

Some surfaces (e.g. certain SCSS/layout behavior) may not have a true automated harness. When a true failing automated test is unavailable, create the tightest executable check available before implementation:

- `npm run lint:ts` and `npm run lint:scss` for the changed client files.
- `npm run build` for the server type check.
- A browser assertion for rendered UI behavior (see `e2e-test`).
- A focused `rg` scan for brand, selector, or contract expectations.

Record the limitation and keep the implementation smaller.
