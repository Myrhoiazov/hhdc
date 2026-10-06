# Local AI Email Assistant Operations

This document covers the local Ollama runtime, the optional OpenAI draft provider, and the opt-in email/knowledge workers.
Classification, drafting, sending, and knowledge sync all stay disabled unless their own feature
flag is set to `true`; with every flag at its `false` default, no email is ever sent by the
AI assistant. Classification, spam checks, CRM lookup, embeddings, query expansion, and reranking
remain local. Only final reply-body generation can use the provider selected in the admin Knowledge
Base page.

Knowledge retrieval runs in one of two modes, chosen by `RAG_VERSION` (default `v1`). `v2` is the
layered rules/facts/FAQ/examples pipeline with grounding validation; its indexing, rollout and
rollback live in [DDC_RAG_V2_OPERATIONS.md](DDC_RAG_V2_OPERATIONS.md).

## Configuration

The server reads these variables from its runtime environment:

| Variable | Default | Purpose |
|---|---:|---|
| `OLLAMA_URL` | `http://127.0.0.1:11434` (direct) / `http://ollama:11434` (Compose dev) | Ollama HTTP endpoint |
| `OLLAMA_MODEL` | `qwen3:0.6b` | Local model tag; configurable per environment |
| `OPENAI_API_KEY` | empty | OpenAI secret; environment-only, never stored in the database |
| `OPENAI_BASE_URL` | unset | Optional OpenAI-compatible API base URL |
| `OPENAI_DEFAULT_MODEL` | `gpt-4o-mini` | Default OpenAI draft model |
| `OPENAI_ALLOWED_MODELS` | empty | Optional comma-separated allow-list for admin-selected OpenAI models |
| `OPENAI_CONTEXT_LENGTH` | `16000` | Prompt budget in tokens for RAG v2 drafts written by OpenAI; independent of `LLM_CONTEXT_LENGTH` |
| `OLLAMA_EMBEDDING_MODEL` | `bge-m3` | Local multilingual embedding model |
| `LLM_CONTEXT_LENGTH` | `2048` | Maximum inference context |
| `LLM_TEMPERATURE` | `0.2` | Sampling temperature, from 0 to 2 |
| `LLM_KEEP_ALIVE` | `0` | Seconds to keep a model loaded after a request |
| `AI_MAX_CONCURRENCY` | `1` | Maximum simultaneous AI requests |
| `AI_EMAIL_CLASSIFICATION_ENABLED` | `false` | Enables the five-minute pending-email classifier cron |
| `AI_EMAIL_DRAFT_ENABLED` | `false` | Enables the five-minute classified-email draft pipeline |
| `AI_EMAIL_SEND_ENABLED` | `false` | Enables the five-minute approved-draft SMTP send pipeline |
| `KNOWLEDGE_SYNC_ENABLED` | `false` | Enables the weekly knowledge sync cron |
| `RAG_TOP_K` | `4` | Number of chunks returned by retrieval |
| `RAG_QUERY_EXPANSION_ENABLED` | `false` | Adds an LLM query-expansion call before retrieval (extra model call per email; evaluate via the "Симуляция письма" admin panel first) |
| `RAG_RERANK_ENABLED` | `false` | Reorders the retrieved set with a reranker pass after retrieval (extra model/embedding call per email) |
| `RAG_RERANK_MODEL` | `qwen3-reranker:0.6b` | Model used when `RAG_RERANK_ENABLED=true`; falls back to a bi-encoder (re-embed + cosine) pass if Ollama doesn't expose `/api/rerank` with this model pulled, or to a no-op if that also fails |
| `RAG_CHUNK_SIZE` | `700` | Max characters per knowledge chunk (`chunkKnowledgeDocument`); character-based, no tokenizer wired up — ~2-2.5 chars/token for Cyrillic |
| `RAG_CHUNK_OVERLAP` | `100` | Character overlap between consecutive chunks of the same document |
| `OLLAMA_MEM_LIMIT` | `2g` | Memory cap for the Compose `ollama` service |
| `OLLAMA_CPU_LIMIT` | `1.5` | CPU cap for the Compose `ollama` service |
| `TELEGRAM_APPROVER_IDS` | empty | Comma-separated Telegram actor IDs allowed to approve drafts |
| `TELEGRAM_WEBHOOK_SECRET` | empty | Secret header required by the Telegram approval webhook |
| `TELEGRAM_POLLING_ENABLED` | `false` | Local-dev alternative to the webhook — pulls updates via `getUpdates`, no public URL needed |

