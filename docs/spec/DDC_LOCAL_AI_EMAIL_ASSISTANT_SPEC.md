# DDC Local AI Email Assistant — Technical Specification

**Status:** Draft / V1  
**Project:** DDC NL CRM  
**Primary local LLM:** `qwen3:0.6b` via Ollama
**Deployment target:** KVM VPS — 2 CPU, 4 GB RAM, 50 GB SSD  
**Core principle:** deterministic workflow + local LLM + human approval. No cloud LLM API. No autonomous tool-using agent in V1.

## 1. Goal

Build a private, resource-efficient email assistant for DDC NL that:

1. Reads new incoming emails.
2. Normalizes and safely stores them.
3. Detects obvious spam using deterministic rules first and LLM classification second.
4. Detects language, intent, whether a reply is needed, and confidence.
5. Resolves the sender against HHDC Admin using minimal read-only queries.
6. Searches a local DDC knowledge base (RAG).
7. Generates a draft reply using only the incoming email and explicitly supplied context.
8. Sends the draft to Telegram for human approval.
9. Sends an email only after explicit approval.
10. Records the original draft, edits, decision, and final sent reply for audit and future improvement.

The system MUST NOT automatically send generated replies in V1.

## 2. Non-goals for V1

Do not implement:

- OpenAI, Anthropic, Gemini, or other cloud LLM APIs.
- Autonomous ReAct/agent loops.
- MCP unless a later ADR demonstrates a concrete need.
- Shell/filesystem/database access exposed directly to the LLM.
- Automatic CRM mutations.
- Automatic email sending without approval.
- Fine-tuning.
- A second large database solely for RAG unless justified by measurement.
- Processing arbitrary attachments beyond safe metadata/text extraction explicitly added later.

## 3. Constraints

Target server currently has approximately:

- 2 CPU cores
- 3.8 GiB usable RAM
- 2 GiB swap
- existing CRM, MySQL/PostgreSQL/Redis and monitoring workloads

The implementation MUST prioritize low idle memory and bounded concurrency.

Initial defaults:

```env
OLLAMA_MODEL=qwen3:0.6b
LLM_CONTEXT_LENGTH=2048
LLM_TEMPERATURE=0.2
LLM_KEEP_ALIVE=0
AI_MAX_CONCURRENCY=1
```

The model name MUST be configuration-driven. No application code may hard-code `qwen3:0.6b`.

## 4. Architecture

```text
IMAP
  |
  v
Email Poller
  |
  v
Normalizer + deterministic safety/spam checks
  |
  v
Persist inbound message + enqueue job
  |
  v
LLM Classification
  |
  +---- spam / no reply ----> record decision
  |
  v
Customer Resolver ---------> HHDC Admin read-only adapter
  |
  v
RAG Retrieval -------------> local knowledge store
  |
  v
Context Builder
  |
  v
Ollama / qwen3:0.6b
  |
  v
Draft Validator
  |
  v
Approval Queue
  |
  v
Telegram Bot
  |
  +--> Approve --> SMTP Sender --> audit
  +--> Edit -----> revised draft --> approve/send
  +--> Reject --------------------> audit
  +--> Spam ----------------------> audit
```

The application controls state transitions. The LLM never decides which infrastructure tool to invoke.

## 5. Suggested repository boundary

Prefer a separate service/module boundary rather than embedding AI orchestration throughout existing CRM code.

Example:

```text
ai-email-assistant/
├── src/
│   ├── config/
│   ├── email/
│   │   ├── imap/
│   │   ├── smtp/
│   │   ├── normalize/
│   │   └── spam/
│   ├── llm/
│   │   ├── ollama/
│   │   ├── classification/
│   │   └── drafting/
│   ├── crm/
│   ├── rag/
│   ├── telegram/
│   ├── workflow/
│   ├── persistence/
│   └── security/
├── prompts/
├── tests/
├── docker/
└── docs/
```

