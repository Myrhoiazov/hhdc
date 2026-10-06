---
name: code-review
description: Review HHDC Admin changes against repository standards and the requested spec. Use before PR publishing, when reviewing WIP changes, or when asked to review since a branch, commit, tag, or fixed point.
---

# HHDC Admin Code Review

Review the diff along two axes:

- **Standards:** whether the change follows HHDC Admin repository rules and local conventions.
- **Spec:** whether the change matches the user request, issue, PRD, or `tasks/plan.md`.

## 1. Pin the Diff

Use the fixed point supplied by the user. If none is supplied, default to:

```bash
git diff develop...HEAD
git log develop..HEAD --oneline
```

Confirm the fixed point resolves and the diff is non-empty. If the working tree has uncommitted changes, include them in the review by inspecting `git diff` and `git diff --staged` as well.

Completion criterion: the reviewed change set is explicit.

## 2. Gather Standards

Read:

- `AGENTS.md`
- `CONTEXT.md` when domain language or architecture changed
- `README.md`
- Any local coding standards or task files relevant to the diff

Apply these standing HHDC Admin checks:

- Client code respects Feature-Sliced Design import rules (`eslint-plugin-denys-fix-fsd-path-plugin`): no imports into another slice's internals; use `@/slice` public APIs.
- New React components are functional and usually wrapped with `memo()` following local patterns.
- UI text uses i18next where practical; styling uses SCSS Modules and theme tokens, not raw colors; dark theme stays real.
- Server code follows the layered `routes → controllers → services` flow with Zod validation in `schemas/`.
- Auth/security patterns are preserved: cookie sessions, CSRF double-submit, Argon2id, rate limiting. Never weaken or bypass them.
- Prisma schema changes are followed by `npm run prisma:generate` and a migration.
- Secrets and private customer data are not committed; `.env`, uploads, `.DS_Store`, and `node_modules/` are not staged.
- The checks required by `AGENTS.md` for the changed surface are run or explicitly blocked.
- No AI attribution trailers are added to commits.

Completion criterion: every applicable standard source has been considered.

## 3. Gather Spec

Use the first available source:

1. The user's request in the conversation.
2. `tasks/plan.md` and `tasks/todo.md`.
3. A supplied issue, PRD, or spec file.

If no spec exists, report that the Spec axis is limited to the conversation request.

Completion criterion: the behavior expected by the change is stated.

## 4. Review

Report findings under these exact headings:

```markdown
## Standards
- [Severity] [file:line] Finding, why it matters, and suggested fix.

## Spec
- [Severity] [file:line] Finding, missing/incorrect behavior, and suggested fix.
```

Severity values:

- `Blocking`: must fix before PR.
- `Non-blocking`: worth addressing, but PR can proceed.
- `Question`: needs product or user clarification.

Focus on bugs, regressions, missing verification, security/privacy mistakes, and spec mismatches. Keep style-only feedback brief unless it violates a documented rule.

## Completion

Review is complete when both axes have either concrete findings or an explicit pass, and the final line states the count of blocking findings.