The backend receives these variables through both development and production Compose files. Compose
maps `host.docker.internal` to the Docker host so an Ollama process installed on the VPS can be
reached; set `OLLAMA_URL` explicitly when Ollama runs elsewhere. The model default lives in the
configuration module; provider and workflow code must consume that configuration and must not embed
a model name.


## Runtime provider switch

An ADMIN can select `Ollama` or `OpenAI` and a model in the Knowledge Base AI controls. The setting
is stored in `ai_runtime_settings` and takes effect on the next draft or simulation without a
restart. The OpenAI test endpoint sends only synthetic data. If the selected provider is missing
configuration, rate-limited, unavailable, or returns invalid output, the draft is marked `FAILED`
with a bounded error code and remains for manual processing; the system never silently switches
providers. Human approval in Telegram is still required before SMTP delivery.

## Preparing Ollama

Install Ollama on the host or provide a separately managed internal Ollama endpoint. Keep the
endpoint private and set `OLLAMA_URL` accordingly. Pull the configured model before benchmarking:

```bash
ollama pull "${OLLAMA_MODEL:-qwen3:0.6b}"
```

The normal repository CI does not require Ollama and does not run this command.

## Benchmark

Run the opt-in benchmark from the host with the same environment used by the backend:

```bash
OLLAMA_MODEL=qwen3:0.6b ./scripts/benchmark-ollama.sh
```

The script records memory before and after inference with `free -h`, container usage with
`docker stats --no-stream` when Docker is available, and the HTTP status plus total request
latency. It sends only a fixed non-sensitive prompt and does not print the response body.

Repeat the run after the model has been idle for several minutes. Record representative latency,
peak memory, swap movement, and CPU usage before changing the defaults. A model file size alone is
not evidence that the 2 CPU / 4 GB VPS is safe.

## Testing the pipeline locally (CLI)

`npm run ai:test-flow` runs one hand-written email through normalize → deterministic spam check →
classify → RAG retrieve → draft, using the real production code for every stage, without IMAP,
without writing to `ai_email_messages`/`ai_email_drafts`, and without notifying Telegram. CRM
contact lookup and knowledge retrieval are real (read-only) queries against your configured
database.

```bash
cd server
npm run ai:test-flow -- --subject "Тема" --body "Текст письма" [--from a@b.com]
echo "Текст письма" | npm run ai:test-flow -- --subject "Тема"   # body from stdin
npm run ai:test-flow -- --subject "..." --body-file ./sample.txt
```

`npm run ai:test-flow` runs on the **host** (e.g. your laptop, not inside a container) and needs
`OLLAMA_URL`/`DATABASE_URL` reachable from there. The repo's root `.env` is written for the
backend **container's** network instead (`OLLAMA_URL=host.docker.internal:...`, no `DATABASE_URL`
at all — the container builds one from `DB_USER`/`DB_PASSWORD`/`DB_NAME`), so `ai:test-flow` runs
through `scripts/run-local.sh`, which sources the root `.env` and overrides `OLLAMA_URL` to
`127.0.0.1:11434` and sets `DATABASE_URL` to the Compose-published MySQL port. It prints the
resolved `OLLAMA_URL`/`OLLAMA_MODEL`/`DATABASE_URL` (password masked) to stderr on every run so a
misconfiguration is visible immediately rather than several pipeline stages later. If you already
export the right environment yourself (or run inside the backend container via
`docker compose ... exec backend npm run ai:test-flow:raw -- ...`), use `ai:test-flow:raw`
instead — the same script without the host-env wrapper.

Useful flags: `--top-k <n>` overrides `RAG_TOP_K` for one run; `--no-knowledge` skips retrieval
entirely (classification-only testing); `--force-draft` generates a draft even when classification
says spam or no reply needed, to inspect what the model would write; `--json` prints one
machine-readable object instead of the stage-by-stage human-readable output.

## Disable and rollback

To disable AI workers, set `AI_EMAIL_CLASSIFICATION_ENABLED=false`, `AI_EMAIL_DRAFT_ENABLED=false`,
`AI_EMAIL_SEND_ENABLED=false`, and `KNOWLEDGE_SYNC_ENABLED=false` in the backend environment and
recreate the backend container. Existing IMAP/SMTP and Telegram functionality remains independent
of this configuration. Disabling `AI_EMAIL_SEND_ENABLED` stops new sends only; any draft already
`SENDING` when the flag is flipped is not automatically resumed or reverted — check it manually.