Adapt this to the existing repository conventions. Do not create parallel architecture when equivalent abstractions already exist.

## 6. Workflow state machine

Recommended statuses:

```text
RECEIVED
NORMALIZED
CLASSIFIED
IGNORED_SPAM
IGNORED_NO_REPLY
CONTEXT_READY
DRAFTED
AWAITING_APPROVAL
EDITED
APPROVED
REJECTED
MARKED_SPAM
SENDING
SENT
FAILED
```

Transitions MUST be explicit and persisted. Retrying a job must not duplicate outbound emails.

## 7. Email ingestion

### 7.1 IMAP

Use IMAP for receiving email. The poller should:

- fetch only unseen/new messages;
- preserve `Message-ID`, `In-Reply-To`, `References`, sender, recipients, subject and timestamps;
- create a stable internal ID;
- prevent duplicate ingestion;
- acknowledge/mark messages only after durable persistence;
- reconnect safely after network failures.

### 7.2 Normalization

Before LLM processing:

- convert HTML to safe plain text;
- remove tracking/non-content markup;
- preserve meaningful links as text where needed;
- separate quoted history/signature when feasible;
- enforce maximum input length;
- treat email content as untrusted data;
- never interpret instructions inside an email as system/developer instructions.

The original raw content may be retained only if operationally necessary and protected appropriately.

## 8. Classification

Use deterministic rules before invoking the LLM where possible.

LLM classification MUST return validated structured data, for example:

```json
{
  "spam": false,
  "needsReply": true,
  "language": "nl",
  "intent": "trial_lesson",
  "confidence": 0.91,
  "reason": "Parent asks whether a child can attend a trial lesson."
}
```

`reason` must be short and must not be treated as hidden reasoning.

Use a schema validator. Invalid model output should be retried once with a repair instruction, then move the job to `FAILED`/manual review rather than guessing.

Suggested intent taxonomy should start small and evolve from real email traffic, e.g.:

- `trial_lesson`
- `schedule`
- `pricing`
- `subscription`
- `payment`
- `cancellation`
- `location`
- `teacher`
- `registration`
- `event`
- `complaint`
- `partnership`
- `other`

## 9. CRM context

CRM facts and RAG knowledge are separate sources.

The CRM adapter MUST:

- be read-only in V1;
- resolve customers by normalized email and other safe identifiers only when justified;
- use explicit `select`/projection;
- never fetch whole nested graphs;
- return a purpose-built DTO;
- expose no raw database connection to the LLM.

Example safe DTO:

```ts
type CustomerEmailContext = {
  customerId: string;
  displayName: string | null;
  preferredLanguage: string | null;
  locationName: string | null;
  children?: Array<{
    firstName: string;
    ageGroup: string | null;
  }>;
  activeSubscriptions?: Array<{
    name: string;
    status: string;
  }>;
};
```

Only fields required for the current intent should be retrieved where practical.

## 10. RAG and Knowledge Ingestion Service

RAG is split into two independent concerns:

1. **Knowledge Ingestion Service** — discovers, imports, cleans, versions and updates knowledge.
2. **Knowledge Retrieval Service** — searches already indexed knowledge for the email assistant.

The email workflow MUST NOT crawl websites or parse documents synchronously while answering an email.

### 10.1 Knowledge strategy

Use one canonical source of truth for each fact. Do not duplicate the entire knowledge base solely to create NL/EN/UA/RU translations.

Preferred flow:

```text
canonical knowledge (primarily NL)
        |
multilingual local embeddings
        |
query in NL / EN / UA / RU
        |
relevant canonical chunks
        |
LLM generates reply in customer's language
```

Frequently changing structured facts such as customer state, payments, subscriptions, prices or schedules SHOULD come from CRM/business data when a reliable structured source exists. RAG is primarily for policies, FAQ, instructions, class/style descriptions and approved guidance.

### 10.2 Separate Knowledge Ingestion Service

Treat knowledge collection as a separately testable service/module:

```text
                 Knowledge Ingestion Service
                         |
       +-----------------+------------------+
       |                 |                  |
 WordPress/API      Sitemap/Crawler      File Upload
       |                 |                  |
       +-----------------+------------------+
                         |
                 normalize + version
                         |
                       chunk
                         |
                  local embeddings
                         |
                  Knowledge Store
                         |
                 Retrieval Interface
                         |
                  Email Assistant
```

This service must be reusable later by CRM assistant, Telegram assistant or internal search.

Conceptual source contract:

```ts
interface KnowledgeSource {
  discover(): Promise<SourceDocumentRef[]>;
  fetch(ref: SourceDocumentRef): Promise<SourceDocument>;
}
```

### 10.3 Website discovery, crawling and updates

Prefer WordPress REST API when it exposes the required DDC content and metadata. Use sitemap crawling as a fallback.

```text
WordPress REST / sitemap
        |
discover allowed content
        |
language + include/exclude policy
        |
fetch
        |
extract main content
        |
normalize
        |
content hash / modified timestamp
        |
   +----+----+
   |         |
unchanged   changed/new
   |         |
 skip       chunk
             |
           embed
             |
            store
```

The website source MUST:

- stay within configured DDC domains;
- use explicit include/exclude rules;
- prefer canonical NL pages where equivalent translations exist;
- avoid admin/login/search/checkout and configured non-knowledge pages;
- remove navigation, footer, cookie banners, forms, scripts, styles and repeated UI/CTA content;
- preserve meaningful headings and sections;
- use bounded concurrency, timeouts and retries;
- detect deleted/removed pages and deactivate their indexed knowledge;
- never follow arbitrary external links as knowledge sources.

Provide a preview before indexing:

```bash
npm run knowledge:sync -- --dry-run
```

Dry-run should report discovered, eligible, excluded, new, changed, unchanged and removed sources and allow inspection of cleaned content without generating embeddings.

### 10.4 File upload/import sources

Provide a controlled administrative ingestion path. V1 may use CLI/import directory; a CRM admin UI can be added later.

**Implemented (V1.1):** the Knowledge Base admin page (`client/src/pages/KnowledgeBasePage/`)
provides this path in the CRM UI — multipart file upload against the same allowlist/validation as
below, plus manual single-URL crawling (fetch + normalize + embed one page on demand, reusing the
website normalization pipeline without sitemap discovery), category assignment
(`KnowledgeCategory` enum), and an LLM-derived priority + tags metadata trigger, in addition to the
CLI import path.

Initial supported formats:

- `.pdf` — PDFs with extractable text;
- `.docx` — Microsoft Word;
- `.txt` — plain text;
- `.md` — Markdown;
- `.html` / `.htm` — HTML.

Optional later, only when needed:

- `.doc` — legacy Word via safe conversion/extraction;
- `.odt` — OpenDocument Text;
- `.csv` — textual/reference datasets;
- `.xlsx` — only with explicit sheet/column mapping;
- `.pptx` — when slide text is useful knowledge.

Scanned/image-only PDFs require OCR. The importer MUST detect empty/poor extraction and report it instead of silently indexing it.

Do not index executable files, archives, scripts or unsupported binary formats.

File ingestion flow:

```text
upload/import
     |
validate MIME + extension + size
     |
extract text
     |
normalize
     |
preview + metadata
     |
deduplicate / content hash
     |
semantic chunking
     |
local embeddings
     |
Knowledge Store
```

Never trust file extension alone. Configure MIME allowlist and size limits.

### 10.5 Normalized knowledge document

All adapters converge into one internal representation before chunking.

Example metadata:

```ts
type KnowledgeDocumentMetadata = {
  sourceType: "wordpress" | "website" | "file" | "manual";
  sourceId: string;
  sourceUrl?: string;
  fileName?: string;
  mimeType?: string;
  title: string;
  language: string;
  contentHash: string;
  sourceModifiedAt?: Date;
  lastCheckedAt: Date;
  active: boolean;
};
```

