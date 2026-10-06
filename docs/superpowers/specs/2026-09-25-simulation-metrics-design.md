# Email simulation metrics

## Intent

The "Симуляция письма" admin panel (`KnowledgeBasePage`) already runs the real email-assistant
pipeline (normalize → deterministic spam check → classify → RAG retrieve → draft) against a
hand-written subject/body, without touching `ai_email_messages`/`ai_email_drafts` and without
sending anything. An admin uses it to try candidate prompts and compare the local (Ollama) and
cloud (OpenAI) draft providers before activating either for real traffic.

Right now the panel shows only the final parsed output of each stage (classification fields,
retrieved chunks, draft text). It discards everything the underlying LLM calls already return
about cost and latency: token counts, wall-clock duration, and which model actually answered. An
admin cannot currently tell whether one prompt is slower or more token-hungry than another, or
compare Ollama vs. OpenAI on anything but the text they produced.

This feature captures that metadata for every LLM-touching stage of a simulation run
(classification, query expansion, retrieval embedding, reranking, draft) and persists every run
so an admin can compare prompts/providers over time, not just within a single run.

## Explicit scope boundary

Metrics are captured and stored **only** for the simulation panel. The real inbound-email
pipeline (`ai_email_messages`, `ai_email_classifications`, `ai_email_drafts`) is not touched —
that invariant ("simulation never writes to production AI-email tables") predates this feature
and stays. If per-email production metrics are ever wanted, that is a separate, later decision
because it touches the live processing hot path and existing tables with real customer data.

## Data model

Two new tables, additive only, no changes to existing `ai_email_*`/`ai_prompts` models:

```prisma
enum AiSimulationStage {
  CLASSIFICATION
  QUERY_EXPANSION
  RETRIEVAL_EMBEDDING
  RERANK
  DRAFT
}

model AiSimulationRun {
  id                       Int       @id @default(autoincrement())
  fromAddress              String?   @map("from_address") @db.VarChar(320)
  subject                  String    @db.VarChar(500)
  body                     String    @db.Text
  topK                     Int?      @map("top_k")
  noKnowledge              Boolean   @default(false) @map("no_knowledge")
  forceDraft               Boolean   @default(false) @map("force_draft")
  noQueryExpansion         Boolean   @default(false) @map("no_query_expansion")
  noRerank                 Boolean   @default(false) @map("no_rerank")
  classificationPromptId   Int?      @map("classification_prompt_id")
  classificationPromptName String?   @map("classification_prompt_name") @db.VarChar(191)
  draftBodyPromptId        Int?      @map("draft_body_prompt_id")
  draftBodyPromptName      String?   @map("draft_body_prompt_name") @db.VarChar(191)
  draftProvider            AiDraftProvider? @map("draft_provider")
  draftModel               String?   @map("draft_model") @db.VarChar(191)
  deterministicSpamReason  String?   @map("deterministic_spam_reason") @db.VarChar(191)
  draftSkippedReason       String?   @map("draft_skipped_reason") @db.VarChar(191)
  createdById               String?  @map("created_by_id") @db.VarChar(191)
  createdAt                DateTime  @default(now()) @map("created_at")

  metrics AiSimulationRunMetric[]

  @@index([createdAt])
  @@index([draftProvider, draftModel])
  @@map("ai_simulation_runs")
}

model AiSimulationRunMetric {
  id               Int               @id @default(autoincrement())
  runId            Int               @map("run_id")
  stage            AiSimulationStage
  provider         AiDraftProvider
  model            String            @db.VarChar(191)
  callCount        Int               @default(1) @map("call_count")
  durationMs       Int               @map("duration_ms")
  promptTokens     Int?              @map("prompt_tokens")
  completionTokens Int?              @map("completion_tokens")
  totalTokens      Int?              @map("total_tokens")
  meta             Json?
  createdAt        DateTime          @default(now()) @map("created_at")

  run AiSimulationRun @relation(fields: [runId], references: [id], onDelete: Cascade)

  @@index([runId])
  @@index([stage, provider, model])
  @@map("ai_simulation_run_metrics")
}
```

`AiSimulationRun` reuses the existing `AiDraftProvider` enum (already defined for
`AiEmailDraft.provider`). `classificationPromptId`/`draftBodyPromptId` are plain nullable ints
(no FK) with a denormalized `*PromptName` snapshot captured at run time — the name is what an
admin scans a comparison table by, and it must stay readable even if the underlying `AiPrompt`
row is later renamed or deleted. `null` id means "the active prompt for that slot was used".

A stage that makes multiple LLM calls in one run (reranking's bi-encoder fallback re-embeds every
candidate chunk — see `reranker.service.ts`) is stored as **one** aggregated `RERANK` row
(`callCount` = number of embed calls, `durationMs`/`*Tokens` summed), not one row per candidate.
Row-per-candidate would make the table noisy without adding comparison value; `meta` records
`{ nativeRerankUsed: boolean, candidateCount: number }` so it's still clear which path ran.

## Metric capture

