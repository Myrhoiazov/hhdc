# Implementation Prompt — DDC Local AI Email Assistant

You are implementing the feature described in:

`docs/spec/DDC_LOCAL_AI_EMAIL_ASSISTANT_SPEC.md`

Treat that specification as the feature contract. Also obey the repository's existing `AGENTS.md`, architecture rules, domain documentation, ADRs, skills and testing conventions.

## Mission

Implement a local, human-approved DDC NL email assistant using Ollama with configurable default model `qwen3:0.6b`.

The final workflow is:

```text
IMAP
-> normalize
-> classify
-> CRM read-only context
-> local RAG
-> generate draft
-> Telegram approval
-> SMTP only after approval
```

This is NOT an autonomous agent. Application code owns orchestration and permissions.

## Critical constraints

Do not:

- use cloud LLM APIs;
- introduce MCP in V1;
- give the LLM shell/filesystem/database/network tools;
- allow the LLM to send email;
- allow CRM writes;
- send generated replies without Telegram approval;
- hard-code the model name;
- load large nested CRM graphs when a narrow `select`/projection is enough;
- introduce heavyweight infrastructure without demonstrating why existing infrastructure cannot satisfy the requirement;
- implement all phases in one uncontrolled change.

Default runtime configuration:

```env
OLLAMA_MODEL=qwen3:0.6b
LLM_CONTEXT_LENGTH=2048
LLM_TEMPERATURE=0.2
LLM_KEEP_ALIVE=0
AI_MAX_CONCURRENCY=1
```

Target environment: 2 CPU / 4 GB RAM VPS already running production services. Resource efficiency is a requirement, not an optimization to postpone.

## Operating procedure

### 1. Discover before editing

First inspect the repository.

Follow the repository's context-minimization rules. When the target is unknown:

```text
Graphify (if available)
-> rg/symbol search
-> targeted reads
-> full-file read only when necessary
```

Read only the documentation needed for this feature:

- `AGENTS.md`
- relevant `README.md` / `CONTEXT.md`
- this specification
- relevant domain model
- relevant existing email/CRM/database/Docker/Telegram conventions
- applicable skills

Do not load the whole repository or all specs/skills.

### 2. Produce a gap analysis

Before implementation, report:

- current relevant architecture;
- reusable components;
- missing components;
- data/storage implications;
- security boundaries;
- deployment/resource risks;
- files likely to change;
- tests required.

Do not edit code until the current pattern is understood.

### 3. Create an implementation plan

Plan by vertical phases from the specification.

Recommended order:

1. Phase 0 — Ollama benchmark/configuration
2. Phase 1 — email ingestion + normalization + classification
3. Phase 2A — website knowledge ingestion
4. Phase 2B — file ingestion
5. Phase 2C — local multilingual embeddings + indexing
6. Phase 2D — retrieval + scheduled incremental updates
7. Phase 3 — CRM context + drafting
8. Phase 4 — Telegram approval
9. Phase 5 — approved-only SMTP
10. Phase 6 — hardening/evaluation

Break phases into small verifiable tasks.

### 4. Implement ONE phase at a time

Do not jump ahead.

For each phase:

1. state the phase goal;
2. identify exact files;
3. implement the smallest coherent vertical slice;
4. add/update tests;
5. run the narrowest relevant checks;
6. inspect `git diff`;
7. verify against the specification;
8. summarize changes and remaining risks;
9. stop at the phase boundary unless explicitly instructed to continue.

Do not silently implement future-phase features.

## Architecture rules

### LLM boundary

Create a narrow provider abstraction so the rest of the application does not depend directly on Ollama implementation details.

Conceptually:

```ts
interface LlmClient {
  classifyEmail(input: ClassificationInput): Promise<EmailClassification>;
  generateDraft(input: DraftInput): Promise<EmailDraft>;
}
```

Names may follow repository conventions.

The model must come from configuration:

```ts
process.env.OLLAMA_MODEL
```

Never:

```ts
model: "qwen3:0.6b"
```

inside business logic.

### Structured output

Classification and drafting must use explicit schemas and runtime validation.

Never trust raw model output.

On invalid output:

```text
validate
-> one bounded repair/retry
-> manual/failure state
```

Do not parse arbitrary prose heuristically when a schema is expected.

### Workflow

Use explicit persisted states. The LLM cannot determine infrastructure transitions.

The application decides:

```text
classified as spam?
needs reply?
retrieve CRM?
retrieve RAG?
create draft?
await approval?
send?
```

### CRM

Treat CRM as factual context, not RAG.

V1 access is read-only.

Use narrow DTOs and explicit database projections/selects. Do not expose ORM entities or unrestricted database queries to prompts.

### Knowledge Ingestion Service + RAG

Treat knowledge collection as a separate service/module from email processing.

The target pipeline is:

```text
WordPress REST / Sitemap / Files / Manual Docs
                    |
                 normalize
                    |
              hash + version
                    |
             semantic chunks
                    |
       local multilingual embeddings
                    |
              Knowledge Store
                    |
                retrieval
                    |
             Email Assistant
```