Every document/chunk must remain attributable to source, version/hash and section.

### 10.6 Normalization and semantic chunking

Do not chunk raw HTML or raw binary extraction output.

Normalization should:

- remove boilerplate and duplicated repeated content;
- collapse irrelevant whitespace;
- preserve useful headings, paragraphs and lists;
- retain source attribution;
- reject empty/low-quality extraction for manual review.

Chunking should prefer semantic boundaries: headings, paragraphs, FAQ question/answer pairs and policy sections. Keep chunks small enough for the selected embedding model and the 2048-token generation context.

### 10.7 Incremental sync and versioning

Every normalized document receives a deterministic content hash (for example SHA-256).

```text
same source + same hash -> skip
same source + changed hash -> re-index changed/current version
new source -> index
removed source -> deactivate
```

Do not recompute embeddings for unchanged content.

Old/inactive chunks MUST NOT be returned by normal retrieval. Store enough history to know exactly which source/version was used for an email draft.

### 10.8 Manual and scheduled operation

Knowledge synchronization is independent from email processing.

Required operational concepts:

```bash
npm run knowledge:sync -- --dry-run
npm run knowledge:sync
npm run knowledge:import -- <file-or-directory>
npm run knowledge:status
```

Exact names may follow repository conventions.

After validation, website sync may run via cron/system scheduler daily or weekly. Do not use an LLM/agent to decide when to crawl.

### 10.9 Knowledge lifecycle

The service should support:

- list/search indexed documents;
- inspect metadata and cleaned text;
- see last sync/index status;
- manually re-index one source;
- deactivate/reactivate a document;
- remove a document from active retrieval;
- identify extraction/indexing errors;
- show source/version used by a generated draft.

A full admin UI is not required for the first vertical slice.

**Implemented (V1.1):** the Knowledge Base admin page covers list/search (paginated 20/page),
category/priority/tags metadata, status, manual re-embed, and file/URL ingestion (§10.4) from the
CRM UI, plus an editable prompt library and an email-simulation panel (§11) — see
[Local AI Email Assistant Operations](DDC_LOCAL_AI_EMAIL_ASSISTANT_OPERATIONS.md) for the
operational detail.

### 10.10 Storage

Keep V1 lightweight and reuse existing infrastructure where sensible.

Keep ingestion/retrieval storage-agnostic:

```ts
interface KnowledgeRepository {
  upsertDocument(document: KnowledgeDocument): Promise<void>;
  replaceChunks(documentId: string, chunks: KnowledgeChunk[]): Promise<void>;
  deactivateDocument(documentId: string): Promise<void>;
  search(query: KnowledgeQuery): Promise<KnowledgeChunk[]>;
}
```

This allows later migration to `pgvector` without rewriting ingestion or email orchestration.

### 10.11 Local multilingual embeddings

Embeddings MUST run locally and be configured separately from `qwen3:0.6b`.

```env
OLLAMA_EMBEDDING_MODEL=bge-m3
RAG_TOP_K=4
```

Before selecting the model benchmark:

- runtime/Ollama compatibility;
- NL -> NL retrieval;
- EN -> NL retrieval;
- UA -> NL retrieval;
- RU -> NL retrieval;
- RAM/disk use;
- latency on 2 CPU;
- vector dimensions/storage cost.

Do not duplicate the knowledge base only to solve translation.

### 10.12 Retrieval rules

- retrieve a small number of chunks (`topK` default 4, `RAG_TOP_K`);
- search active/current versions only;
- use metadata/category/language filters when useful;
- set a minimum relevance threshold;
- deduplicate overlapping chunks;
- prefer authoritative/current sources when conflicts exist;
- include source/version IDs in draft metadata;
- keep context within the LLM budget;
- never invent an answer when retrieval is weak or conflicting.

If reliable context is missing, set `needs_manual_answer=true`.

