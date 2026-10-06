# HHDC Admin — Local AI Agent Token Optimization Specification

## 1. Purpose

This specification defines how a local AI coding agent should work inside the HHDC Admin repository:

> **Do not give the model more context. Give the model better context.**

The agent must not load the repository, documentation, tool output, or conversation history into the LLM context unless it is needed for the current step.

This specification extends `AGENTS.md` (the short "Token and Context Efficiency" rules there are the version the agent reads on every task). It does not replace `README.md`, `CONTEXT.md`, other specs, roadmaps, ADRs, or skills.

Forward-looking architecture (a dedicated `ContextManager`, symbol-level reads, semantic cache, model routing, etc.) is intentionally out of scope here — see `docs/roadmap/AI_AGENT_TOKEN_OPTIMIZATION_ROADMAP.md` for that.

---

## 2. Scope

Applies to local AI-assisted development in this repository: Claude Code, Codex CLI, OpenCode, and any other local coding agent working against this repo via the filesystem, Git, shell, and local MCP tools (including Graphify).

Out of scope: multi-agent orchestration, cloud RAG, long-term cross-project memory, a custom context/token-accounting runtime, semantic caching, persistent storage (Redis/SQLite) dedicated to agent state.

---

## 3. Existing Repository Contract

The repository already separates context correctly:

- `AGENTS.md` — operating rules for agents
- `README.md` — human setup and project entry point
- `CONTEXT.md` — project/domain/architecture knowledge
- `docs/spec/*` — feature/system contracts
- `docs/roadmap/*` — local roadmap documents (gitignored)
- `docs/adr/*` — local architectural decisions (gitignored)
- `.agents/skills/*/SKILL.md` — task-specific execution procedures
- `.agents/agents/dev-loop.md` — end-to-end coordination

Token optimization must preserve this separation. Never solve token usage by duplicating project knowledge into `AGENTS.md`.

---

## 4. Task Classification

Before loading additional context, classify the task. Categories: `setup`, `client`, `server`, `database`, `auth/security`, `payments/mollie`, `email`, `infrastructure`, `CI/CD`, `Graphify`, `documentation`, `bug`, `code-review`, `PR`, `architecture`.

The classification determines which docs to read, which skills to load, and which checks to run — see `AGENTS.md` → Task Routing. Classification itself must not require reading the whole project.

---

## 5. Search Before Read

When the target file is unknown, search before opening files:

```text
Graphify (module/dependency discovery)
   ↓
rg / keyword search
   ↓
targeted file read
   ↓
full file read — only when the above is insufficient
```

```bash
rg "createOrder"
rg "CheckoutService"
rg "payment_status"
```

Graphify locates candidate modules; it is not a substitute for reading the actual code.

---

## 6. Targeted File Reading

Prefer the smallest useful range over a full-file read. When a file is large and only one function/section is relevant, read that range first and expand only if it isn't enough.

---

## 7. No Duplicate File Context

Do not resend the same unchanged file content to the LLM more than once within the same task.

Exceptions: the content was dropped from active context by compaction and is needed again; a different range is now needed; the file changed; correctness genuinely requires revalidation.

---

## 8. Tool Output Policy

Tool/shell output is a primary source of wasted tokens. This is already handled at the environment level by **`rtk`** (Rust Token Killer — a hook-based CLI proxy already installed, rewriting commands like `git status` → `rtk git status` transparently and cutting raw output before it reaches the model). Do not build a parallel output-truncation mechanism for this.

Where `rtk` doesn't apply (e.g. reasoning about test/lint results), still prefer commands that are narrow by construction over broad ones:

```bash
git status --short --branch
git log --oneline -10
git diff -- path/to/file
rg "pattern" server/src
```

over:

```bash
git log
find .
cat huge-file
```

---

## 9. Diff-First Workflow

After editing, inspect the diff instead of rereading the whole file:

```text
read relevant code → edit → git diff -- changed-file → targeted verification
```

A full reread is only needed when the edit was complex, generated code changed unexpectedly, or the diff alone doesn't establish correctness.

---

## 10. Narrow Verification First

Run checks from narrowest to broadest:

```text
changed symbol → specific test → domain test suite → npm run ci
```

This does not relax the existing `AGENTS.md` rule that `npm run ci` runs before pushing, or that `npm run graphify:specs` runs after significant structural changes.

---

## 11. Dynamic Skills and Docs

Load only the documentation and skill relevant to the current task classification (per `AGENTS.md` → Task Routing). Do not preload all `docs/spec/*`, all `SKILL.md` files, or unrelated project docs.

---

## 12. Task Memory

Track goal, constraints, decisions, and remaining work using the harness's native task-tracking (e.g. the Task tool), not a hand-maintained state file. Use `dnote -c` when something needs to survive past the current session. No new file format or directory is introduced by this spec.

---

## 13. Security

Never include secrets, `.env` values, tokens, passwords, or customer private data in anything read into context, logged, or referenced. Existing repository safety rules remain authoritative.

---

## 14. Acceptance Criteria

- Agent does not read the whole repository, all `docs/spec/*`, or all skills for a single task.
- Search (Graphify/`rg`) happens before broad file reads.
- Unchanged file content is not resent within the same task.
- Post-edit verification prefers `git diff` over a full reread.
- Narrow checks run before `npm run ci`.
- `README.md`/`CONTEXT.md` are loaded only when the task classification calls for them.
- Shell/tool output stays governed by `rtk`; no duplicate truncation mechanism is introduced.
- No secrets appear in task memory or local notes.

---

## Governing Rule

> **Do not give the model more context. Give the model better context.**

Token savings come from precise retrieval and scoping, not from withholding information the model actually needs.