## Phase 5 approved-only SMTP delivery

Behind `AI_EMAIL_SEND_ENABLED`, a five-minute cron claims `APPROVED` drafts one at a time
(bounded by `AI_MAX_CONCURRENCY`) and sends them through the existing IMAP/SMTP mailbox that
received the original message, reusing `replyToMessage` so thread headers (`In-Reply-To`,
`References`) and subject threading are preserved automatically. Claiming a draft atomically
transitions `APPROVED -> SENDING` guarded by `(draftId, version, status)`; a retried or
overlapping cron tick that no longer sees `APPROVED` skips the draft instead of resending it, so
retries cannot duplicate outbound mail. On success the draft moves to `SENT` with the outbound
message id and timestamp recorded; on an SMTP failure it moves to `FAILED` with the error message
recorded and is **not** retried automatically — an operator must re-approve it (or investigate)
before it is picked up again. A draft stuck in `SENDING` after a process crash also requires
manual intervention; this is a deliberate trade-off in favor of "never send twice" over automatic
recovery.

## Runtime limitations

- Local Compose includes an Ollama service; production sizing still requires benchmark evidence
  from `scripts/benchmark-ollama*.sh` run on the real target host — no such measurements have been
  recorded in this repository yet. Do not enable any `AI_EMAIL_*_ENABLED` or
  `KNOWLEDGE_SYNC_ENABLED` flag in production before that benchmark exists.
- Drafting, retrieval, Telegram approval, and approved-only SMTP sending are all available behind
  their respective feature flags (see above).
- Real Ollama tests are intentionally opt-in and are not part of CI.

## Phase 1 implementation status

Incoming IMAP messages now pass through a bounded normalizer before their plain-text body is
persisted. The normalizer removes active HTML elements, converts links to text, removes quoted
history, and caps the input at 12,000 characters. Deterministic spam signals (mailbox spam headers,
missing sender, and a small obvious-keyword set) are evaluated before any model call.

The classification boundary is available through the server's
`modules/ai-email-assistant` module. Its Ollama adapter uses the configured model, validates the
strict classification schema, and permits one repair retry for invalid JSON. It has no SMTP,
database, filesystem, or shell tools. Normalized messages and classifications are persisted in
`ai_email_messages` and `ai_email_classifications` with idempotent source/version keys. A separate
classification worker/queue is still deferred; IMAP ingestion records normalized work and
A five-minute classifier cron is available behind `AI_EMAIL_CLASSIFICATION_ENABLED=true`. It uses
the configured concurrency limit (default one), processes the oldest `NORMALIZED` records first,
and marks failures for manual retry. Keep the flag false until Ollama has been benchmarked and the
database migration has been deployed.

## Phase 2A website knowledge discovery

Set `KNOWLEDGE_BASE_URL`, the comma-separated `KNOWLEDGE_ALLOWED_DOMAINS`, and
`KNOWLEDGE_CANONICAL_LANGUAGE` (the language of this site's un-prefixed URLs — `ru` for
talentcenterddc.nl, whose root pages are Russian; `/nl/`, `/en/`, `/uk/` are translations), then
preview source discovery without indexing:

```bash
cd server
npm run knowledge:sync -- --dry-run
```