**Implemented (V1.1):** the minimum-score bar and de-dup above run first and are never widened by
what follows — every technique below only re-ranks/re-selects within that already-qualifying set:

- **BM25 + RRF** (always on, no flag): chunks are additionally scored by lexical (BM25) overlap,
  and the final `topK` selection is a Reciprocal Rank Fusion of the cosine and BM25 rankings
  (`bm25.service.ts`/`rrf.service.ts`).
- **Query expansion** (`RAG_QUERY_EXPANSION_ENABLED`, default `false`): an optional LLM pass
  extracts/expands search keywords from the incoming message before retrieval, to disambiguate
  vague or casual phrasing (`query-expansion.service.ts`).
- **Reranker** (`RAG_RERANK_ENABLED`/`RAG_RERANK_MODEL`, default `false`): an optional pass
  re-orders the selected chunks by relevance — native Ollama `/api/rerank` first, a bi-encoder
  cosine pass as fallback, original order if both fail (`reranker.service.ts`).

In every case the chunk's returned `score` field stays the original cosine similarity, never a
BM25/RRF/rerank score, so the `needs_manual_answer` confidence threshold stays comparable across
configurations. Both optional flags default off for the real production pipeline; they are always
available (with opt-out toggles) in the admin "Симуляция письма" simulation panel so their effect
can be evaluated before enabling either in production.

Chunk size/overlap at ingestion time (`RAG_CHUNK_SIZE`/`RAG_CHUNK_OVERLAP`, default 700/100
characters) are also configuration-driven rather than hardcoded — see §10.6.

## 11. Prompting and draft generation

The model receives only:

1. system/task instructions;
2. normalized incoming email;
3. minimal conversation history if needed;
4. minimal CRM context;
5. retrieved RAG chunks;
6. required output schema.

It MUST NOT receive secrets, DB credentials, unrelated customers, complete CRM records, or arbitrary repository context.

**Implemented (V1.1):** only `body` is model-generated. Every other field is computed
deterministically by application code and therefore can never fail schema/language validation
regardless of what the model returns, as long as it returns non-empty text:

```json
{
  "replyLanguage": "nl",
  "subject": "Re: Proefles",
  "body": "Hi ...",
  "confidence": 0.84,
  "needsManualAnswer": false,
  "usedKnowledgeIds": ["kb_123", "kb_891"]
}
```

- `replyLanguage` — copied from the classification result, not parsed from model output;
- `subject` — `Re: <original subject>`, not model-generated;
- `confidence`/`needsManualAnswer` — derived from the top retrieval `score` (cosine similarity),
  not the model's self-report;
- `usedKnowledgeIds` — the IDs of the knowledge chunks actually supplied as context, not a
  model-reported list;
- `body` — the only model-generated field; the model is asked for body text only, with reasoning
  disabled (`think: false`), no JSON schema requested from it.

Generation rules:

- answer in the sender's language unless CRM policy says otherwise;
- do not invent prices, schedules, availability, payment state or policy;
- distinguish CRM facts from general knowledge;
- when information is insufficient, ask for manual handling instead of guessing;
- keep replies concise and natural;
- never claim an action was performed unless application state proves it.

**Implemented (V1.1) — editable prompt library:** the instructions text of both LLM calls
(classification and draft body) is admin-editable and DB-backed (`AiPrompt` model,
`prompt-library.service.ts`, Knowledge Base admin page). Only the instructions are stored/editable
— the dynamic per-email data above is always appended by application code after the stored
content and is never part of what an admin edits, so a saved prompt can never omit the actual
email the model must act on. At most one prompt row per slot is active; the active row drives real
production classify/draft calls (not only the simulation panel); no active row falls back to the
hardcoded default, so an empty table changes nothing.

## 12. Telegram human-in-the-loop

Each actionable draft should display:

- sender;
- subject;
- cleaned incoming message;
- detected intent/language;
- whether a CRM customer was matched;
- short list of knowledge sources used;
- generated reply;
- confidence/manual-review flag.