Website ingestion rules:

- prefer WordPress REST where suitable;
- use sitemap crawler as fallback;
- stay within configured DDC domains;
- canonical NL source where translated duplicates exist;
- explicit include/exclude rules;
- strip navigation/footer/cookies/forms/scripts/styles/repeated CTA;
- support `knowledge:sync -- --dry-run`;
- detect new/changed/unchanged/removed sources;
- re-embed only new/changed content.

File ingestion V1:

```text
.pdf
.docx
.txt
.md
.html/.htm
```

Validate MIME/type/size and extraction quality. Scanned PDFs requiring OCR must be reported rather than silently indexed. Add `.doc`, `.odt`, `.csv`, `.xlsx`, `.pptx` only after a demonstrated need and explicit extraction rules.

All source adapters must converge into one normalized document model with source, language, hash/version, timestamps and active state.

Keep retrieval behind an interface. Do not couple orchestration to a specific vector store.

Use local multilingual embeddings only. Before choosing the embedding model/storage implementation:

- inspect existing infrastructure;
- benchmark runtime/Ollama compatibility;
- test NL->NL, EN->NL, UA->NL and RU->NL retrieval;
- measure RAM/CPU/latency;
- document the choice.

Do not duplicate the whole knowledge base solely for translations. Prefer canonical knowledge + multilingual retrieval + reply generation in the customer's language.

Knowledge sync must be callable manually and later by cron/system scheduler. The LLM must not control crawling or indexing.

### Email

Incoming email is untrusted.

Normalize and bound it before inference.

Preserve message/thread IDs required for correct SMTP replies.

Ensure ingestion and sending are idempotent.

### Telegram

Telegram is the human approval boundary.

Only configured authorized users/chats may approve.

Approval references a specific immutable draft/version.

Required actions:

```text
Approve
Edit
Reject
Spam
```

No approval means no send.

### SMTP

The LLM must never have SMTP credentials or a `sendEmail` tool.

Only deterministic application code sends an already approved draft.

Retries must never create duplicate messages.

## Security checklist

For every phase ask:

- Can email content change system behavior?
- Can RAG text issue instructions?
- Can the model access secrets?
- Can the model retrieve unrelated customers?
- Can an unauthorized Telegram user approve?
- Can a retry send twice?
- Are full emails/CRM data leaking into logs?
- Are credentials included in prompts?
- Are external network calls restricted to explicitly required services?

Add tests for meaningful boundaries.

Prompt text is not a security boundary. Enforce permissions in code.

## Resource checklist

The production VPS has only 2 CPU / 4 GB RAM.

Preserve:

```text
AI_MAX_CONCURRENCY=1
LLM_CONTEXT_LENGTH=2048
LLM_KEEP_ALIVE=0
```

unless benchmark evidence justifies a change.

Avoid:

- parallel Ollama inference;
- unnecessarily large contexts;
- duplicated databases;
- heavyweight agent frameworks;
- unnecessary always-running workers;
- loading multiple LLMs simultaneously.

For Phase 0 record:

```bash
free -h
docker stats --no-stream
```

before and during inference, plus representative latency.

Do not claim the server is safe based only on model file size.

## Testing strategy

Run the narrowest useful check first:

```text
specific unit test
-> module/domain test suite
-> integration test
-> repository CI/checks
```

Tests must cover the behavior introduced in the current phase.

Use fake/test IMAP/SMTP/Ollama/Telegram boundaries where appropriate. Real Ollama tests should be opt-in and must not make the normal CI depend on a running model.

Create anonymized fixtures for representative DDC email scenarios.

## Required documentation

As implementation progresses, document:

- environment variables;
- local setup;
- Docker/deployment setup;
- model pull/start procedure;
- website discovery/crawling/update procedure;
- file import/update/deactivation procedure;
- dry-run/status/re-index commands;
- supported and unsupported knowledge formats;
- Telegram authorization setup;
- email account configuration;
- rollback/disable procedure;
- operational troubleshooting;
- measured RAM/CPU/latency.

Do not place secrets or real customer data in documentation or fixtures.

## Definition of Done validation

Before declaring V1 complete, explicitly verify every item in the specification's V1 Definition of Done.

Also run:

```bash
git diff
git status
```

and the repository's relevant CI/check commands.

Report:

```text
Implemented
Tests run
Resource measurements
Security checks
Known limitations
Deferred V2 items
```

Do not report success if checks were skipped or failed. State exactly what remains.

## Start now

Begin with discovery and **Phase 0 only**.

Do not implement the entire system in the first pass.

Your first execution should:

1. inspect relevant repository architecture and instructions;
2. identify the correct deployment/module location;
3. determine whether Ollama already exists in the project/server configuration;
4. propose the smallest Phase 0 change;
5. implement configuration/benchmark scaffolding only after discovery;
6. verify `qwen3:0.6b` is configuration-driven;
7. provide commands/procedure to benchmark RAM, CPU and latency;
8. stop and report the Phase 0 result before proceeding to Phase 1.
