# Agent Instructions for HHDC Admin

This file is the operating contract for agents working in this repository. Keep it aligned with the codebase and link to deeper guidance instead of copying volatile details here.

## Purpose

HHDC Admin is a TypeScript monorepo with a React 19 admin SPA in `client/`, an Express 5 API in `server/`, and Prisma 6 with MySQL. Read [README.md](README.md) for setup and [CONTEXT.md](CONTEXT.md) for the current event-admin domain.

## Sources of truth

| Topic | Location |
|---|---|
| Agent operating rules | **AGENTS.md** |
| Setup and project entry | [README.md](README.md) |
| Product and domain context | [CONTEXT.md](CONTEXT.md) |
| Graphify workflow | [docs/spec/GRAPHIFY_WORKFLOW.md](docs/spec/GRAPHIFY_WORKFLOW.md) |
| UI conventions | [.claude/rules/code-style.md](.claude/rules/code-style.md) |
| Execution procedures | `.agents/skills/*/SKILL.md` |
| End-to-end delivery loop | [.agents/agents/dev-loop.md](.agents/agents/dev-loop.md) |

Task plans under `tasks/` are working material. Do not treat old project-specific notes as product contracts.

## Mandatory rules

1. Run `git status --short --branch` before edits and identify user changes.
2. Keep unrelated user changes intact. Never revert, restage, or overwrite work you did not make unless explicitly asked.
3. Read the smallest relevant context needed for the task.
4. Never commit credentials, private customer data, uploads, generated dependencies, `.DS_Store`, or `node_modules/`.
5. Run relevant checks for changed areas before committing.
6. Use Conventional Commits: `feat:`, `fix:`, `refactor:`, `chore:`, or `docs:`.
7. Do not add AI attribution trailers or co-author metadata.
8. Before executable code changes, read `.claude/rules/architecture-quality-gate.md`.

## Task routing

| Task | Read first |
|---|---|
| Setup or environment | [README.md](README.md) |
| Product terminology or behavior | [CONTEXT.md](CONTEXT.md) |
| Graphify | [docs/spec/GRAPHIFY_WORKFLOW.md](docs/spec/GRAPHIFY_WORKFLOW.md) |
| Large or risky change | `.agents/skills/planning-and-task-breakdown/` |
| Test-first implementation | `.agents/skills/tdd/` |
| UI or browser change | `.agents/skills/e2e-test/` or `.agents/skills/manual-automation/` |
| Bug investigation | `.agents/skills/qa/` |
| Pull request work | `.agents/skills/pull-request/` |

## Checks

- Root: run `npm run ci` for a complete verification pass.
- Client: run `npm run lint:ts` and `npm test` from `client/` when client code changes.
- Server: run the narrowest affected script from `server/` (`test:auth`, `test:email`, `test:search`, `test:mollie`, or `test:ci`).
- Prisma: run `npm run prisma:generate` from `server/` after schema changes.
- Browser-facing changes: run the affected Playwright spec and inspect the rendered page at desktop and mobile widths.
- Documentation: run `npm run docs:links` when Markdown links change. It checks local and remote links; a network failure must be reported separately from a broken local link.

## Always

- Use Graphify after significant structural changes: `npm run graphify:specs`.
- Prefer `rg` for searching and targeted file reads.
- Use SCSS Modules and theme tokens for new client styles. Check both light and dark themes after UI work.
- Use semantic Playwright locators and test data only during browser QA.
- Inspect `git diff` and staged files before committing.

## Domain guardrails

HHDC is an internal administration product for the High Heels Dance Camp event. New product language must describe event clients, participants, contacts, communications, payments, content, users, roles, and settings. Do not introduce school concepts such as students, classes, choreographers, branches, lessons, or attendance into new work. Existing legacy modules may still contain inherited names; treat them as migration surface and avoid extending that vocabulary.

## Git

Keep commits focused and do not mix unrelated user work. Normal feature work uses a task branch and a pull request according to `.agents/skills/pull-request/`. If the user explicitly asks to work on the current branch, preserve that instruction.

## Definition of done

- The requested change is implemented or the requested documentation cleanup is complete.
- Relevant checks have been run and their result is known.
- No secrets or unrelated changes are included.
- Documentation links point only to files that exist.