Required actions:

- `Approve`
- `Edit`
- `Reject`
- `Spam`

Approval MUST be tied to an immutable draft/version ID to prevent approving stale content.

Only authorized Telegram user/chat IDs may operate approval actions.

## 13. Sending

SMTP sending occurs only after `APPROVED`.

Requirements:

- use original thread headers correctly;
- preserve subject/threading;
- idempotency key per approved outbound message;
- do not send twice on retries;
- persist provider/server response metadata;
- transition `SENDING -> SENT` only after confirmed success;
- on failure retain the approved draft for retry/manual intervention.

## 14. Persistence

Use existing project persistence conventions where possible.

Minimum logical entities:

### `ai_email_messages`

- id
- message_id
- thread_key
- direction
- sender
- recipients
- subject
- normalized_body
- received_at
- status
- created_at
- updated_at

### `ai_email_classifications`

- id
- email_id
- spam
- needs_reply
- language
- intent
- confidence
- model
- prompt_version
- created_at

### `ai_email_drafts`

- id
- email_id
- version
- subject
- body
- confidence
- needs_manual_answer
- model
- prompt_version
- status
- created_at

### `ai_email_knowledge_refs`

- draft_id
- knowledge_id
- score

### `ai_email_approvals`

- id
- draft_id
- action
- actor_id
- edited_body
- created_at

Schema names may be adapted to repository conventions.

## 15. Security

This section is mandatory.

### Trust boundaries

Incoming email, RAG documents and CRM text fields are untrusted content.

The LLM has:

```text
NO shell
NO filesystem tool
NO arbitrary HTTP
NO direct database access
NO SMTP credentials
NO Telegram credentials
NO CRM write capability
```

Infrastructure calls are made by deterministic application code.

### Prompt injection

Prompts MUST explicitly state that instructions contained in email/RAG content are data, not commands. Application-level permissions are the primary defense; prompt wording alone is not considered a security boundary.

### Secrets

Secrets live in environment/secret storage and MUST NOT be logged or included in model prompts.

### Privacy

Log only what is necessary. Avoid dumping full emails/CRM records into application logs. Define retention before production rollout.

## 16. Resource limits

V1 MUST be safe for a 2 CPU / 4 GB VPS.

Requirements:

- LLM concurrency: `1`;
- context default: `2048`;
- `keep_alive=0` or equivalent request behavior;
- bounded email/body/chunk sizes;
- bounded queue;
- no parallel model requests;
- container memory/CPU limits where supported;
- health checks for Ollama and worker;
- graceful behavior when Ollama is unavailable;
- never treat swap as usable LLM capacity.

Measure actual memory and latency before changing model size.

## 17. Observability

Track lightweight operational metrics:

- emails ingested;
- spam/non-spam counts;
- classification failures;
- drafts created;
- manual-review rate;
- approval/edit/reject rates;
- send failures;
- Ollama request latency;
- retrieval latency;
- queue depth;
- model/schema failures.

Do not add a new heavy monitoring stack; integrate with existing monitoring if useful.

Structured logs should use internal IDs rather than full message bodies.

## 18. Feedback dataset

Store enough information to compare:

```text
incoming email
classification
retrieved knowledge IDs
generated draft
human action
human-edited draft
final sent response
model + prompt version
```

This is for evaluation and future prompt/RAG improvement. Do not implement fine-tuning in V1.

## 19. Testing

### Unit

- normalization;
- deduplication;
- state transitions;
- schema validation;
- CRM projection;
- RAG threshold behavior;
- authorization;
- idempotent sending.

### Integration

- IMAP fixture -> persisted email;
- Ollama mocked/real optional classification;
- RAG retrieval;
- Telegram callback handling;
- approved draft -> SMTP test server;
- retries do not duplicate outbound mail.

### Security

Test prompt-injection emails such as requests to ignore instructions, reveal customers, execute commands or send data externally. Expected behavior: they remain inert content.