The command discovers via `<base-url>/sitemap.xml` first (recursing into a `<sitemapindex>` to
reach every per-post-type sub-sitemap — this is the only source complete enough to include custom
post types, such as this site's "styles" and "choreographer" pages, that have no WordPress REST
route at all); if the sitemap is unavailable it falls back to WordPress REST `pages`/`posts`
(incomplete on this site, but useful when a sitemap doesn't exist). Both adapters enforce the
configured domain allowlist; exclude admin, login, search, checkout, cart, shop, my-account,
category/tag archives, and configured excluded paths; and exclude any URL whose path carries a
language-prefix segment (`/nl/`, `/en/`, `/uk/`) other than `KNOWLEDGE_CANONICAL_LANGUAGE`, so
translations are never indexed as separate duplicate documents. `normalizeKnowledgeDocument`
removes boilerplate HTML and computes a SHA-256 content hash. Without `--dry-run`, the command
generates embeddings and persists documents/chunks in MySQL. Run from the repository root for
Docker development:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml exec backend npm run knowledge:sync
```

The backend must use `OLLAMA_URL=http://ollama:11434` to reach the Compose Ollama service.
`127.0.0.1` inside the backend container refers to the backend itself. A refused embedding request
is not evidence of a website connection failure.

Known content-quality caveats on talentcenterddc.nl, not fixed by the language/URL filtering above:
- `/agreement/` embeds other-language text directly in its HTML (a client-side language-switcher
  widget renders all locales into the DOM rather than gating them behind a URL prefix), so some of
  its chunks contain Ukrainian/English fragments despite the page being canonical `ru`.
- `/schedule/<branch>/` pages render their actual timetable client-side; the raw HTML fetch mostly
  captures template boilerplate ("Rotterdam - Talent Center DDC") rather than real schedule data.
Neither is addressed by this crawler; a real fix would need JS rendering or a structured
data source for these two page types.

Progress/error records identify `fetch`, `html-fallback`, `normalize`, `embedding`, or `persist`.
Failure records include the underlying error code, without dumping database payloads or vectors.
The final summary includes indexed documents, chunks, skipped empty pages, and failures. Any
failure or a run with no indexed documents sets a nonzero exit code. Successfully indexed pages
remain committed when another page fails. On a changed page, previous versions of the same source
are marked inactive transactionally so retrieval uses the newly indexed content.

## Phase 2B file import

`importKnowledgeFile` accepts only `.pdf`, `.docx`, `.txt`, `.md`, `.html`, and `.htm`, enforces a
10 MB limit, checks MIME/signature consistency, normalizes text, and computes the same source hash
as website documents. Text, HTML, PDF and DOCX files all extract real text and are ready for preview.
PDF extraction uses `pdf-parse` (`pdfjs-dist`-based); DOCX uses `mammoth`. A structurally valid PDF
with no extractable text (scanned/image-only) is reported as `extraction_required`/`ocr_required`
rather than silently indexed empty content — OCR is not implemented in V1. A DOCX with no extractable
text is `rejected`/`empty_content`. A file that passes the MIME/signature checks but fails to parse
(corrupt content) is `rejected`/`extraction_failed`. Neither case is ever silently indexed.

## Phase 2C embeddings and chunking

Embedding uses the separate `bge-m3` model by default. Override it with `OLLAMA_EMBEDDING_MODEL`
only when benchmarking another local model. The opt-in benchmark exercises NL, EN, UA and RU
queries against the local `/api/embed` endpoint:

```bash
OLLAMA_EMBEDDING_MODEL=bge-m3 ./scripts/benchmark-ollama-embeddings.sh
```

It records request latency and memory before/after the run; normal CI never needs Ollama. The
ingestion module now provides semantic-boundary chunking, deterministic chunk IDs containing source
and content hash, a storage-agnostic `EmbeddingClient`/`KnowledgeRepository` contract, and a small
in-memory cosine-search reference used by tests.
The current production persistence target is MySQL: documents and chunks are stored in
`knowledge_documents` and `knowledge_chunks`; embeddings are JSON vectors and similarity is
computed in the application for the bounded V1 knowledge base.

## Phase 2D retrieval and incremental sync

`KnowledgeRetrievalService` embeds a query, filters weak matches by a minimum cosine score, and
removes duplicate document versions first — this qualifying set and its cosine `score` field never
change regardless of which optional techniques below are enabled. `planIncrementalSync` reports
new, changed, unchanged, and removed sources so unchanged documents can skip re-embedding and
removed sources can be deactivated. A weekly scheduler is available behind
`KNOWLEDGE_SYNC_ENABLED=true`, but its sync callback remains supplied by the eventual
repository-backed sync command.

## Phase 2E hybrid retrieval, query expansion, and reranking

Within the qualifying set from Phase 2D, retrieval is hybrid rather than cosine-only:

- **BM25 + RRF** (always on): `bm25.service.ts` scores the same candidate chunks by lexical
  overlap; `rrf.service.ts` fuses the cosine-similarity ranking and the BM25 ranking via
  Reciprocal Rank Fusion to pick the final `RAG_TOP_K` chunks. This never expands the qualifying
  set or changes the returned `score` field (still plain cosine similarity) — it only re-orders
  within it, because `ollama.client.ts`'s `CONFIDENT_KNOWLEDGE_SCORE` threshold depends on that
  field staying comparable across runs.
- **Query expansion** (`RAG_QUERY_EXPANSION_ENABLED`, default `false`): before retrieval,
  `query-expansion.service.ts` asks the LLM to extract/expand search keywords from a vague or
  casual customer message, so BM25/vector search gets better terms to match against (e.g.
  disambiguating "высокие каблуки" as the *High Heels* dance style rather than literal footwear).
  One extra model call per email; off by default in production because of the added latency/CPU
  cost on the 2 CPU/4 GB target host.
- **Reranker** (`RAG_RERANK_ENABLED`/`RAG_RERANK_MODEL`, default `false`): after the BM25+RRF
  selection, `reranker.service.ts` re-orders the selected chunks by relevance to the query, trying
  Ollama's native `/api/rerank` endpoint first, falling back to a bi-encoder (re-embed query +
  chunks, cosine) pass if that endpoint or model is unavailable, and to a no-op (original order)
  if both fail. Same score-field guarantee as BM25/RRF above.

