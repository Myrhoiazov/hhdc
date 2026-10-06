# Graphify Workflow

Status: **active project tool workflow**.

## Glossary

| Term | Meaning |
|---|---|
| `code-only` | AST-only extraction, no LLM involved. Fast, always available, no semantic understanding — just imports/structure. |
| semantic pass (`--mode deep`) | An LLM reads each chunk of code and infers what it *does*, not just what it imports. Slow (see backend selection below), produces `GRAPH_REPORT.md`, community labels, and the wiki. |
| clustering | Groups modules into named communities (e.g. "Invoice domain", "Auth middleware") based on the semantic pass. Feeds `GRAPH_REPORT.md`. |
| wiki | The semantic pass's markdown output at `graphify-out/wiki/`, with `index.md` as the agent's entry point into a human-readable summary of the whole codebase. |

Graphify serves two distinct purposes in this repo:

| What | Why | Consumed by |
| ------------------------------------------------- | ------------------------------- | -------------------------------------------- |
| Unified root graph (`graphify-out/graph.json`)    | Agent context (MCP), deep client↔server links | `.mcp.json` |
| Three separate HTML trees                         | Fast visual navigation          | `docs/spec/PROJECT_TREE.html`, `docs/spec/SERVER_SRC_TREE.html`, `docs/spec/CLIENT_SRC_TREE.html` |

Official project:
[graphify-labs/graphify](https://github.com/graphify-labs/graphify)

Detailed working notes (Russian): `TASK.md` at the repo root.

## Generated Artifacts

Tracked HTML outputs:

```text
docs/spec/PROJECT_TREE.html      # whole repository
docs/spec/SERVER_SRC_TREE.html   # server/src
docs/spec/CLIENT_SRC_TREE.html   # client/src
```

Tracked schema description (input for the Prisma semantic pass, see below):

```text
docs/schema.md                   # markdown rendering of server/prisma/schema/*.prisma
```

Ignored working cache (all matched by the `.gitignore` pattern `graphify-out/`, at any depth):

```text
graphify-out/                    # root: graph.json, GRAPH_REPORT.md, graph.html, wiki/
server/src/graphify-out/
client/src/graphify-out/
```

`graphify-out/` directories are regenerated locally and must not be committed.

## Update Command

```bash
npm run graphify:specs           # = bash scripts/graphify-update-docs.sh
```

One script, three runs:

1. root (`--mode deep`) → refreshes `graphify-out/graph.json` (MCP) and
   `docs/spec/PROJECT_TREE.html`;
2. `server/src` → `docs/spec/SERVER_SRC_TREE.html`;
3. `client/src` → `docs/spec/CLIENT_SRC_TREE.html`.

Nested trees use exactly `src/` (not the whole `server/` / `client/`) so that
`prisma/migrations`, `build` and `node_modules` never reach the visual tree.

Legacy command `npm run graph:update` still exists but is superseded by
`graphify:specs`; do not add new tooling on top of it.

### Backend selection (automatic)

1. Any cloud LLM key in env (`GEMINI_API_KEY`, `ANTHROPIC_API_KEY`,
   `OPENAI_API_KEY`, `DEEPSEEK_API_KEY`, `MOONSHOT_API_KEY`) → full
   `--mode deep --wiki` semantic pass.
2. No key → local Ollama. The script checks three things in order and only
   fixes what is missing: ollama installed (`ollama.com/install.sh`),
   service up (`GET /api/tags` on `http://localhost:11434`, starts
   `ollama serve` and waits up to 15 s), model downloaded (`ollama pull`).
   Progress is logged as `[ok]` / `[--]`.
3. If Ollama cannot be brought up → graceful fallback to `--code-only`
   (local AST only: no wiki, no community naming, no semantic pass).

Model: default `qwen2.5-coder:7b`, override via
`GRAPHIFY_OLLAMA_MODEL=qwen2.5-coder:14b`.

Handled Ollama pitfalls:

- graphify CLI requires `OLLAMA_API_KEY` even locally → script sets `dummy`;
- Ollama's 2048-token context silently breaks extraction → script sets
  `GRAPHIFY_OLLAMA_NUM_CTX=32768`;
- local inference must not be parallelized → `--max-concurrency 1`;
- when a chunk does not fit the context, the model returns empty output —
  shrink chunks instead of growing context:
  `GRAPHIFY_OLLAMA_TOKEN_BUDGET=10922 npm run graphify:specs`.

Full semantic pass on a local model takes from minutes up to an hour — that
is normal, not a hang.

### graphify 0.9.x pipeline note

The bare build command does **not** produce the report/wiki by itself in this
version. The script therefore runs after every extract:

```text
extract → cluster-only (GRAPH_REPORT.md + graph.html)
        → label       (LLM community names; LLM backends only)
        → export wiki (graphify-out/wiki/, agent entry point index.md)
```

## Agent Wiring (MCP)

`.mcp.json` at the repo root uses the isolated binary (no global python module
is available; installed via `uv tool install "graphifyy[ollama]" --with mcp`):

```json
{
	"mcpServers": {
		"graphify": {
			"command": "graphify-mcp",
			"args": ["graphify-out/graph.json"]
		}
	}
}
```

If a client cannot resolve `graphify-mcp` from PATH, wrap it:
`"command": "uv", "args": ["tool", "run", "graphify-mcp", "graphify-out/graph.json"]`.

`.codex/config.toml` mirrors this same wiring for the OpenAI Codex CLI harness (its
standard MCP config path, analogous to `.mcp.json` for Claude Code) — both point at
the same `graphify-out/graph.json`, so regenerating it updates context for either agent.

## Prisma Models in the Graph

If Prisma models are missing from `GRAPH_REPORT.md`: regenerate
`docs/schema.md` from `server/prisma/schema/*.prisma`, then re-run
`npm run graphify:specs` — the semantic pass picks the models up and creates
`EXTRACTED` edges `docs/schema.md → *.prisma`. With the local 7b model the
extraction works but stays coarse (schema-level concepts, not every field).

Keep `docs/schema.md` in sync whenever a `.prisma` file changes.

## Exclusions

Before any run, `.graphifyignore` at the repo root applies (node_modules,
build/dist, env files, backups, prisma migrations, etc.). Nested
`server/.graphifyignore` / `client/.graphifyignore` are **not** needed:
verified that nested `src/` runs produce no junk.

## When To Run

- Root graph (`graph.json`) — per commit via `graphify hook install`
  (fast AST pass). **Deliberately not installed by default**: it changes git
  behavior for every commit, and with a local Ollama backend a semantic hook
  would cost minutes per commit.
- Three HTML trees — manually via `npm run graphify:specs` on significant
  architectural changes (new module, new Prisma domain, `features/` redesign).
  Running it on every commit is wasteful: deep mode is expensive, and the
  trees are a human-readable snapshot, not the agent's working context.

## Project Policy

Keep Graphify as a documentation tool, not a deploy dependency.

Do not wire it into `npm run deploy`. The generated trees are useful for review and orientation, but
production deploy must not depend on them.

## Tool Library Convention

Project tooling docs live in:

```text
docs/spec/
```

Recommended pattern for future tools:

```text
docs/spec/<TOOL_NAME>_WORKFLOW.md
```

Each tool workflow should document:

1. what the tool is used for;
2. the exact command to run;
3. generated files;
4. ignored cache/output directories;
5. when to run it;
6. what must never be coupled to production deploy.