### Evaluation set

Create an anonymized representative set of DDC emails covering NL/EN/UA/RU, spam, schedule, trial lesson, pricing, payments, complaints and unknown questions.

Measure:

- spam precision/recall;
- intent accuracy;
- language accuracy;
- unsupported factual claims;
- approval-without-edit rate;
- average generation latency.

## 20. Rollout phases

### Phase 0 — Benchmark

- run Ollama + `qwen3:0.6b`;
- measure RAM/CPU/latency;
- evaluate classification and drafting on anonymized examples.

**Gate:** server remains stable and quality is acceptable for assisted drafting.

### Phase 1 — Ingestion + classification

- IMAP;
- persistence;
- normalization;
- deterministic spam checks;
- structured LLM classification;
- no reply generation yet.

### Phase 2 — Knowledge Ingestion Service + RAG

#### Phase 2A — Website knowledge ingestion

- normalized document/chunk contracts;
- source-adapter boundary;
- WordPress REST source where suitable;
- sitemap crawler fallback;
- canonical-language and URL include/exclude policy;
- HTML extraction/normalization;
- content hash/versioning;
- `--dry-run` preview and sync report.

**Gate:** cleaned website knowledge can be inspected before embeddings are generated.

#### Phase 2B — File ingestion

- controlled file import boundary;
- support `.pdf`, `.docx`, `.txt`, `.md`, `.html` first;
- validate MIME/type/size;
- detect empty/failed extraction;
- source metadata and content hash;
- update/version/deactivate operations.

**Gate:** supported documents can be imported, inspected, updated and removed from active knowledge safely.

#### Phase 2C — Embeddings + indexing

- benchmark/select small multilingual local embedding model;
- test NL/EN/UA/RU cross-language retrieval;
- semantic chunking;
- embed only new/changed content;
- persist source/version attribution.

#### Phase 2D — Retrieval + scheduled updates

- storage-agnostic retrieval API;
- relevance threshold, top-K and deduplication;
- source/version attribution;
- cron/system-scheduled incremental website sync;
- status/error reporting;
- retrieval evaluation.

**Gate:** changed knowledge updates incrementally and the email assistant retrieves current, attributable chunks.

### Phase 3 — CRM context + drafting

- read-only CRM adapter;
- minimal projections;
- context builder;
- structured draft generation.

### Phase 4 — Telegram approval

- preview;
- Approve/Edit/Reject/Spam;
- authorization;
- audit trail.

### Phase 5 — SMTP

- approved-only sending;
- idempotency;
- retries;
- threading.

### Phase 6 — Evaluation and hardening

- real approval/edit metrics;
- prompt/RAG tuning;
- retention policy;
- backup/recovery;
- operational runbook.

Each phase must be independently testable and leave the existing CRM operational.

## 21. Definition of Done — V1

V1 is complete when:

- all inference and embeddings are local;
- `qwen3:0.6b` is configurable and runs via Ollama;
- a new email can flow through ingestion, classification, CRM/RAG context and drafting;
- no email is sent without explicit Telegram approval;
- rejected/spam actions do not send;
- sending is idempotent;
- model output is schema-validated;
- prompt injection cannot grant additional capabilities;
- CRM queries are read-only and minimally projected;
- website knowledge can be discovered and incrementally updated;
- supported files can be imported, versioned and deactivated;
- unchanged knowledge is not unnecessarily re-embedded;
- retrieval results remain attributable to source and version;
- relevant automated tests pass;
- server resource measurements are documented;
- setup and rollback instructions exist;
- no regression is introduced into HHDC Admin.

## 22. Future V2

Only after V1 data supports it, consider:

- `qwen3:1.7b` after resource benchmark;
- richer thread memory;
- attachment processing;
- CRM actions with separate explicit approvals;
- `pgvector`;
- MCP for reusable external tools;
- limited agentic workflows;
- fine-tuning from approved/edited responses.

These are not V1 requirements.
