---
name: planning-and-task-breakdown
description: Break HHDC Admin work into ordered, verifiable tasks. Use for multi-file features, risky client/server changes, schema/model changes, unclear requirements, or work that needs agent-loop coordination.
---

# HHDC Admin Planning and Task Breakdown

Use this skill before implementation when the request is larger than an obvious tiny change.

## Inputs

Read:

- `AGENTS.md`
- `CONTEXT.md` for domain language, architecture, and FSD details
- `README.md`
- Relevant local roadmap docs (gitignored `docs/roadmap/`, available only on the owner's machine) when the area is covered
- Relevant source: client slices under `client/src/**`, server routes/controllers/services, `server/prisma/schema/*.prisma`

Completion criterion: the existing pattern and the risky surfaces are known.

## Planning Rules

Plan in vertical slices that leave the app compiling and its checks passing after each task. Prefer slices around user-visible or observable outcomes:

- A client page or feature renders and its Redux state behaves correctly.
- A server endpoint validates input, persists, and returns the expected response.
- A Prisma model or migration is applied and the client keeps working.
- A form or interaction works end to end through the API.
- A style change renders correctly across desktop and mobile.

Keep task scope small. Break tasks that touch unrelated areas, span client and server without a clear contract, or require many files.

## HHDC Admin Risk Checks

Call out risks when the work touches:

- Domain terms from `CONTEXT.md` (event client, participant, contact, event edition, communication, payment, email, user, role, setting, etc.).
- Auth/security, sessions, CSRF, 2FA, or rate limiting — see the local auth/security roadmap (gitignored `docs/roadmap/`, not part of the repo).
- Payments, refunds, or payment reminders — confirm the current event workflow and provider contract before changing them.
- Organizations or brands — see the local organizations/brands roadmap (gitignored `docs/roadmap/`).
- Prisma schema changes (require `npm run prisma:generate` and a migration).
- `.env`, credentials, private uploads, or `node_modules/`.

Completion criterion: each risk has a mitigation or an explicit open question.

## Output Files

Create or update:

- `tasks/plan.md`
- `tasks/todo.md`

Use these files only for real implementation plans. For tiny work, skip them and state that no written plan was needed.

## Task Format

Each task should use this shape:

```markdown
## Task [N]: [Short user-visible outcome]

**Description:** [What this task delivers.]

**Acceptance criteria:**
- [ ] [Specific, observable behavior]
- [ ] [Specific, observable behavior]

**Verification:**
- [ ] Client: `npm run lint:ts` and relevant Jest test when client changed
- [ ] Server: `npm run build` and the matching domain test when server changed
- [ ] Prisma: `npm run prisma:generate` + migration when schema changed
- [ ] Browser QA: [page/viewport/interaction] when UI changed
- [ ] Secret/media scan when relevant

**Dependencies:** [Task numbers or "None"]

**Files likely touched:**
- `client/src/...`
- `server/src/...`

**Estimated scope:** [XS | S | M]
```

## Plan Template

```markdown
# Implementation Plan: [Feature/Fix Name]

## Overview
[One paragraph.]

## Relevant Context
- [Existing pattern or file group.]
- [Domain/security constraint when applicable.]

## Task List
- [ ] Task 1: ...
- [ ] Task 2: ...

## Verification Plan
- [ ] Checks: client lint/test, server build/test, or `npm run ci`
- [ ] Browser QA:
- [ ] Review:

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| [Risk] | [High/Med/Low] | [Mitigation] |

## Open Questions
- [Question, or "None"]
```

## Todo Template

```markdown
# Todo: [Feature/Fix Name]

- [ ] Task 1: [Short title]
- [ ] Task 2: [Short title]
- [ ] Checks passed (`npm run ci` from the root)
- [ ] Code review passed
- [ ] Browser QA completed or marked not required
- [ ] Ready for PR
```

## Completion

Planning is complete when every task has acceptance criteria, verification, dependencies, and likely files, and the user has approved the plan when approval is required by `agent-loop`.