Both flags default to `false` for the real production cron (`draft-pipeline.cron.service.ts`);
the "Симуляция письма" panel on the Knowledge Base admin page always has both available (with
opt-out toggles) regardless of the `.env` flags, so an admin can evaluate the effect on real
knowledge/queries before enabling either for production email.

## Knowledge Base admin page

`client/src/pages/KnowledgeBasePage/` (sidebar-linked) is the operator surface for everything in
Phases 2A/2B/2E above, plus the prompt library:

- **Documents tab** — paginated list (20/page) of `knowledge_documents` with status/category/
  priority/tags, file upload (multipart, same `.pdf`/`.docx`/`.txt`/`.md`/`.html` allowlist as
  Phase 2B), manual URL crawling (single-page fetch + normalize + embed, reusing the Phase 2A
  normalization pipeline without the sitemap discovery step), category assignment, and an
  LLM-metadata trigger (priority + tags) plus a manual re-embed trigger per document.
- **Prompt library tab** — CRUD over `AiPrompt` rows per slot (`CLASSIFICATION`/`DRAFT_BODY`),
  with tagging and one-click activation. Only the instructions text is editable; the dynamic
  per-email data the application appends is never part of the stored/editable content. The
  active row per slot is what real production classify/draft calls use — not only simulation.
- **Симуляция письма (email simulation) panel** — runs the real classify → retrieve → draft
  pipeline (`simulation.service.ts`, the same code `npm run ai:test-flow` uses) against arbitrary
  test input from the browser, with checkboxes to try query expansion/reranker regardless of the
  production `.env` flags, without touching a real inbox or sending anything.

## Phase 3 draft generation foundation

`generateEmailDraft` is a read-only orchestration boundary. It skips spam and messages classified
as not needing a reply, looks up a contact through the `CrmReader` interface, limits knowledge
context to four attributable chunks, and validates the generated draft with a strict schema. The
Ollama prompt treats email, CRM fields, and retrieved knowledge as untrusted data. Drafts and
approval audit records are persisted; SMTP sending happens separately, behind
`AI_EMAIL_SEND_ENABLED` (see "Phase 5 approved-only SMTP delivery" above), only after a draft is
`APPROVED`. The draft scheduler supplies a `KnowledgeRetrievalService` backed by MySQL and
Ollama embeddings to the pipeline. Enabling `AI_EMAIL_DRAFT_ENABLED` can therefore generate drafts
with retrieved context and send approval notifications; it is not required for CLI indexing or
read-only retrieval checks.

The approval webhook is `POST /api/v1/telegram/webhook`. Telegram must send the configured
`X-Telegram-Bot-Api-Secret-Token` header. Callback data is bound to `draftId` and `version`; only
actors listed in `TELEGRAM_APPROVER_IDS` can approve, edit, reject, or mark a draft as spam.
After pressing `Edit`, send `/edit <draftId> <version> <new text>` from the authorized Telegram
account. The text is stored as an edited draft version only after the immutable version and actor
checks pass.

A webhook only works once it is actually registered with Telegram
(`bot<token>/setWebhook?url=...`) at a **publicly reachable HTTPS URL** — check
`bot<token>/getWebhookInfo` if button taps or `/edit` messages silently do nothing; an empty
`"url"` means nothing was ever delivered, regardless of application code. For local development
without a public URL/tunnel, set `TELEGRAM_POLLING_ENABLED=true` instead: the server pulls updates
via `getUpdates` (long polling, no inbound HTTP needed) through the same
`handleTelegramApprovalUpdate` logic the webhook uses. Telegram refuses `getUpdates` while a
webhook is registered, so run `bot<token>/deleteWebhook` first if one was ever set. Polling state
(the update offset) is in-memory only; a restart before an update is acknowledged just re-delivers
it once, and approval actions already reject being re-applied to a draft that left the
`GENERATED`/`EDITED` state, so a duplicate delivery fails closed rather than double-acting.