`classifyEmail()` and `generateDraft()` are called from the real production pipeline too
(`ollama.client.ts`, `openai.client.ts` via `draft-provider.factory.ts`), so their return types
cannot change to also carry metrics — that would force every caller, including the cron/worker
send path, to handle a new shape for no benefit outside simulation.

Instead, every LLM-calling client accepts an optional collector in its constructor options:

```ts
export interface LlmCallMetric {
  stage: AiSimulationStage;
  provider: AiDraftProviderName;
  model: string;
  durationMs: number;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  meta?: Record<string, unknown>;
}

onMetric?: (metric: LlmCallMetric) => void;
```

Added to `OllamaLlmClientOptions`, `OpenAiClientOptions`, and the query-expansion/embedding/
reranker option types. Each site that already does a raw `fetch` wraps it with `Date.now()`
before/after and reads fields the provider response already contains but the code currently
discards:

- Ollama `/api/generate` (classification, draft): `prompt_eval_count` → `promptTokens`,
  `eval_count` → `completionTokens`.
- Ollama `/api/embed` (retrieval embedding, rerank fallback): `prompt_eval_count` when present.
- OpenAI `/chat/completions`: `usage.prompt_tokens` / `usage.completion_tokens` /
  `usage.total_tokens`.
- Native Ollama `/api/rerank`: duration only (no token semantics for that endpoint).

When `onMetric` is not supplied (every existing production call site), nothing changes — this is
purely additive instrumentation, not a new required parameter.

`simulation.service.ts` creates a local `metrics: LlmCallMetric[]`, passes
`onMetric: (m) => metrics.push(m)` into every client it constructs for that run
(`OllamaLlmClient`, `OllamaEmbeddingClient`, `OllamaQueryExpansionClient`, `OllamaReranker`, and
whichever `DraftProvider` `createDraftProviderFactory()` resolves), and after the pipeline
finishes, writes one `AiSimulationRun` plus its `AiSimulationRunMetric[]` in a single
`prisma.$transaction`. A persistence failure must not fail the simulation response — the admin
still gets their preview even if the history write has a problem; the error is logged, not
surfaced as a simulation failure.

## API

- `POST /ai-email/simulate` — request contract unchanged. Response gains `runId: number` and
  `metrics: AiSimulationRunMetric[]` (the rows just written) alongside the existing fields.
- `GET /ai-email/simulation-runs` — paginated list for the comparison table. Query params:
  `promptId` (matches either prompt slot), `provider`, `_page`, `_limit` (same convention as
  `GET /invoices` and the knowledge-base list). Returns run summaries with their metrics, without
  the full `body` text (kept short for a table row; full body available via the detail route).
- `GET /ai-email/simulation-runs/:id` — full run detail (body included) for drilling into one
  historical run.

All three routes sit in the existing `ai-email` admin router, same `ADMIN`-only guard as
`/ai-email/settings` and `/ai-email/simulate`.

## UI

- Existing result blocks (`ClassificationBlock`, `KnowledgeBlock`, `DraftBlock` in
  `EmailSimulationPanel.tsx`) each gain a small metrics line under their heading, e.g.
  `qwen3:0.6b · 214ms · 312→48 токенов`. Stages with only duration (native rerank) omit the
  token part rather than showing a placeholder.
- A new "История симуляций" section on the same page: a table of past runs (date, prompts used,
  draft provider/model, summed tokens, total duration, spam/confidence outcome), filterable by
  prompt and provider, backed by `GET /ai-email/simulation-runs`. Row click loads the full
  historical result into the same result blocks used for a fresh run (read-only, no re-run).

## Testing

- Unit: Ollama/OpenAI response parsing into `LlmCallMetric` (token fields present/absent,
  malformed responses don't throw), rerank aggregation (native vs. fallback path, `callCount`
  summation).
- Service: `simulation.service.ts` writes one `AiSimulationRun` + correct per-stage
  `AiSimulationRunMetric` rows for a full run (knowledge found, no knowledge, spam short-circuit,
  forced draft), and that persistence failure doesn't throw out of `runEmailAssistantSimulation`.
- Controller: `GET /ai-email/simulation-runs` pagination/filtering, `ADMIN`-only on all three
  routes.
- Client: metrics line renders per stage, history table renders/filters, row click loads detail.
- Run via `npm run test:local-ai` (server) after implementation; no `test:ci` list change needed
  since that suite already aggregates the local-ai domain script.

## Out of scope

- Any change to the real inbound-email pipeline or its persistence (`ai_email_messages`,
  `ai_email_classifications`, `ai_email_drafts`) — see "Explicit scope boundary" above.
- Per-candidate reranking metric rows (aggregated into one `RERANK` row per run instead).
- Cost/pricing calculations (USD estimates from token counts) — token counts are stored raw;
  pricing tables change too often to hardcode and are not part of this request.
- Retention/cleanup policy for `ai_simulation_runs` — every run is kept indefinitely for now;
  revisit if the table grows large enough to matter.
- Exporting simulation history (CSV/etc.) — the list/detail API is enough for now; a UI table is
  the only consumer.
