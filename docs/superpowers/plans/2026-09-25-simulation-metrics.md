# Email Simulation Metrics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Capture token/duration/model metadata for every LLM-touching stage of an email-assistant simulation run, persist every run to a new history table, and show both the per-run metrics and a browsable history in the "Симуляция письма" admin panel.

**Architecture:** Every concrete Ollama/OpenAI client used by `simulation.service.ts` gains an optional `onMetric` constructor callback that fires once per logical call with `{durationMs, callCount, promptTokens?, completionTokens?, totalTokens?}`, reading fields the provider responses already return but the code currently discards. `simulation.service.ts` collects these into an array, tags each with its pipeline stage, and — after the pipeline finishes — writes one `AiSimulationRun` row plus its `AiSimulationRunMetric` rows in a single transaction via a new Prisma-backed repository. Persistence failure is caught and logged, never thrown, so a DB hiccup never breaks the admin's simulation preview. Two new read endpoints expose the history for a new browsable table in the UI.

**Tech Stack:** TypeScript, Express 5, Prisma 6 (MySQL), Zod, React 19, `node:test` (server), Jest + Testing Library (client).

**Spec:** `docs/superpowers/specs/2026-09-25-simulation-metrics-design.md`

## Global Constraints

- Metrics are captured and stored **only** for the simulation panel — the real inbound-email pipeline (`ai_email_messages`, `ai_email_classifications`, `ai_email_drafts`) is never touched by this feature.
- Every `onMetric` option added to an existing client is optional and defaults to `undefined` — every existing production call site (cron worker, real-email draft pipeline) keeps compiling and behaving identically with zero changes.
- A stage that makes multiple LLM calls in one run (reranking's bi-encoder fallback) is stored as **one** aggregated `AiSimulationRunMetric` row (`callCount` > 1), never one row per candidate.
- A metric is only emitted for a **successful** call. A thrown/failed HTTP call emits no metric row for that attempt — this is a conscious scope limit (see spec's "Out of scope"), not an oversight.
- Persisting a simulation run must never throw out of `runEmailAssistantSimulation` — a DB failure is caught, logged, and the caller still gets its preview (`runId: null`).
- No AI attribution trailers in commits (repo rule, `AGENTS.md`).
- Conventional Commits (`feat:`, `fix:`, `refactor:`, `chore:`) for every commit in this plan.
- Server tests run per-domain (no single `test` script) — use `npm run test:local-ai` from `server/` after each server task; run `npm run lint:ts && npm test` from `client/` after each client task.

## Review Focus

- A DB write failure when persisting a run (constraint violation, connection drop) must not turn a working simulation into a 500 for the admin — Task 10's test drives this with a repository fake that throws.
- An Ollama response missing `prompt_eval_count`/`eval_count` (older Ollama build, or a non-generate response shape) must produce a metric with `durationMs` only, never throw while parsing — Task 2's test covers a response with no token fields.
- Classification's repair-retry (up to 2 HTTP attempts for one `classifyEmail()` call) must report the **summed** duration/tokens across both attempts, not just the last one, or an admin comparing prompts would under-count retry cost — Task 2's test exercises the retry path.
- When Ollama's native `/api/rerank` fails and the bi-encoder fallback runs, exactly **one** `RERANK` metric must be emitted (not one for the failed native attempt plus one for the fallback), or the run's token/duration totals would be double-counted — Task 6's test asserts a single `onMetric` call across the native-fails-then-fallback-succeeds path.
- `GET /ai-email/simulation-runs` with a garbage `_page`, `_limit` over 100, or an unknown `provider` value must return 400, not throw or silently return unfiltered data — Task 11's test covers invalid query params.

---

## File Structure

**Server — new files:**
- `server/prisma/schema/ai-simulation.prisma` — `AiSimulationStage` enum, `AiSimulationRun`, `AiSimulationRunMetric` models.
- `server/prisma/migrations/20260925120000_add_ai_simulation_metrics/migration.sql` — hand-written migration (shadow-DB workaround, see project convention below).
- `server/src/modules/ai-email-assistant/simulation-metrics.repository.ts` — `SimulationRunRepository` interface + Prisma implementation (`create`/`list`/`getById`).
- `server/src/modules/ai-email-assistant/simulation-metrics.repository.test.ts` — unit tests for the pure row-shaping helper it exports.
- `server/src/modules/ai-email-assistant/draft-provider.factory.test.ts` — new, factory threads `onMetric` to the constructed provider.

**Server — modified files:**
- `server/prisma/schema/user.prisma` — back-relation for `AiSimulationRun.createdBy`.
- `server/src/modules/ai-email-assistant/draft-provider.ts` — add `LlmCallMetric` type.
- `server/src/modules/ai-email-assistant/ollama.client.ts` — `onMetric` option, emits for `classifyEmail`/`generateDraft`.
- `server/src/modules/ai-email-assistant/ollama.client.test.ts` — new metric-capture tests + fake repository update.
- `server/src/modules/ai-email-assistant/openai.client.ts` — `onMetric` option, reads `usage` from the response.
- `server/src/modules/ai-email-assistant/openai.client.test.ts` — new metric-capture test.
- `server/src/modules/ai-email-assistant/draft-provider.factory.ts` — `getSelectedProvider(onMetric?)`.
- `server/src/modules/knowledge-ingestion/query-expansion.service.ts` — `onMetric` option.
- `server/src/modules/knowledge-ingestion/query-expansion.service.test.ts` — new metric-capture tests.
- `server/src/modules/knowledge-ingestion/reranker.service.ts` — `onMetric` option, single-emission native/fallback split.
- `server/src/modules/knowledge-ingestion/reranker.service.test.ts` — new metric-capture tests.
- `server/src/modules/knowledge-ingestion/retrieval.service.ts` — `onMetric` option around the query-embed call.
- `server/src/modules/knowledge-ingestion/retrieval.service.test.ts` — new metric-capture test.
- `server/src/modules/ai-email-assistant/prompt-library.service.ts` — `getNameById` on the repository interface.
- `server/src/modules/ai-email-assistant/simulation.service.ts` — wires every client's `onMetric`, builds and persists the run record, returns `runId`/`metrics`.
- `server/src/modules/ai-email-assistant/simulation.controller.ts` — simulate response includes `runId`/`metrics`; new `listSimulationRuns`/`getSimulationRun` controllers.
- `server/src/modules/ai-email-assistant/simulation.controller.test.ts` — new schema/controller tests.
- `server/src/modules/ai-email-assistant/simulation.routes.ts` — two new `GET` routes.
- `server/scripts/test-email-flow.ts` — prints the metrics section, reusing the existing `section()` helper.
- `docs/schema.md` — document the two new tables.

**Client — new files:**
- `client/src/pages/KnowledgeBasePage/simulationHistoryTypes.ts`
- `client/src/pages/KnowledgeBasePage/useSimulationHistory.ts`
- `client/src/pages/KnowledgeBasePage/ui/SimulationHistoryPanel.tsx`

**Client — modified files:**
- `client/src/pages/KnowledgeBasePage/emailSimulationTypes.ts` — `SimulationMetric`, `runId`/`metrics` on the result.
- `client/src/pages/KnowledgeBasePage/ui/EmailSimulationPanel.tsx` — metrics line per stage block.
- `client/src/pages/KnowledgeBasePage/ui/KnowledgeBasePage.tsx` — mounts `SimulationHistoryPanel`.
- `client/src/pages/KnowledgeBasePage/ui/KnowledgeBasePage.module.scss` — `.simulationMetric` style.
- `client/src/pages/KnowledgeBasePage/ui/KnowledgeBasePage.test.tsx` — new tests for metrics rendering + history panel.

---

### Task 1: Prisma schema, migration, docs

**Files:**
- Create: `server/prisma/schema/ai-simulation.prisma`
- Modify: `server/prisma/schema/user.prisma:97` (add back-relation line)
- Create: `server/prisma/migrations/20260925120000_add_ai_simulation_metrics/migration.sql`
- Modify: `docs/schema.md`

**Interfaces:**
- Produces: Prisma models `AiSimulationRun`, `AiSimulationRunMetric`, enum `AiSimulationStage` — every later server task imports these via `@prisma/client` and `prisma/prisma-client`.

This project's local DB user cannot create Prisma's shadow database, so `prisma migrate dev` fails here — migrations are hand-written to match Prisma's own generated SQL style, then applied with `migrate deploy` (see the two-line note in `tasks/plan.md` around the `ai_prompts` migration for the precedent this follows).

- [ ] **Step 1: Write the new schema file**

```prisma
// server/prisma/schema/ai-simulation.prisma
enum AiSimulationStage {
  CLASSIFICATION
  QUERY_EXPANSION
  RETRIEVAL_EMBEDDING
  RERANK
  DRAFT
}

// One row per "Симуляция письма" panel run — never written to by the real inbound-email
// pipeline (ai_email_messages/ai_email_classifications/ai_email_drafts stay untouched). Captures
// enough of the input/output to compare prompts and providers over time without needing to
// re-run history: classificationJson/knowledgeJson/draftJson snapshot the full pipeline output so
// a saved run can be inspected later even if the AiPrompt it used is since edited or deleted (see
// the denormalized *PromptName columns for the same reason).
model AiSimulationRun {
  id                        Int              @id @default(autoincrement())
  fromAddress               String?          @map("from_address") @db.VarChar(320)
  subject                   String           @db.VarChar(500)
  body                      String           @db.Text
  topK                      Int?             @map("top_k")
  noKnowledge               Boolean          @default(false) @map("no_knowledge")
  forceDraft                Boolean          @default(false) @map("force_draft")
  noQueryExpansion          Boolean          @default(false) @map("no_query_expansion")
  noRerank                  Boolean          @default(false) @map("no_rerank")
  classificationPromptId    Int?             @map("classification_prompt_id")
  classificationPromptName  String?          @map("classification_prompt_name") @db.VarChar(191)
  draftBodyPromptId         Int?             @map("draft_body_prompt_id")
  draftBodyPromptName       String?          @map("draft_body_prompt_name") @db.VarChar(191)
  draftProvider             AiDraftProvider? @map("draft_provider")
  draftModel                String?          @map("draft_model") @db.VarChar(191)
  classificationSpam        Boolean?         @map("classification_spam")
  classificationNeedsReply  Boolean?         @map("classification_needs_reply")
  classificationConfidence  Float?           @map("classification_confidence")
  classificationJson        Json?            @map("classification_json")
  knowledgeJson             Json?            @map("knowledge_json")
  draftJson                 Json?            @map("draft_json")
  deterministicSpamReason   String?          @map("deterministic_spam_reason") @db.VarChar(191)
  draftSkippedReason        String?          @map("draft_skipped_reason") @db.VarChar(191)
  createdById                Int?            @map("created_by_id")
  createdAt                 DateTime         @default(now()) @map("created_at")

  metrics   AiSimulationRunMetric[]
  createdBy User?                   @relation("AiSimulationRunCreatedBy", fields: [createdById], references: [id], onDelete: SetNull)

  @@index([createdAt])
  @@index([draftProvider, draftModel])
  @@index([createdById])
  @@map("ai_simulation_runs")
}

// A stage that makes several LLM calls in one run (reranking's bi-encoder fallback re-embeds
// every candidate chunk) is stored as ONE row with callCount > 1 and summed duration — not one
// row per candidate, which would make cross-run comparison noisy without adding value. `meta`
// carries stage-specific extras (currently just RERANK's `nativeRerankUsed`/`candidateCount`).
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

- [ ] **Step 2: Add the back-relation on `User`**

In `server/prisma/schema/user.prisma`, right after line 97 (`aiRuntimeSettingsUpdates ... @relation("AiRuntimeSettingsUpdatedBy")`), add:

```prisma
  aiSimulationRuns                   AiSimulationRun[]          @relation("AiSimulationRunCreatedBy")
```

- [ ] **Step 3: Write the migration by hand**

Create `server/prisma/migrations/20260925120000_add_ai_simulation_metrics/migration.sql`:

```sql
-- CreateTable
CREATE TABLE `ai_simulation_runs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `from_address` VARCHAR(320) NULL,
    `subject` VARCHAR(500) NOT NULL,
    `body` TEXT NOT NULL,
    `top_k` INTEGER NULL,
    `no_knowledge` BOOLEAN NOT NULL DEFAULT false,
    `force_draft` BOOLEAN NOT NULL DEFAULT false,
    `no_query_expansion` BOOLEAN NOT NULL DEFAULT false,
    `no_rerank` BOOLEAN NOT NULL DEFAULT false,
    `classification_prompt_id` INTEGER NULL,
    `classification_prompt_name` VARCHAR(191) NULL,
    `draft_body_prompt_id` INTEGER NULL,
    `draft_body_prompt_name` VARCHAR(191) NULL,
    `draft_provider` ENUM('OLLAMA', 'OPENAI') NULL,
    `draft_model` VARCHAR(191) NULL,
    `classification_spam` BOOLEAN NULL,
    `classification_needs_reply` BOOLEAN NULL,
    `classification_confidence` DOUBLE NULL,
    `classification_json` JSON NULL,
    `knowledge_json` JSON NULL,
    `draft_json` JSON NULL,
    `deterministic_spam_reason` VARCHAR(191) NULL,
    `draft_skipped_reason` VARCHAR(191) NULL,
    `created_by_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `ai_simulation_runs_created_at_idx`(`created_at`),
    INDEX `ai_simulation_runs_draft_provider_draft_model_idx`(`draft_provider`, `draft_model`),
    INDEX `ai_simulation_runs_created_by_id_idx`(`created_by_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ai_simulation_run_metrics` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `run_id` INTEGER NOT NULL,
    `stage` ENUM('CLASSIFICATION', 'QUERY_EXPANSION', 'RETRIEVAL_EMBEDDING', 'RERANK', 'DRAFT') NOT NULL,
    `provider` ENUM('OLLAMA', 'OPENAI') NOT NULL,
    `model` VARCHAR(191) NOT NULL,
    `call_count` INTEGER NOT NULL DEFAULT 1,
    `duration_ms` INTEGER NOT NULL,
    `prompt_tokens` INTEGER NULL,
    `completion_tokens` INTEGER NULL,
    `total_tokens` INTEGER NULL,
    `meta` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `ai_simulation_run_metrics_run_id_idx`(`run_id`),
    INDEX `ai_simulation_run_metrics_stage_provider_model_idx`(`stage`, `provider`, `model`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ai_simulation_runs` ADD CONSTRAINT `ai_simulation_runs_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `ai_simulation_run_metrics` ADD CONSTRAINT `ai_simulation_run_metrics_run_id_fkey` FOREIGN KEY (`run_id`) REFERENCES `ai_simulation_runs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
```

- [ ] **Step 4: Cross-check the hand-written SQL against Prisma's own diff**

Run from `server/`:

```bash
npx prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema --script
```

Compare the output to the hand-written `migration.sql` above. They should match column-for-column (same types, nullability, defaults, indexes, FKs). If Prisma's diff differs (e.g. a default it adds that the hand-written version is missing), fix the hand-written file, not the other way — the hand-written file is what actually gets committed and applied.

- [ ] **Step 5: Apply the migration and regenerate the client**

```bash
cd server
npx prisma migrate deploy --schema prisma/schema
npm run prisma:generate
```

Expected: `1 migration found... Applied`. `npx prisma studio` (or `npm run pmd:dev -- status`) can confirm `ai_simulation_runs`/`ai_simulation_run_metrics` now exist.

- [ ] **Step 6: Document the new tables in `docs/schema.md`**

Add a new `## ai-simulation.prisma` domain row to the table near the top of `docs/schema.md` (next to the existing `ai-email.prisma` row), and a new section following the file's existing per-model documentation format (see the `ai-email.prisma` section for the exact style: heading, "Поля:", "Связи:", "Индексы:"):

```markdown
## ai-simulation.prisma — метрики симуляции AI email assistant

### AiSimulationRun (таблица `ai_simulation_runs`)
Один запуск панели «Симуляция письма» — никогда не пишется реальным inbound-пайплайном.
- Поля: id Int @id autoincrement; fromAddress String?; subject String; body String @db.Text; topK Int?; noKnowledge/forceDraft/noQueryExpansion/noRerank Boolean @default(false); classificationPromptId/draftBodyPromptId Int? + денормализованные *PromptName String?; draftProvider AiDraftProvider?; draftModel String?; classificationSpam/classificationNeedsReply Boolean?; classificationConfidence Float?; classificationJson/knowledgeJson/draftJson Json?; deterministicSpamReason/draftSkippedReason String?; createdById Int?; createdAt DateTime @default(now())
- Связи: metrics -> AiSimulationRunMetric[]; createdBy -> User? (onDelete: SetNull)
- Индексы: createdAt; [draftProvider, draftModel]; createdById

### AiSimulationRunMetric (таблица `ai_simulation_run_metrics`)
Одна строка метрик на стадию пайплайна для одного запуска (classification/query expansion/retrieval embedding/rerank/draft).
- Поля: id Int @id autoincrement; runId Int; stage AiSimulationStage; provider AiDraftProvider; model String; callCount Int @default(1); durationMs Int; promptTokens/completionTokens/totalTokens Int?; meta Json?; createdAt DateTime @default(now())
- Связи: run -> AiSimulationRun (onDelete: Cascade)
- Индексы: runId; [stage, provider, model]

### Enum AiSimulationStage: CLASSIFICATION | QUERY_EXPANSION | RETRIEVAL_EMBEDDING | RERANK | DRAFT
```

- [ ] **Step 7: Commit**

```bash
git add server/prisma/schema/ai-simulation.prisma server/prisma/schema/user.prisma \
        server/prisma/migrations/20260925120000_add_ai_simulation_metrics docs/schema.md
git commit -m "feat(server): add ai_simulation_runs schema for simulation metrics history"
```

---

### Task 2: Ollama classify/draft metric capture

**Files:**
- Modify: `server/src/modules/ai-email-assistant/draft-provider.ts`
- Modify: `server/src/modules/ai-email-assistant/ollama.client.ts`
- Modify: `server/src/modules/ai-email-assistant/ollama.client.test.ts`

**Interfaces:**
- Produces: `LlmCallMetric { durationMs: number; callCount: number; promptTokens?: number; completionTokens?: number; totalTokens?: number }` (exported from `draft-provider.ts`); `OllamaLlmClientOptions.onMetric?: (metric: LlmCallMetric) => void`.
- Consumes: nothing new (existing `OllamaLlmClientOptions` fields).

- [ ] **Step 1: Add `LlmCallMetric` to `draft-provider.ts`**

Append to `server/src/modules/ai-email-assistant/draft-provider.ts`:

```ts
export interface LlmCallMetric {
  durationMs: number;
  callCount: number;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}
```

- [ ] **Step 2: Write the failing tests**

Add to `server/src/modules/ai-email-assistant/ollama.client.test.ts` (after the existing `getContentById: async () => null,` line in `fakePromptRepository`, add `getNameById: async () => null,` — required now that Task 8 adds it to the interface; add this line now so this file keeps compiling once Task 8 lands):

```ts
test('classifyEmail reports token usage and duration via onMetric', async () => {
    const metrics: Array<{ durationMs: number; callCount: number; promptTokens?: number; completionTokens?: number; totalTokens?: number }> = [];
    const client = new OllamaLlmClient({
        config, promptRepository: fakePromptRepository,
        onMetric: (metric) => metrics.push(metric),
        fetchImpl: async () => new Response(JSON.stringify({
            response: JSON.stringify({ spam: false, needsReply: true, language: 'nl', intent: 'trial_lesson', confidence: 0.9, reason: 'test' }),
            prompt_eval_count: 120, eval_count: 30,
        }), { status: 200 }),
    });
    await client.classifyEmail(input);
    assert.equal(metrics.length, 1);
    assert.equal(metrics[0].callCount, 1);
    assert.equal(metrics[0].promptTokens, 120);
    assert.equal(metrics[0].completionTokens, 30);
    assert.equal(metrics[0].totalTokens, 150);
    assert.ok(metrics[0].durationMs >= 0);
});

test('classifyEmail sums duration and tokens across the repair retry', async () => {
    const metrics: Array<{ callCount: number; promptTokens?: number; completionTokens?: number }> = [];
    let call = 0;
    const client = new OllamaLlmClient({
        config, promptRepository: fakePromptRepository,
        onMetric: (metric) => metrics.push(metric),
        fetchImpl: async () => {
            call += 1;
            if (call === 1) return new Response(JSON.stringify({ response: 'not json', prompt_eval_count: 50, eval_count: 10 }), { status: 200 });
            return new Response(JSON.stringify({
                response: JSON.stringify({ spam: false, needsReply: true, language: 'nl', intent: 'other', confidence: 0.5, reason: 'ok' }),
                prompt_eval_count: 60, eval_count: 15,
            }), { status: 200 });
        },
    });
    await client.classifyEmail(input);
    assert.equal(metrics.length, 1);
    assert.equal(metrics[0].callCount, 2);
    assert.equal(metrics[0].promptTokens, 110);
    assert.equal(metrics[0].completionTokens, 25);
});

test('classifyEmail reports duration-only metric when the response has no token fields', async () => {
    const metrics: Array<{ promptTokens?: number; completionTokens?: number; totalTokens?: number }> = [];
    const client = new OllamaLlmClient({
        config, promptRepository: fakePromptRepository,
        onMetric: (metric) => metrics.push(metric),
        fetchImpl: async () => new Response(JSON.stringify({
            response: JSON.stringify({ spam: false, needsReply: true, language: 'nl', intent: 'other', confidence: 0.5, reason: 'ok' }),
        }), { status: 200 }),
    });
    await client.classifyEmail(input);
    assert.equal(metrics[0].promptTokens, undefined);
    assert.equal(metrics[0].completionTokens, undefined);
    assert.equal(metrics[0].totalTokens, undefined);
});

test('generateDraft reports token usage via onMetric', async () => {
    const metrics: Array<{ callCount: number; totalTokens?: number }> = [];
    const client = new OllamaLlmClient({
        config, promptRepository: fakePromptRepository,
        onMetric: (metric) => metrics.push(metric),
        fetchImpl: async () => new Response(JSON.stringify({ response: 'Bedankt voor uw bericht.', prompt_eval_count: 200, eval_count: 40 }), { status: 200 }),
    });
    await client.generateDraft(draftContext);
    assert.equal(metrics.length, 1);
    assert.equal(metrics[0].callCount, 1);
    assert.equal(metrics[0].totalTokens, 240);
});
```

`draftContext` does not yet exist in this test file — add it near the top, alongside the existing `input`/`config` consts (it needs a minimal valid `DraftContext`; check `draft.service.ts`'s `DraftContext` shape used by `openai.client.test.ts` for the exact fields):

```ts
import type { DraftContext } from './draft.service';

const draftContext: DraftContext = {
    email: { fromAddress: 'parent@example.com', subject: 'Proefles', normalizedBody: 'Kan mijn dochter een proefles volgen?' },
    classification: { spam: false, needsReply: true, language: 'nl', intent: 'trial_lesson', confidence: 0.9, reason: 'test' },
    contact: null,
    knowledge: [],
};
```

- [ ] **Step 3: Run the new tests to verify they fail**

```bash
cd server
npx tsx --test src/modules/ai-email-assistant/ollama.client.test.ts
```

Expected: FAIL — `onMetric` does not exist on `OllamaLlmClientOptions`, or is never called.

- [ ] **Step 4: Implement in `ollama.client.ts`**

Add the import and a local token-extraction helper near the existing `ollamaResponseSchema` (around line 19):

```ts
import { DRAFT_PROVIDERS, type LlmCallMetric } from './draft-provider';

const extractOllamaTokenUsage = (value: unknown): { promptTokens?: number; completionTokens?: number } => {
    if (!value || typeof value !== 'object') return {};
    const body = value as { prompt_eval_count?: unknown; eval_count?: unknown };
    return {
        promptTokens: typeof body.prompt_eval_count === 'number' ? body.prompt_eval_count : undefined,
        completionTokens: typeof body.eval_count === 'number' ? body.eval_count : undefined,
    };
};
```

(The existing import line `import { DRAFT_PROVIDERS } from './draft-provider';` at line 11 becomes the line above — just add `type LlmCallMetric` to it.)

Add `onMetric` to the options interface and store it (around lines 38–46 and 80–94):

```ts
export interface OllamaLlmClientOptions {
    config?: AiConfig;
    fetchImpl?: typeof fetch;
    promptRepository?: AiPromptRepository;
    promptOverrides?: { classificationPromptId?: number; draftBodyPromptId?: number };
    onMetric?: (metric: LlmCallMetric) => void;
}
```

```ts
export class OllamaLlmClient implements LlmClient, DraftLlmClient {
    public readonly provider = DRAFT_PROVIDERS.OLLAMA;
    public readonly model: string;
    private readonly config: AiConfig;
    private readonly fetchImpl: typeof fetch;
    private readonly prompts: AiPromptRepository;
    private readonly promptOverrides: { classificationPromptId?: number; draftBodyPromptId?: number };
    private readonly onMetric?: (metric: LlmCallMetric) => void;

    public constructor(options: OllamaLlmClientOptions = {}) {
        this.config = options.config ?? aiConfig;
        this.model = this.config.ollamaModel;
        this.fetchImpl = options.fetchImpl ?? fetch;
        this.prompts = options.promptRepository ?? new PrismaAiPromptRepository();
        this.promptOverrides = options.promptOverrides ?? {};
        this.onMetric = options.onMetric;
    }
```

Replace `classifyEmail` (lines 101–143) with:

```ts
    public async classifyEmail(input: NormalizedEmailInput): Promise<EmailClassification> {
        let invalidOutput: string | undefined;
        const instructions = await this.resolveInstructions('CLASSIFICATION', this.promptOverrides.classificationPromptId);
        let totalDurationMs = 0;
        let totalPromptTokens = 0;
        let totalCompletionTokens = 0;

        for (let attempt = 0; attempt < 2; attempt += 1) {
            const start = Date.now();
            const response = await this.fetchImpl(`${this.config.ollamaUrl.replace(/\/$/, '')}/api/generate`, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    model: this.config.ollamaModel,
                    prompt: buildClassificationPrompt(instructions, input, invalidOutput),
                    stream: false,
                    keep_alive: this.config.keepAlive,
                    options: {
                        num_ctx: this.config.contextLength,
                        temperature: this.config.temperature,
                    },
                }),
            });
            totalDurationMs += Date.now() - start;

            if (!response.ok) {
                throw new Error(`Ollama classification failed with HTTP ${response.status}`);
            }

            const parsedBody = await response.json();
            const raw = ollamaResponseSchema(parsedBody);
            const usage = extractOllamaTokenUsage(parsedBody);
            totalPromptTokens += usage.promptTokens ?? 0;
            totalCompletionTokens += usage.completionTokens ?? 0;
            try {
                const classification = emailClassificationSchema.parse(JSON.parse(raw));
                this.onMetric?.({
                    durationMs: totalDurationMs,
                    callCount: attempt + 1,
                    promptTokens: totalPromptTokens || undefined,
                    completionTokens: totalCompletionTokens || undefined,
                    totalTokens: (totalPromptTokens || totalCompletionTokens) ? totalPromptTokens + totalCompletionTokens : undefined,
                });
                return classification;
            } catch (error) {
                if (attempt === 1) {
                    throw new Error(`Ollama returned invalid classification JSON after one repair retry: ${String(error)}`);
                }
                invalidOutput = raw;
            }
        }

        throw new Error('Ollama classification failed');
    }
```

Replace `generateDraft` (lines 145–172) with:

```ts
    public async generateDraft(context: DraftContext): Promise<EmailDraft> {
        const maxAttempts = 2;
        let lastError: unknown;
        const instructions = await this.resolveInstructions('DRAFT_BODY', this.promptOverrides.draftBodyPromptId);
        let totalDurationMs = 0;
        let totalPromptTokens = 0;
        let totalCompletionTokens = 0;
        for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
            const start = Date.now();
            const response = await this.fetchImpl(`${this.config.ollamaUrl.replace(/\/$/, '')}/api/generate`, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    model: this.config.ollamaModel,
                    prompt: buildDraftBodyPrompt(instructions, context),
                    stream: false,
                    think: false,
                    keep_alive: this.config.keepAlive,
                    options: { num_ctx: this.config.contextLength, temperature: this.config.temperature },
                }),
            });
            totalDurationMs += Date.now() - start;
            if (!response.ok) throw new Error(`Ollama draft generation failed with HTTP ${response.status}`);
            const parsedBody = await response.json();
            const usage = extractOllamaTokenUsage(parsedBody);
            totalPromptTokens += usage.promptTokens ?? 0;
            totalCompletionTokens += usage.completionTokens ?? 0;
            const body = ollamaResponseSchema(parsedBody).trim().slice(0, 6_000);
            if (body.length >= 5) {
                this.onMetric?.({
                    durationMs: totalDurationMs,
                    callCount: attempt + 1,
                    promptTokens: totalPromptTokens || undefined,
                    completionTokens: totalCompletionTokens || undefined,
                    totalTokens: (totalPromptTokens || totalCompletionTokens) ? totalPromptTokens + totalCompletionTokens : undefined,
                });
                return buildDeterministicDraft(context, body);
            }
            lastError = new Error(`Ollama returned an empty or too-short draft body: ${JSON.stringify(body)}`);
        }
        throw lastError instanceof Error ? lastError : new Error('Ollama draft generation failed');
    }
```

- [ ] **Step 5: Run the tests to verify they pass**

```bash
cd server
npx tsx --test src/modules/ai-email-assistant/ollama.client.test.ts
```

Expected: all tests, including the 4 new ones, PASS.

- [ ] **Step 6: Commit**

```bash
git add server/src/modules/ai-email-assistant/draft-provider.ts \
        server/src/modules/ai-email-assistant/ollama.client.ts \
        server/src/modules/ai-email-assistant/ollama.client.test.ts
git commit -m "feat(server): capture token/duration metrics for Ollama classify and draft calls"
```

---

### Task 3: OpenAI draft metric capture

**Files:**
- Modify: `server/src/modules/ai-email-assistant/openai.client.ts`
- Modify: `server/src/modules/ai-email-assistant/openai.client.test.ts`

**Interfaces:**
- Consumes: `LlmCallMetric` from `draft-provider.ts` (Task 2).
- Produces: `OpenAiClientOptions.onMetric?: (metric: LlmCallMetric) => void`.

- [ ] **Step 1: Write the failing test**

Add to `server/src/modules/ai-email-assistant/openai.client.test.ts`:

```ts
test('OpenAI adapter reports token usage and duration via onMetric', async () => {
  const metrics: Array<{ durationMs: number; callCount: number; promptTokens?: number; completionTokens?: number; totalTokens?: number }> = [];
  const client = new OpenAiDraftClient({
    config, onMetric: (metric) => metrics.push(metric),
    fetchImpl: async () => new Response(JSON.stringify({
      choices: [{ message: { content: 'Thanks for your message.' } }],
      usage: { prompt_tokens: 340, completion_tokens: 52, total_tokens: 392 },
    }), { status: 200 }),
  });
  await client.generateDraft(context);
  assert.equal(metrics.length, 1);
  assert.equal(metrics[0].callCount, 1);
  assert.equal(metrics[0].promptTokens, 340);
  assert.equal(metrics[0].completionTokens, 52);
  assert.equal(metrics[0].totalTokens, 392);
  assert.ok(metrics[0].durationMs >= 0);
});
```

(Add `import assert from 'node:assert/strict';` if not already present at the top — it already is, per the existing file.)

- [ ] **Step 2: Run it to verify it fails**

```bash
cd server
npx tsx --test src/modules/ai-email-assistant/openai.client.test.ts
```

Expected: FAIL — `onMetric` unknown option / never called.

- [ ] **Step 3: Implement in `openai.client.ts`**

Replace the top of the file (interfaces, lines 7–20) with:

```ts
import type { LlmCallMetric } from './draft-provider';

interface OpenAiResponse {
  choices?: Array<{ message?: { content?: string | null } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
}
export interface OpenAiClientOptions { config?: AiConfig; fetchImpl?: typeof fetch; promptRepository?: AiPromptRepository; model?: string; onMetric?: (metric: LlmCallMetric) => void; }

export class OpenAiDraftClient implements DraftProvider {
  public readonly provider = DRAFT_PROVIDERS.OPENAI;
  public readonly model: string;
  private readonly config: AiConfig;
  private readonly fetchImpl: typeof fetch;
  private readonly prompts: AiPromptRepository;
  private readonly onMetric?: (metric: LlmCallMetric) => void;
  public constructor(options: OpenAiClientOptions = {}) {
    this.config = options.config ?? aiConfig;
    this.model = options.model ?? this.config.openAiDefaultModel ?? this.config.ollamaModel;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.prompts = options.promptRepository ?? new PrismaAiPromptRepository();
    this.onMetric = options.onMetric;
  }
```

Replace `generateDraft` (the rest of the file) with:

```ts
  public async generateDraft(context: DraftContext): Promise<EmailDraft> {
    if (!this.config.openAiApiKey) throw new DraftProviderError('PROVIDER_NOT_CONFIGURED', 'OpenAI is not configured');
    const instructions = await this.prompts.getActiveContent('DRAFT_BODY').catch(() => DEFAULT_PROMPT_CONTENT.DRAFT_BODY);
    const baseUrl = (this.config.openAiBaseUrl ?? 'https://api.openai.com/v1').replace(/\/$/, '');
    let response: Response;
    const start = Date.now();
    try {
      response = await this.fetchImpl(`${baseUrl}/chat/completions`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${this.config.openAiApiKey}` }, body: JSON.stringify({ model: this.model, temperature: this.config.temperature, messages: [{ role: 'system', content: instructions }, { role: 'user', content: buildDraftBodyPrompt(instructions, context) }] }) });
    } catch (error) {
      throw new DraftProviderError('UNAVAILABLE', error instanceof Error ? error.message : 'OpenAI unavailable');
    }
    const durationMs = Date.now() - start;
    if (response.status === 408 || response.status === 504) throw new DraftProviderError('TIMEOUT', 'OpenAI request timed out');
    if (response.status === 429) throw new DraftProviderError('RATE_LIMITED', 'OpenAI rate limit reached');
    if (!response.ok) throw new DraftProviderError('UNAVAILABLE', `OpenAI request failed with HTTP ${response.status}`);
    let parsed: OpenAiResponse;
    try { parsed = await response.json() as OpenAiResponse; } catch { throw new DraftProviderError('INVALID_RESPONSE', 'OpenAI response was not valid JSON'); }
    const content = parsed.choices?.[0]?.message?.content;
    const body = content?.trim().slice(0, 6000) ?? '';
    if (body.length < 5) throw new DraftProviderError('INVALID_RESPONSE', 'OpenAI returned an empty draft');
    this.onMetric?.({
      durationMs, callCount: 1,
      promptTokens: parsed.usage?.prompt_tokens, completionTokens: parsed.usage?.completion_tokens, totalTokens: parsed.usage?.total_tokens,
    });
    try { return emailDraftSchema.parse(JSON.parse(body)); } catch { return buildDeterministicDraft(context, body); }
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd server
npx tsx --test src/modules/ai-email-assistant/openai.client.test.ts
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/modules/ai-email-assistant/openai.client.ts server/src/modules/ai-email-assistant/openai.client.test.ts
git commit -m "feat(server): capture token/duration metrics for OpenAI draft calls"
```

---

### Task 4: Thread `onMetric` through the draft-provider factory

**Files:**
- Modify: `server/src/modules/ai-email-assistant/draft-provider.factory.ts`
- Create: `server/src/modules/ai-email-assistant/draft-provider.factory.test.ts`

**Interfaces:**
- Consumes: `LlmCallMetric` (Task 2), `OllamaLlmClientOptions.onMetric`/`OpenAiClientOptions.onMetric` (Tasks 2–3).
- Produces: `getSelectedProvider(onMetric?: (metric: LlmCallMetric) => void): Promise<DraftProvider>` (optional second overload param, existing callers with zero args unaffected).

- [ ] **Step 1: Write the failing test**

Create `server/src/modules/ai-email-assistant/draft-provider.factory.test.ts`:

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import { createDraftProviderFactory } from './draft-provider.factory';
import { DRAFT_PROVIDERS } from './draft-provider';
import type { AiRuntimeSettingsRepository } from './runtime-settings.service';

const settingsRepository = (provider: 'OLLAMA' | 'OPENAI', model: string): AiRuntimeSettingsRepository => ({
  get: async () => ({ provider, model, updatedAt: new Date() }),
  update: async () => { throw new Error('not implemented'); },
});

test('getSelectedProvider threads onMetric into the constructed Ollama provider', async () => {
  const factory = createDraftProviderFactory(settingsRepository(DRAFT_PROVIDERS.OLLAMA, 'test-model'));
  const calls: unknown[] = [];
  const provider = await factory.getSelectedProvider((metric) => calls.push(metric));
  assert.equal(provider.provider, DRAFT_PROVIDERS.OLLAMA);
  // onMetric is only invoked when generateDraft actually runs — this test only proves it was
  // threaded through construction, not invoked yet.
  assert.equal(calls.length, 0);
});

test('getSelectedProvider threads onMetric into the constructed OpenAI provider', async () => {
  const factory = createDraftProviderFactory(settingsRepository(DRAFT_PROVIDERS.OPENAI, 'gpt-test'));
  const provider = await factory.getSelectedProvider(() => {});
  assert.equal(provider.provider, DRAFT_PROVIDERS.OPENAI);
  assert.equal(provider.model, 'gpt-test');
});

test('getSelectedProvider still works with no onMetric argument (existing production call sites)', async () => {
  const factory = createDraftProviderFactory(settingsRepository(DRAFT_PROVIDERS.OLLAMA, 'test-model'));
  const provider = await factory.getSelectedProvider();
  assert.equal(provider.provider, DRAFT_PROVIDERS.OLLAMA);
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
cd server
npx tsx --test src/modules/ai-email-assistant/draft-provider.factory.test.ts
```

Expected: FAIL — `getSelectedProvider` does not accept an argument.

- [ ] **Step 3: Implement**

Replace `server/src/modules/ai-email-assistant/draft-provider.factory.ts` in full:

```ts
import { OllamaLlmClient } from './ollama.client';
import { OpenAiDraftClient } from './openai.client';
import { DRAFT_PROVIDERS, type DraftProvider, type LlmCallMetric } from './draft-provider';
import { createPrismaAiRuntimeSettingsRepository, type AiRuntimeSettingsRepository, type AiRuntimeSettings } from './runtime-settings.service';

export const createDraftProviderFactory = (settingsRepository: AiRuntimeSettingsRepository = createPrismaAiRuntimeSettingsRepository()) => ({
  async getSelectedProvider(onMetric?: (metric: LlmCallMetric) => void): Promise<DraftProvider> {
    const settings = await settingsRepository.get();
    return settings.provider === DRAFT_PROVIDERS.OPENAI
      ? new OpenAiDraftClient({ model: settings.model, onMetric })
      : new OllamaLlmClient({ onMetric });
  },
  async testSelectedProvider(): Promise<{ provider: AiRuntimeSettings['provider']; model: string }> {
    const settings = await settingsRepository.get();
    const provider = await this.getSelectedProvider();
    await provider.generateDraft({ email: { fromAddress: 'synthetic@example.com', subject: 'Synthetic test', normalizedBody: 'Synthetic provider connectivity test.' }, classification: { spam: false, needsReply: true, language: 'en', intent: 'other', confidence: 1, reason: 'synthetic' }, contact: null, knowledge: [] });
    return { provider: settings.provider, model: settings.model };
  },
});
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
cd server
npx tsx --test src/modules/ai-email-assistant/draft-provider.factory.test.ts
```

Expected: all 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/modules/ai-email-assistant/draft-provider.factory.ts server/src/modules/ai-email-assistant/draft-provider.factory.test.ts
git commit -m "feat(server): thread onMetric through the draft provider factory"
```

---

### Task 5: Query-expansion metric capture

**Files:**
- Modify: `server/src/modules/knowledge-ingestion/query-expansion.service.ts`
- Modify: `server/src/modules/knowledge-ingestion/query-expansion.service.test.ts`

**Interfaces:**
- Produces: `QueryExpansionMetric { durationMs: number; promptTokens?: number; completionTokens?: number; totalTokens?: number }`, `OllamaQueryExpansionClientOptions.onMetric?: (metric: QueryExpansionMetric) => void`.

- [ ] **Step 1: Check the existing test file's structure**

Read `server/src/modules/knowledge-ingestion/query-expansion.service.test.ts` first (it exists but hasn't been read in this plan) to match its exact `fetchImpl`/`config` fixture shape before adding new tests — copy the existing file's `config` object and `OllamaQueryExpansionClient` construction style exactly.

- [ ] **Step 2: Write the failing tests**

Add to `server/src/modules/knowledge-ingestion/query-expansion.service.test.ts`:

```ts
test('expand reports token usage and duration via onMetric on success', async () => {
    const metrics: Array<{ durationMs: number; promptTokens?: number; completionTokens?: number; totalTokens?: number }> = [];
    const client = new OllamaQueryExpansionClient({
        config, onMetric: (metric) => metrics.push(metric),
        fetchImpl: async () => new Response(JSON.stringify({
            response: JSON.stringify({ clean_query: 'цена абонемента', keywords: ['цена', 'абонемент'] }),
            prompt_eval_count: 80, eval_count: 20,
        }), { status: 200 }),
    });
    await client.expand('Сколько стоит абонемент?');
    assert.equal(metrics.length, 1);
    assert.equal(metrics[0].promptTokens, 80);
    assert.equal(metrics[0].completionTokens, 20);
    assert.equal(metrics[0].totalTokens, 100);
});

test('expand reports duration-only metric when the HTTP call fails', async () => {
    const metrics: Array<{ durationMs: number; promptTokens?: number }> = [];
    const client = new OllamaQueryExpansionClient({
        config, onMetric: (metric) => metrics.push(metric),
        fetchImpl: async () => { throw new Error('network down'); },
    });
    const result = await client.expand('query');
    assert.equal(result.cleanQuery, 'query');
    assert.equal(metrics.length, 1);
    assert.equal(metrics[0].promptTokens, undefined);
    assert.ok(metrics[0].durationMs >= 0);
});
```

(Use whatever `config` const name the existing file already defines — match it exactly; do not redeclare.)

- [ ] **Step 3: Run to verify failure**

```bash
cd server
npx tsx --test src/modules/knowledge-ingestion/query-expansion.service.test.ts
```

Expected: FAIL — `onMetric` unsupported.

- [ ] **Step 4: Implement**

In `server/src/modules/knowledge-ingestion/query-expansion.service.ts`, replace lines 110–152 (`OllamaQueryExpansionClientOptions` through the end of the class) with:

```ts
export interface QueryExpansionMetric {
    durationMs: number;
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
}

const extractOllamaTokenUsage = (value: unknown): { promptTokens?: number; completionTokens?: number } => {
    if (!value || typeof value !== 'object') return {};
    const body = value as { prompt_eval_count?: unknown; eval_count?: unknown };
    return {
        promptTokens: typeof body.prompt_eval_count === 'number' ? body.prompt_eval_count : undefined,
        completionTokens: typeof body.eval_count === 'number' ? body.eval_count : undefined,
    };
};

export interface OllamaQueryExpansionClientOptions {
    config?: AiConfig;
    fetchImpl?: typeof fetch;
    onMetric?: (metric: QueryExpansionMetric) => void;
}

// Every failure mode (network error, non-2xx, unparseable output) falls back to the original
// query plus locally-extracted keywords rather than throwing — query expansion is a best-effort
// quality improvement, never a hard dependency of retrieval.
export class OllamaQueryExpansionClient implements QueryExpansionClient {
    private readonly config: AiConfig;
    private readonly fetchImpl: typeof fetch;
    private readonly onMetric?: (metric: QueryExpansionMetric) => void;

    public constructor(options: OllamaQueryExpansionClientOptions = {}) {
        this.config = options.config ?? aiConfig;
        this.fetchImpl = options.fetchImpl ?? fetch;
        this.onMetric = options.onMetric;
    }

    public async expand(query: string): Promise<QueryExpansion> {
        const start = Date.now();
        try {
            const response = await this.fetchImpl(`${this.config.ollamaUrl.replace(/\/$/, '')}/api/generate`, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    model: this.config.ollamaModel,
                    prompt: buildExpansionPrompt(query),
                    stream: false,
                    keep_alive: this.config.keepAlive,
                    options: { num_ctx: this.config.contextLength, temperature: 0.1 },
                }),
            });
            const durationMs = Date.now() - start;
            if (!response.ok) {
                this.onMetric?.({ durationMs });
                return { cleanQuery: query, keywords: fallbackKeywords(query) };
            }
            const parsedBody = await response.json();
            const raw = ollamaResponseText(parsedBody);
            const usage = extractOllamaTokenUsage(parsedBody);
            this.onMetric?.({
                durationMs,
                promptTokens: usage.promptTokens,
                completionTokens: usage.completionTokens,
                totalTokens: (usage.promptTokens || usage.completionTokens) ? (usage.promptTokens ?? 0) + (usage.completionTokens ?? 0) : undefined,
            });
            const parsed = parseExpansionResponse(raw);
            if (!parsed) return { cleanQuery: query, keywords: fallbackKeywords(query) };
            return {
                cleanQuery: parsed.cleanQuery || query,
                keywords: parsed.keywords.length ? parsed.keywords : fallbackKeywords(query),
            };
        } catch {
            this.onMetric?.({ durationMs: Date.now() - start });
            return { cleanQuery: query, keywords: fallbackKeywords(query) };
        }
    }
}
```

- [ ] **Step 5: Run to verify pass**

```bash
cd server
npx tsx --test src/modules/knowledge-ingestion/query-expansion.service.test.ts
```

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add server/src/modules/knowledge-ingestion/query-expansion.service.ts server/src/modules/knowledge-ingestion/query-expansion.service.test.ts
git commit -m "feat(server): capture token/duration metrics for query expansion calls"
```

---

### Task 6: Reranker metric capture (single-emission native/fallback split)

**Files:**
- Modify: `server/src/modules/knowledge-ingestion/reranker.service.ts`
- Modify: `server/src/modules/knowledge-ingestion/reranker.service.test.ts`

**Interfaces:**
- Produces: `RerankMetric { durationMs: number; callCount: number; model: string; meta: { nativeRerankUsed: boolean; candidateCount: number } }`, constructor 2nd-arg option `onMetric?: (metric: RerankMetric) => void`.

- [ ] **Step 1: Write the failing tests**

Add to `server/src/modules/knowledge-ingestion/reranker.service.test.ts` (reuses the file's existing `config`/`candidates` consts, already read in this plan):

```ts
test('emits exactly one metric for the native rerank path, tagged nativeRerankUsed:true', async () => {
    const metrics: Array<{ callCount: number; model: string; meta: { nativeRerankUsed: boolean; candidateCount: number } }> = [];
    const reranker = new OllamaReranker({ embed: async () => [1, 0] }, {
        config, onMetric: (metric) => metrics.push(metric),
        fetchImpl: async () => new Response(JSON.stringify({ results: [{ index: 0, relevance_score: 0.5 }, { index: 1, relevance_score: 0.9 }] }), { status: 200 }),
    });
    await reranker.rerank('q', candidates, 5);
    assert.equal(metrics.length, 1);
    assert.equal(metrics[0].callCount, 1);
    assert.equal(metrics[0].model, config.ragRerankModel);
    assert.deepEqual(metrics[0].meta, { nativeRerankUsed: true, candidateCount: 2 });
});

test('emits exactly one aggregated metric when native fails and the bi-encoder fallback runs', async () => {
    const metrics: Array<{ callCount: number; model: string; meta: { nativeRerankUsed: boolean; candidateCount: number } }> = [];
    const embeddings = new Map([['q', [1, 0]], ['first', [0, 1]], ['second', [1, 0]]]);
    const reranker = new OllamaReranker(
        { embed: async (text: string) => embeddings.get(text) ?? [0, 0] },
        { config, onMetric: (metric) => metrics.push(metric), fetchImpl: async () => new Response('not found', { status: 404 }) },
    );
    await reranker.rerank('q', candidates, 5);
    assert.equal(metrics.length, 1);
    // callCount = 1 query embed + 1 embed per candidate
    assert.equal(metrics[0].callCount, 3);
    assert.equal(metrics[0].model, config.ollamaEmbeddingModel);
    assert.deepEqual(metrics[0].meta, { nativeRerankUsed: false, candidateCount: 2 });
});

test('emits no metric when both the native endpoint and the embedding fallback fail', async () => {
    const metrics: unknown[] = [];
    const reranker = new OllamaReranker(
        { embed: async () => { throw new Error('embedding service down'); } },
        { config, onMetric: (metric) => metrics.push(metric), fetchImpl: async () => { throw new Error('network down'); } },
    );
    await reranker.rerank('q', candidates, 5);
    assert.equal(metrics.length, 0);
});
```

- [ ] **Step 2: Run to verify failure**

```bash
cd server
npx tsx --test src/modules/knowledge-ingestion/reranker.service.test.ts
```

Expected: FAIL — `onMetric` unsupported / never invoked.

- [ ] **Step 3: Implement**

In `server/src/modules/knowledge-ingestion/reranker.service.ts`, replace the whole file's class-related section (from `export class OllamaReranker` to the end) — keep the top imports and `OllamaRerankResult` interface unchanged — with:

```ts
export interface RerankMetric {
    durationMs: number;
    callCount: number;
    model: string;
    meta: { nativeRerankUsed: boolean; candidateCount: number };
}

export class OllamaReranker implements KnowledgeReranker {
    private readonly config: AiConfig;
    private readonly embeddings: EmbeddingClient;
    private readonly fetchImpl: typeof fetch;
    private readonly onMetric?: (metric: RerankMetric) => void;

    public constructor(embeddings: EmbeddingClient, options: { config?: AiConfig; fetchImpl?: typeof fetch; onMetric?: (metric: RerankMetric) => void } = {}) {
        this.config = options.config ?? aiConfig;
        this.embeddings = embeddings;
        this.fetchImpl = options.fetchImpl ?? fetch;
        this.onMetric = options.onMetric;
    }

    public async rerank(query: string, candidates: ScoredKnowledgeChunk[], topK: number): Promise<ScoredKnowledgeChunk[]> {
        if (!candidates.length) return candidates;
        const nativeStart = Date.now();
        const native = await this.tryNativeRerank(query, candidates);
        if (native) {
            this.onMetric?.({
                durationMs: Date.now() - nativeStart, callCount: 1, model: this.config.ragRerankModel,
                meta: { nativeRerankUsed: true, candidateCount: candidates.length },
            });
            return native.slice(0, topK);
        }
        try {
            const bySimilarity = await this.rerankBySimilarity(query, candidates);
            return bySimilarity.slice(0, topK);
        } catch {
            return candidates.slice(0, topK);
        }
    }

    private async tryNativeRerank(query: string, candidates: ScoredKnowledgeChunk[]): Promise<ScoredKnowledgeChunk[] | null> {
        try {
            const response = await this.fetchImpl(`${this.config.ollamaUrl.replace(/\/$/, '')}/api/rerank`, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ model: this.config.ragRerankModel, query, documents: candidates.map((candidate) => candidate.content) }),
            });
            if (!response.ok) return null;
            const data = await response.json() as { results?: OllamaRerankResult[] };
            const results = Array.isArray(data.results) ? data.results : [];
            const ranked = results
                .filter((result): result is Required<OllamaRerankResult> => typeof result.index === 'number' && candidates[result.index] !== undefined)
                .map((result) => ({ candidate: candidates[result.index], relevance: result.relevance_score ?? 0 }))
                .sort((a, b) => b.relevance - a.relevance)
                .map((entry) => entry.candidate);
            return ranked.length ? ranked : null;
        } catch {
            return null;
        }
    }

    private async rerankBySimilarity(query: string, candidates: ScoredKnowledgeChunk[]): Promise<ScoredKnowledgeChunk[]> {
        const start = Date.now();
        const queryVector = await this.embeddings.embed(query);
        const scored: Array<{ candidate: ScoredKnowledgeChunk; similarity: number }> = [];
        for (const candidate of candidates) {
            const candidateVector = await this.embeddings.embed(candidate.content);
            scored.push({ candidate, similarity: cosineSimilarity(queryVector, candidateVector) });
        }
        this.onMetric?.({
            durationMs: Date.now() - start, callCount: candidates.length + 1, model: this.config.ollamaEmbeddingModel,
            meta: { nativeRerankUsed: false, candidateCount: candidates.length },
        });
        return scored.sort((a, b) => b.similarity - a.similarity).map((entry) => entry.candidate);
    }
}
```

Note the "no metric on total failure" behavior (3rd test): `rerankBySimilarity` throws before reaching its `onMetric?.()` call (since `this.embeddings.embed(query)` rejects immediately), and `rerank()`'s outer `catch` swallows it without emitting anything — matches the "only successful calls get a metric row" global constraint.

- [ ] **Step 4: Run to verify pass**

```bash
cd server
npx tsx --test src/modules/knowledge-ingestion/reranker.service.test.ts
```

Expected: all tests, including the 3 new ones and the 5 pre-existing ones, PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/modules/knowledge-ingestion/reranker.service.ts server/src/modules/knowledge-ingestion/reranker.service.test.ts
git commit -m "feat(server): capture single-emission rerank metrics for native and fallback paths"
```

---

### Task 7: Retrieval-embedding metric capture

**Files:**
- Modify: `server/src/modules/knowledge-ingestion/retrieval.service.ts`
- Modify: `server/src/modules/knowledge-ingestion/retrieval.service.test.ts`

**Interfaces:**
- Produces: `KnowledgeRetrievalServiceOptions.onMetric?: (metric: { durationMs: number }) => void`.

- [ ] **Step 1: Write the failing test**

Add to `server/src/modules/knowledge-ingestion/retrieval.service.test.ts`:

```ts
test('reports a single duration-only metric for the query embedding call', async () => {
    const repository = new InMemoryKnowledgeRepository();
    await repository.upsertChunks([
        { id: 'a1', documentId: 'a', sourceUrl: 'a', contentHash: 'v1', ordinal: 0, content: 'one', embedding: [1, 0] },
    ]);
    const metrics: Array<{ durationMs: number }> = [];
    const service = new KnowledgeRetrievalService({ embed: async () => [1, 0] }, repository, {
        onMetric: (metric) => metrics.push(metric),
    });
    await service.retrieve('query', { topK: 2, minimumScore: 0.5 });
    assert.equal(metrics.length, 1);
    assert.ok(metrics[0].durationMs >= 0);
});
```

- [ ] **Step 2: Run to verify failure**

```bash
cd server
npx tsx --test src/modules/knowledge-ingestion/retrieval.service.test.ts
```

Expected: FAIL — `onMetric` not a recognized option.

- [ ] **Step 3: Implement**

In `server/src/modules/knowledge-ingestion/retrieval.service.ts`:

Add `onMetric` to the options interface (around line 17–23):

```ts
export interface KnowledgeRetrievalServiceOptions {
    queryExpansion?: QueryExpansionClient;
    reranker?: KnowledgeReranker;
    onMetric?: (metric: { durationMs: number }) => void;
}
```

Add the field and wire it in the constructor (around lines 32–43):

```ts
export class KnowledgeRetrievalService {
    private readonly queryExpansion?: QueryExpansionClient;
    private readonly reranker?: KnowledgeReranker;
    private readonly onMetric?: (metric: { durationMs: number }) => void;

    public constructor(
        private readonly embeddings: EmbeddingClient,
        private readonly repository: KnowledgeRepository,
        options: KnowledgeRetrievalServiceOptions = {},
    ) {
        this.queryExpansion = options.queryExpansion;
        this.reranker = options.reranker;
        this.onMetric = options.onMetric;
    }
```

Wrap the embed call in `retrieveWithDetails` (around line 57–58):

```ts
        const { expansion, vectorQuery, bm25Query } = await this.resolveExpansion(query);

        const embedStart = Date.now();
        const vector = await this.embeddings.embed(vectorQuery);
        this.onMetric?.({ durationMs: Date.now() - embedStart });
        const candidates = await this.repository.search(vector, CANDIDATE_POOL_SIZE);
```

- [ ] **Step 4: Run to verify pass**

```bash
cd server
npx tsx --test src/modules/knowledge-ingestion/retrieval.service.test.ts
```

Expected: all tests, including the new one, PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/modules/knowledge-ingestion/retrieval.service.ts server/src/modules/knowledge-ingestion/retrieval.service.test.ts
git commit -m "feat(server): capture retrieval query-embedding duration metric"
```

---

### Task 8: `AiPromptRepository.getNameById`

**Files:**
- Modify: `server/src/modules/ai-email-assistant/prompt-library.service.ts`
- Modify: `server/src/modules/ai-email-assistant/prompt-library.service.test.ts` (create if it does not already exist — check first)

**Interfaces:**
- Produces: `AiPromptRepository.getNameById(id: number): Promise<string | null>`.

- [ ] **Step 1: Check for an existing test file**

```bash
ls server/src/modules/ai-email-assistant/prompt-library.service.test.ts
```

If it exists, read it fully and match its exact mocking style for the new test in Step 2 (it likely mocks `prisma` — follow whatever pattern is already there). If it does not exist, Step 2 creates it fresh using the `PrismaAiPromptRepository` class directly against a fake in-memory Prisma-shaped object is not standard here — in that case, skip a dedicated unit test for this one method and instead cover it through Task 10's `simulation.service.ts` integration test (which exercises `getNameById` via a fake repository injected into `runEmailAssistantSimulation`). Note in the commit message which path was taken.

- [ ] **Step 2: Implement**

In `server/src/modules/ai-email-assistant/prompt-library.service.ts`, add to the `AiPromptRepository` interface (line 64–72):

```ts
export interface AiPromptRepository {
    list(slot?: AiPromptSlot): Promise<AiPromptSummary[]>;
    getActiveContent(slot: AiPromptSlot): Promise<string>;
    getContentById(id: number): Promise<string | null>;
    getNameById(id: number): Promise<string | null>;
    create(input: CreateAiPromptInput): Promise<AiPromptSummary>;
    update(id: number, input: UpdateAiPromptInput): Promise<AiPromptSummary>;
    activate(id: number): Promise<AiPromptSummary>;
    remove(id: number): Promise<void>;
}
```

Add the implementation right after `getContentById` (line 99–102):

```ts
    public async getNameById(id: number): Promise<string | null> {
        const row = await prisma.aiPrompt.findUnique({ where: { id }, select: { name: true } });
        return row?.name ?? null;
    }
```

- [ ] **Step 3: Fix every fake implementing `AiPromptRepository`**

`server/src/modules/ai-email-assistant/ollama.client.test.ts`'s `fakePromptRepository` was already updated in Task 2, Step 2. Grep for any other implementers to be safe:

```bash
cd server
grep -rln "AiPromptRepository = {" src
```

Add `getNameById: async () => null,` to any other fake object literal this finds.

- [ ] **Step 4: Typecheck**

```bash
cd server
npm run typecheck
```

Expected: no errors (an interface with a missing method on a fake object literal fails here immediately if any fake was missed).

- [ ] **Step 5: Commit**

```bash
git add server/src/modules/ai-email-assistant/prompt-library.service.ts server/src/modules/ai-email-assistant/ollama.client.test.ts
git commit -m "feat(server): add AiPromptRepository.getNameById for simulation run snapshots"
```

---

### Task 9: Simulation run repository

**Files:**
- Create: `server/src/modules/ai-email-assistant/simulation-metrics.repository.ts`
- Create: `server/src/modules/ai-email-assistant/simulation-metrics.repository.test.ts`

**Interfaces:**
- Consumes: `AiSimulationRun`/`AiSimulationRunMetric`/`AiSimulationStage` Prisma models (Task 1).
- Produces:
  - `SimulationRunMetricInput { stage: AiSimulationStage; provider: AiDraftProvider; model: string; callCount: number; durationMs: number; promptTokens?: number; completionTokens?: number; totalTokens?: number; meta?: Record<string, unknown> }`
  - `SimulationRunInput` (full row shape, see below)
  - `SimulationRunSummary`, `SimulationRunDetail`
  - `SimulationRunRepository { create(input: SimulationRunInput): Promise<number>; list(filter, page): Promise<{ items: SimulationRunSummary[]; total: number }>; getById(id: number): Promise<SimulationRunDetail | null> }`
  - `createPrismaSimulationRunRepository(): SimulationRunRepository`
  - `buildSimulationRunMetricRow` (pure helper, unit tested directly — used by `simulation.service.ts` in Task 10 to shape each `SimulationRunMetricInput` before pushing to the collector array)

- [ ] **Step 1: Write the failing test for the pure row-shaping helper**

Create `server/src/modules/ai-email-assistant/simulation-metrics.repository.test.ts`:

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import { AiSimulationStage, AiDraftProvider } from '@prisma/client';
import { buildSimulationRunMetricRow } from './simulation-metrics.repository';

test('buildSimulationRunMetricRow merges the client-reported metric with stage/provider/model', () => {
    const row = buildSimulationRunMetricRow(AiSimulationStage.CLASSIFICATION, AiDraftProvider.OLLAMA, 'qwen3:0.6b', {
        durationMs: 214, callCount: 1, promptTokens: 120, completionTokens: 30, totalTokens: 150,
    });
    assert.deepEqual(row, {
        stage: AiSimulationStage.CLASSIFICATION, provider: AiDraftProvider.OLLAMA, model: 'qwen3:0.6b',
        callCount: 1, durationMs: 214, promptTokens: 120, completionTokens: 30, totalTokens: 150, meta: undefined,
    });
});

test('buildSimulationRunMetricRow defaults callCount to 1 for metrics that omit it', () => {
    const row = buildSimulationRunMetricRow(AiSimulationStage.RETRIEVAL_EMBEDDING, AiDraftProvider.OLLAMA, 'bge-m3', { durationMs: 40 });
    assert.equal(row.callCount, 1);
    assert.equal(row.promptTokens, undefined);
});
```

- [ ] **Step 2: Run to verify failure**

```bash
cd server
npx tsx --test src/modules/ai-email-assistant/simulation-metrics.repository.test.ts
```

Expected: FAIL — module/export does not exist.

- [ ] **Step 3: Implement**

Create `server/src/modules/ai-email-assistant/simulation-metrics.repository.ts`:

```ts
import { AiDraftProvider, AiSimulationStage, Prisma } from '@prisma/client';
import prisma from '../../../prisma/prisma-client';

export interface SimulationRunMetricInput {
    stage: AiSimulationStage;
    provider: AiDraftProvider;
    model: string;
    callCount: number;
    durationMs: number;
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    meta?: Record<string, unknown>;
}

// Merges whatever partial metric a client's onMetric callback reported (durationMs is the only
// field every client guarantees — see the client-specific metric shapes in ollama.client.ts,
// openai.client.ts, query-expansion.service.ts, reranker.service.ts, retrieval.service.ts) with
// the stage/provider/model the caller (simulation.service.ts) already knows statically.
export const buildSimulationRunMetricRow = (
    stage: AiSimulationStage,
    provider: AiDraftProvider,
    model: string,
    metric: { durationMs: number; callCount?: number; promptTokens?: number; completionTokens?: number; totalTokens?: number; meta?: Record<string, unknown> },
): SimulationRunMetricInput => ({
    stage, provider, model,
    callCount: metric.callCount ?? 1,
    durationMs: metric.durationMs,
    promptTokens: metric.promptTokens,
    completionTokens: metric.completionTokens,
    totalTokens: metric.totalTokens,
    meta: metric.meta,
});

export interface SimulationRunInput {
    fromAddress?: string;
    subject: string;
    body: string;
    topK?: number;
    noKnowledge: boolean;
    forceDraft: boolean;
    noQueryExpansion: boolean;
    noRerank: boolean;
    classificationPromptId?: number;
    classificationPromptName?: string;
    draftBodyPromptId?: number;
    draftBodyPromptName?: string;
    draftProvider?: AiDraftProvider;
    draftModel?: string;
    classificationSpam?: boolean;
    classificationNeedsReply?: boolean;
    classificationConfidence?: number;
    classificationJson?: unknown;
    knowledgeJson?: unknown;
    draftJson?: unknown;
    deterministicSpamReason?: string;
    draftSkippedReason?: string;
    createdById?: number;
    metrics: SimulationRunMetricInput[];
}

export interface SimulationRunSummary {
    id: number;
    fromAddress: string | null;
    subject: string;
    classificationPromptName: string | null;
    draftBodyPromptName: string | null;
    draftProvider: AiDraftProvider | null;
    draftModel: string | null;
    classificationSpam: boolean | null;
    classificationConfidence: number | null;
    deterministicSpamReason: string | null;
    draftSkippedReason: string | null;
    createdAt: Date;
    metrics: SimulationRunMetricInput[];
}

export interface SimulationRunDetail extends SimulationRunSummary {
    body: string;
    classification: unknown;
    knowledge: unknown;
    draft: unknown;
}

export interface SimulationRunListFilter { promptId?: number; provider?: AiDraftProvider; }
export interface SimulationRunPage { page: number; limit: number; }

export interface SimulationRunRepository {
    create(input: SimulationRunInput): Promise<number>;
    list(filter: SimulationRunListFilter, page: SimulationRunPage): Promise<{ items: SimulationRunSummary[]; total: number }>;
    getById(id: number): Promise<SimulationRunDetail | null>;
}

const toSummary = (row: {
    id: number; fromAddress: string | null; subject: string;
    classificationPromptName: string | null; draftBodyPromptName: string | null;
    draftProvider: AiDraftProvider | null; draftModel: string | null;
    classificationSpam: boolean | null; classificationConfidence: number | null;
    deterministicSpamReason: string | null; draftSkippedReason: string | null; createdAt: Date;
    metrics: Array<{ stage: AiSimulationStage; provider: AiDraftProvider; model: string; callCount: number; durationMs: number; promptTokens: number | null; completionTokens: number | null; totalTokens: number | null; meta: unknown }>;
}): SimulationRunSummary => ({
    id: row.id, fromAddress: row.fromAddress, subject: row.subject,
    classificationPromptName: row.classificationPromptName, draftBodyPromptName: row.draftBodyPromptName,
    draftProvider: row.draftProvider, draftModel: row.draftModel,
    classificationSpam: row.classificationSpam, classificationConfidence: row.classificationConfidence,
    deterministicSpamReason: row.deterministicSpamReason, draftSkippedReason: row.draftSkippedReason,
    createdAt: row.createdAt,
    metrics: row.metrics.map((metric) => ({
        stage: metric.stage, provider: metric.provider, model: metric.model, callCount: metric.callCount, durationMs: metric.durationMs,
        promptTokens: metric.promptTokens ?? undefined, completionTokens: metric.completionTokens ?? undefined, totalTokens: metric.totalTokens ?? undefined,
        meta: (metric.meta as Record<string, unknown> | null) ?? undefined,
    })),
});

export const createPrismaSimulationRunRepository = (): SimulationRunRepository => ({
    async create(input) {
        const created = await prisma.$transaction(async (transaction) => {
            const run = await transaction.aiSimulationRun.create({
                data: {
                    fromAddress: input.fromAddress, subject: input.subject, body: input.body, topK: input.topK,
                    noKnowledge: input.noKnowledge, forceDraft: input.forceDraft,
                    noQueryExpansion: input.noQueryExpansion, noRerank: input.noRerank,
                    classificationPromptId: input.classificationPromptId, classificationPromptName: input.classificationPromptName,
                    draftBodyPromptId: input.draftBodyPromptId, draftBodyPromptName: input.draftBodyPromptName,
                    draftProvider: input.draftProvider, draftModel: input.draftModel,
                    classificationSpam: input.classificationSpam, classificationNeedsReply: input.classificationNeedsReply,
                    classificationConfidence: input.classificationConfidence,
                    classificationJson: input.classificationJson as Prisma.InputJsonValue | undefined,
                    knowledgeJson: input.knowledgeJson as Prisma.InputJsonValue | undefined,
                    draftJson: input.draftJson as Prisma.InputJsonValue | undefined,
                    deterministicSpamReason: input.deterministicSpamReason, draftSkippedReason: input.draftSkippedReason,
                    createdById: input.createdById,
                },
            });
            if (input.metrics.length) {
                await transaction.aiSimulationRunMetric.createMany({
                    data: input.metrics.map((metric) => ({
                        runId: run.id, stage: metric.stage, provider: metric.provider, model: metric.model,
                        callCount: metric.callCount, durationMs: metric.durationMs,
                        promptTokens: metric.promptTokens, completionTokens: metric.completionTokens, totalTokens: metric.totalTokens,
                        meta: metric.meta as Prisma.InputJsonValue | undefined,
                    })),
                });
            }
            return run;
        });
        return created.id;
    },

    async list(filter, page) {
        const where = {
            ...(filter.provider ? { draftProvider: filter.provider } : {}),
            ...(filter.promptId ? { OR: [{ classificationPromptId: filter.promptId }, { draftBodyPromptId: filter.promptId }] } : {}),
        };
        const [rows, total] = await Promise.all([
            prisma.aiSimulationRun.findMany({
                where, orderBy: { createdAt: 'desc' }, skip: (page.page - 1) * page.limit, take: page.limit,
                include: { metrics: true },
            }),
            prisma.aiSimulationRun.count({ where }),
        ]);
        return { items: rows.map(toSummary), total };
    },

    async getById(id) {
        const row = await prisma.aiSimulationRun.findUnique({ where: { id }, include: { metrics: true } });
        if (!row) return null;
        return { ...toSummary(row), body: row.body, classification: row.classificationJson, knowledge: row.knowledgeJson ?? [], draft: row.draftJson };
    },
});
```

- [ ] **Step 4: Run to verify pass**

```bash
cd server
npx tsx --test src/modules/ai-email-assistant/simulation-metrics.repository.test.ts
```

Expected: both tests PASS.

- [ ] **Step 5: Typecheck**

```bash
cd server
npm run typecheck
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add server/src/modules/ai-email-assistant/simulation-metrics.repository.ts server/src/modules/ai-email-assistant/simulation-metrics.repository.test.ts
git commit -m "feat(server): add simulation run repository for persisted metrics history"
```

---

### Task 10: Wire metrics collection and persistence into `simulation.service.ts`

**Files:**
- Modify: `server/src/modules/ai-email-assistant/simulation.service.ts`
- Create: `server/src/modules/ai-email-assistant/simulation.service.test.ts`

**Interfaces:**
- Consumes: everything from Tasks 2–9 (`onMetric` on every client, `AiPromptRepository.getNameById`, `SimulationRunRepository`/`buildSimulationRunMetricRow`/`createPrismaSimulationRunRepository`).
- Produces: `runEmailAssistantSimulation(input: EmailSimulationInput, deps?: { runRepository?: SimulationRunRepository; createdById?: number }): Promise<EmailSimulationResult>` where `EmailSimulationResult` gains `runId: number | null` and `metrics: SimulationRunMetricInput[]`. `buildSimulationRunInput` (new exported pure function) is used by later tests.

- [ ] **Step 1: Write the failing tests**

Create `server/src/modules/ai-email-assistant/simulation.service.test.ts`. This is the first test to exercise `runEmailAssistantSimulation` itself, so it needs fakes for every dependency the function constructs — study `simulation.service.ts`'s current body (already read in this plan) before writing. The Prisma-backed pieces it still constructs internally with no override (`MysqlKnowledgeRepository`, `createPrismaCrmReader`, `PrismaAiPromptRepository` used inside `OllamaLlmClient`/`OllamaQueryExpansionClient`) are why this test uses `noKnowledge: true` — it isolates the new persistence behavior (the actual point of this task) without needing a real MySQL/Ollama for retrieval:

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import { AiDraftProvider, AiSimulationStage } from '@prisma/client';
import { runEmailAssistantSimulation, buildSimulationRunInput } from './simulation.service';
import type { SimulationRunInput, SimulationRunRepository } from './simulation-metrics.repository';

const fakeRepository = (onCreate: (input: SimulationRunInput) => void): SimulationRunRepository => ({
    create: async (input) => { onCreate(input); return 42; },
    list: async () => { throw new Error('not implemented'); },
    getById: async () => { throw new Error('not implemented'); },
});

test('buildSimulationRunInput shapes the persisted record from the simulation input and outcome', () => {
    const record = buildSimulationRunInput(
        { subject: 'Вопрос', body: 'Сколько стоит?', noKnowledge: true, forceDraft: false, noQueryExpansion: false, noRerank: false },
        {
            deterministicSpamReason: null,
            classification: { spam: false, needsReply: true, language: 'ru', intent: 'pricing', confidence: 0.8, reason: 'x' },
            draftSkippedReason: null,
            classificationPromptName: 'v2 — strict', draftBodyPromptName: null,
            draftProvider: AiDraftProvider.OLLAMA, draftModel: 'qwen3:0.6b',
            classificationJson: { spam: false }, knowledgeJson: [], draftJson: { body: 'ok' },
            metrics: [], createdById: 7,
        },
    );
    assert.equal(record.subject, 'Вопрос');
    assert.equal(record.classificationSpam, false);
    assert.equal(record.classificationConfidence, 0.8);
    assert.equal(record.classificationPromptName, 'v2 — strict');
    assert.equal(record.createdById, 7);
});

test('runEmailAssistantSimulation persists a run and returns its metrics for a deterministic-spam email', async () => {
    let persisted: SimulationRunInput | null = null;
    const result = await runEmailAssistantSimulation(
        { subject: 'Viagra cheap!!!', body: 'buy now buy now buy now', noKnowledge: true },
        { runRepository: fakeRepository((input) => { persisted = input; }) },
    );
    assert.equal(result.draftSkippedReason, 'deterministic_spam');
    assert.ok(persisted);
    assert.equal(persisted!.deterministicSpamReason, result.deterministicSpamReason);
    assert.equal(result.runId, 42);
});

test('runEmailAssistantSimulation still returns a result when persistence throws', async () => {
    const throwingRepository: SimulationRunRepository = {
        create: async () => { throw new Error('DB is down'); },
        list: async () => { throw new Error('not implemented'); },
        getById: async () => { throw new Error('not implemented'); },
    };
    const result = await runEmailAssistantSimulation(
        { subject: 'Viagra cheap!!!', body: 'buy now buy now buy now', noKnowledge: true },
        { runRepository: throwingRepository },
    );
    assert.equal(result.draftSkippedReason, 'deterministic_spam');
    assert.equal(result.runId, null);
});
```

- [ ] **Step 2: Run to verify failure**

```bash
cd server
npx tsx --test src/modules/ai-email-assistant/simulation.service.test.ts
```

Expected: FAIL — `buildSimulationRunInput` not exported, `runEmailAssistantSimulation` does not accept a second argument, `result.runId`/`result.metrics` undefined.

- [ ] **Step 3: Implement**

Replace `server/src/modules/ai-email-assistant/simulation.service.ts` in full:

```ts
// Shared core of scripts/test-email-flow.ts (CLI) and the "Симуляция письма" panel on
// KnowledgeBasePage (HTTP): runs the real pipeline — normalize → deterministic spam check →
// LLM classify → RAG retrieve → draft — against a hand-written subject/body, without IMAP,
// without touching ai_email_messages/ai_email_drafts, and without notifying Telegram. Read-only
// against the real CRM (contact lookup) and the real knowledge base (retrieval).
//
// Every run is persisted to ai_simulation_runs/ai_simulation_run_metrics (a separate, simulation-
// only history table — see docs/superpowers/specs/2026-09-25-simulation-metrics-design.md) so an
// admin can compare prompts/providers over time. Persistence failure is caught and logged, never
// thrown — a DB hiccup must never break the admin's simulation preview.
import { AiDraftProvider, AiSimulationStage } from '@prisma/client';
import { deterministicSpamReason, normalizeEmail, type EmailClassification, type NormalizedEmailInput } from './email-assistant.service';
import { OllamaLlmClient } from './ollama.client';
import { createPrismaCrmReader } from './crm-context.service';
import { buildDraftContext, emailDraftSchema, generateEmailDraft, type CrmContactProjection, type DraftKnowledgeContext, type EmailDraft } from './draft.service';
import {
    KnowledgeRetrievalService, MysqlKnowledgeRepository, OllamaEmbeddingClient,
    OllamaQueryExpansionClient, OllamaReranker, type QueryExpansion,
} from '../knowledge-ingestion';
import { aiConfig } from '../../config/ai.config';
import { createDraftProviderFactory } from './draft-provider.factory';
import type { DraftProviderName } from './draft-provider';
import { PrismaAiPromptRepository } from './prompt-library.service';
import {
    buildSimulationRunMetricRow, createPrismaSimulationRunRepository,
    type SimulationRunInput, type SimulationRunMetricInput, type SimulationRunRepository,
} from './simulation-metrics.repository';

export interface EmailSimulationInput {
    from?: string;
    subject: string;
    body: string;
    topK?: number;
    noKnowledge?: boolean;
    forceDraft?: boolean;
    classificationPromptId?: number;
    draftBodyPromptId?: number;
    noQueryExpansion?: boolean;
    noRerank?: boolean;
}

export interface EmailSimulationResult {
    normalized: NormalizedEmailInput;
    deterministicSpamReason: string | null;
    classification: EmailClassification | null;
    knowledge: DraftKnowledgeContext[];
    queryExpansion: QueryExpansion | null;
    crmContact: CrmContactProjection | null;
    draft: EmailDraft | null;
    draftSkippedReason: string | null;
    runId: number | null;
    metrics: SimulationRunMetricInput[];
}

const DEFAULT_FROM = 'test@example.com';

// Pure — shapes the DB-write payload from the simulation's input/outcome. Kept separate from
// runEmailAssistantSimulation so it is unit-testable without Prisma/Ollama/network.
export const buildSimulationRunInput = (
    input: EmailSimulationInput,
    context: {
        deterministicSpamReason: string | null;
        classification: EmailClassification | null;
        draftSkippedReason: string | null;
        classificationPromptName: string | null;
        draftBodyPromptName: string | null;
        draftProvider: DraftProviderName | null;
        draftModel: string | null;
        classificationJson?: unknown;
        knowledgeJson?: unknown;
        draftJson?: unknown;
        metrics: SimulationRunMetricInput[];
        createdById?: number;
    },
): SimulationRunInput => ({
    fromAddress: input.from?.trim() || undefined,
    subject: input.subject,
    body: input.body,
    topK: input.topK,
    noKnowledge: input.noKnowledge ?? false,
    forceDraft: input.forceDraft ?? false,
    noQueryExpansion: input.noQueryExpansion ?? false,
    noRerank: input.noRerank ?? false,
    classificationPromptId: input.classificationPromptId,
    classificationPromptName: context.classificationPromptName ?? undefined,
    draftBodyPromptId: input.draftBodyPromptId,
    draftBodyPromptName: context.draftBodyPromptName ?? undefined,
    draftProvider: (context.draftProvider as AiDraftProvider | null) ?? undefined,
    draftModel: context.draftModel ?? undefined,
    classificationSpam: context.classification?.spam,
    classificationNeedsReply: context.classification?.needsReply,
    classificationConfidence: context.classification?.confidence,
    classificationJson: context.classificationJson,
    knowledgeJson: context.knowledgeJson,
    draftJson: context.draftJson,
    deterministicSpamReason: context.deterministicSpamReason ?? undefined,
    draftSkippedReason: context.draftSkippedReason ?? undefined,
    createdById: context.createdById,
    metrics: context.metrics,
});

export const runEmailAssistantSimulation = async (
    input: EmailSimulationInput,
    deps: { runRepository?: SimulationRunRepository; createdById?: number } = {},
): Promise<EmailSimulationResult> => {
    const runRepository = deps.runRepository ?? createPrismaSimulationRunRepository();
    const metrics: SimulationRunMetricInput[] = [];

    const from = input.from?.trim() || DEFAULT_FROM;
    const raw = { fromAddress: from, subject: input.subject, text: input.body };
    const normalized = normalizeEmail(raw);
    const spamReason = deterministicSpamReason(raw, normalized);

    const promptRepository = new PrismaAiPromptRepository();
    const classificationPromptName = input.classificationPromptId ? await promptRepository.getNameById(input.classificationPromptId) : null;
    const draftBodyPromptName = input.draftBodyPromptId ? await promptRepository.getNameById(input.draftBodyPromptId) : null;

    const classificationModel = aiConfig.ollamaModel;
    const classificationClient = new OllamaLlmClient({
        promptOverrides: { classificationPromptId: input.classificationPromptId, draftBodyPromptId: input.draftBodyPromptId },
        onMetric: (metric) => metrics.push(buildSimulationRunMetricRow(AiSimulationStage.CLASSIFICATION, AiDraftProvider.OLLAMA, classificationModel, metric)),
    });
    const classification = spamReason ? null : await classificationClient.classifyEmail(normalized);

    let knowledge: DraftKnowledgeContext[] = [];
    let queryExpansion: QueryExpansion | null = null;
    if (!input.noKnowledge) {
        const embeddings = new OllamaEmbeddingClient();
        const retrieval = new KnowledgeRetrievalService(embeddings, new MysqlKnowledgeRepository(), {
            queryExpansion: input.noQueryExpansion ? undefined : new OllamaQueryExpansionClient({
                onMetric: (metric) => metrics.push(buildSimulationRunMetricRow(AiSimulationStage.QUERY_EXPANSION, AiDraftProvider.OLLAMA, aiConfig.ollamaModel, metric)),
            }),
            reranker: input.noRerank ? undefined : new OllamaReranker(embeddings, {
                onMetric: (metric) => metrics.push(buildSimulationRunMetricRow(AiSimulationStage.RERANK, AiDraftProvider.OLLAMA, metric.model, metric)),
            }),
            onMetric: (metric) => metrics.push(buildSimulationRunMetricRow(AiSimulationStage.RETRIEVAL_EMBEDDING, AiDraftProvider.OLLAMA, aiConfig.ollamaEmbeddingModel, metric)),
        });
        const retrieved = await retrieval.retrieveWithDetails(`${normalized.subject}\n${normalized.normalizedBody}`, { topK: input.topK ?? aiConfig.ragTopK });
        knowledge = retrieved.chunks;
        queryExpansion = retrieved.queryExpansion;
    }

    // Never throws out of runEmailAssistantSimulation — a DB hiccup must never turn a working
    // simulation preview into a 500 for the admin. Logged, not surfaced.
    const persistRun = async (extra: {
        draftSkippedReason: string | null;
        draftProvider?: DraftProviderName; draftModel?: string;
        draftJson?: unknown;
    }): Promise<number | null> => {
        try {
            const record = buildSimulationRunInput(input, {
                deterministicSpamReason: spamReason,
                classification,
                draftSkippedReason: extra.draftSkippedReason,
                classificationPromptName,
                draftBodyPromptName,
                draftProvider: extra.draftProvider ?? null,
                draftModel: extra.draftModel ?? null,
                classificationJson: classification,
                knowledgeJson: knowledge,
                draftJson: extra.draftJson,
                metrics,
                createdById: deps.createdById,
            });
            return await runRepository.create(record);
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Failed to persist simulation run history', error);
            return null;
        }
    };

    if (!classification) {
        const runId = await persistRun({ draftSkippedReason: 'deterministic_spam' });
        return { normalized, deterministicSpamReason: spamReason, classification, knowledge, queryExpansion, crmContact: null, draft: null, draftSkippedReason: 'deterministic_spam', runId, metrics };
    }

    const shouldDraft = input.forceDraft || (!classification.spam && classification.needsReply);
    if (!shouldDraft) {
        const reason = `classification_gate (spam=${classification.spam}, needsReply=${classification.needsReply})`;
        const runId = await persistRun({ draftSkippedReason: reason });
        return { normalized, deterministicSpamReason: spamReason, classification, knowledge, queryExpansion, crmContact: null, draft: null, draftSkippedReason: reason, runId, metrics };
    }

    const crmReader = createPrismaCrmReader();
    // Safe despite referencing `draftClient` inside its own construction call: onMetric is only
    // invoked later, when generateDraft() runs — by then `draftClient` already holds the resolved
    // provider (same pattern as `const timer = setInterval(() => clearInterval(timer), ms)`).
    const draftClient = await createDraftProviderFactory().getSelectedProvider((metric) =>
        metrics.push(buildSimulationRunMetricRow(AiSimulationStage.DRAFT, draftClient.provider as AiDraftProvider, draftClient.model, metric)));
    const crmContact = await crmReader.findContactByEmail(from);
    const draft = input.forceDraft && (classification.spam || !classification.needsReply)
        ? emailDraftSchema.parse(await draftClient.generateDraft(await buildDraftContext(normalized, classification, crmReader, knowledge)))
        : await generateEmailDraft(normalized, classification, crmReader, draftClient, knowledge);

    const runId = await persistRun({
        draftSkippedReason: null,
        draftProvider: draftClient.provider as DraftProviderName, draftModel: draftClient.model,
        draftJson: draft,
    });

    return { normalized, deterministicSpamReason: spamReason, classification, knowledge, queryExpansion, crmContact, draft, draftSkippedReason: null, runId, metrics };
};
```

- [ ] **Step 4: Run to verify pass**

```bash
cd server
npx tsx --test src/modules/ai-email-assistant/simulation.service.test.ts
```

Expected: all 3 tests PASS.

- [ ] **Step 5: Full local-ai suite + typecheck**

```bash
cd server
npm run typecheck
npm run test:local-ai
```

Expected: no errors; all tests green (this is the first point where every Task 2–10 change is exercised together).

- [ ] **Step 6: Commit**

```bash
git add server/src/modules/ai-email-assistant/simulation.service.ts server/src/modules/ai-email-assistant/simulation.service.test.ts
git commit -m "feat(server): persist simulation runs with per-stage metrics"
```

---

### Task 11: Controller endpoints and routes

**Files:**
- Modify: `server/src/modules/ai-email-assistant/simulation.controller.ts`
- Modify: `server/src/modules/ai-email-assistant/simulation.controller.test.ts`
- Modify: `server/src/modules/ai-email-assistant/simulation.routes.ts`

**Interfaces:**
- Consumes: `runEmailAssistantSimulation` (Task 10, now returns `runId`/`metrics` automatically — no controller change needed for the simulate response body itself), `SimulationRunRepository`/`createPrismaSimulationRunRepository` (Task 9).
- Produces: `GET /ai-email/simulation-runs`, `GET /ai-email/simulation-runs/:id`.

- [ ] **Step 1: Write the failing tests**

Add to `server/src/modules/ai-email-assistant/simulation.controller.test.ts`:

```ts
import { listSimulationRunsSchema } from './simulation.controller';

test('listSimulationRunsSchema defaults page/limit and accepts no filters', () => {
    const result = listSimulationRunsSchema.safeParse({});
    assert.equal(result.success, true);
});

test('listSimulationRunsSchema rejects a limit over 100', () => {
    assert.equal(listSimulationRunsSchema.safeParse({ _limit: '101' }).success, false);
});

test('listSimulationRunsSchema rejects an unknown provider', () => {
    assert.equal(listSimulationRunsSchema.safeParse({ provider: 'CLAUDE' }).success, false);
});

test('listSimulationRunsSchema coerces promptId and page/limit to numbers', () => {
    const result = listSimulationRunsSchema.safeParse({ promptId: '3', _page: '2', _limit: '10' });
    assert.equal(result.success, true);
    if (result.success) {
        assert.equal(result.data.promptId, 3);
        assert.equal(result.data._page, 2);
        assert.equal(result.data._limit, 10);
    }
});
```

- [ ] **Step 2: Run to verify failure**

```bash
cd server
npx tsx --test src/modules/ai-email-assistant/simulation.controller.test.ts
```

Expected: FAIL — `listSimulationRunsSchema` not exported.

- [ ] **Step 3: Implement the controller**

Append to `server/src/modules/ai-email-assistant/simulation.controller.ts` (keep the existing `simulationRequestSchema`/`simulateEmailAssistant` untouched — `runEmailAssistantSimulation`'s result already carries `runId`/`metrics` after Task 10, so `res.json(result)` on line 33 needs no change):

```ts
import { DRAFT_PROVIDERS } from './draft-provider';
import { createPrismaSimulationRunRepository } from './simulation-metrics.repository';

const simulationRunRepository = createPrismaSimulationRunRepository();

export const listSimulationRunsSchema = z.object({
    promptId: z.coerce.number().int().positive().optional(),
    provider: z.enum([DRAFT_PROVIDERS.OLLAMA, DRAFT_PROVIDERS.OPENAI]).optional(),
    _page: z.coerce.number().int().min(1).optional(),
    _limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const listSimulationRuns = async (req: Request, res: Response) => {
    const parsed = listSimulationRunsSchema.safeParse(req.query);
    if (parsed.success !== true) return res.status(400).json({ message: 'Некорректные параметры', details: parsed.error.flatten() });
    const page = parsed.data._page ?? 1;
    const limit = parsed.data._limit ?? 20;
    const { items, total } = await simulationRunRepository.list({ promptId: parsed.data.promptId, provider: parsed.data.provider }, { page, limit });
    return res.json({ items, total, page, limit, totalPages: Math.max(Math.ceil(total / limit), 1) });
};

export const getSimulationRun = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: 'Некорректный id' });
    const run = await simulationRunRepository.getById(id);
    if (!run) return res.status(404).json({ message: 'Запуск не найден' });
    return res.json(run);
};
```

Also update `simulateEmailAssistant` to pass the acting admin's id through, so `createdById` is recorded (line 30–32 currently):

```ts
            const result = await runEmailAssistantSimulation(
                { from, subject, body, topK, noKnowledge, forceDraft, classificationPromptId, draftBodyPromptId, noQueryExpansion, noRerank },
                { createdById: req.user?.id },
            );
```

- [ ] **Step 4: Wire the routes**

Replace `server/src/modules/ai-email-assistant/simulation.routes.ts` in full:

```ts
import express from 'express';
import { UserRole } from '@prisma/client';
import { asyncHandler, isToken, requireRole } from '../auth/auth.middleware';
import { simulateEmailAssistant, listSimulationRuns, getSimulationRun } from './simulation.controller';

const router = express.Router();

router.post('/simulate', asyncHandler(isToken), requireRole(UserRole.ADMIN), asyncHandler(simulateEmailAssistant));
router.get('/simulation-runs', asyncHandler(isToken), requireRole(UserRole.ADMIN), asyncHandler(listSimulationRuns));
router.get('/simulation-runs/:id', asyncHandler(isToken), requireRole(UserRole.ADMIN), asyncHandler(getSimulationRun));

export default router;
```

- [ ] **Step 5: Run to verify pass**

```bash
cd server
npx tsx --test src/modules/ai-email-assistant/simulation.controller.test.ts
npm run typecheck
```

Expected: all tests PASS, no type errors.

- [ ] **Step 6: Full domain suite**

```bash
cd server
npm run test:local-ai
```

Expected: green.

- [ ] **Step 7: Commit**

```bash
git add server/src/modules/ai-email-assistant/simulation.controller.ts \
        server/src/modules/ai-email-assistant/simulation.controller.test.ts \
        server/src/modules/ai-email-assistant/simulation.routes.ts
git commit -m "feat(server): expose simulation run history list/detail endpoints"
```

---

### Task 12: CLI metrics output

**Files:**
- Modify: `server/scripts/test-email-flow.ts`

**Interfaces:**
- Consumes: `EmailSimulationResult.runId`/`.metrics` (Task 10).

- [ ] **Step 1: Implement**

In `server/scripts/test-email-flow.ts`, add a new section after `'5. DRAFT'` (after line 126, before `};` closing `main`):

```ts
    section('6. METRICS');
    console.log(`runId: ${result.runId ?? '(not saved)'}`);
    for (const metric of result.metrics) {
        const tokens = metric.totalTokens !== undefined
            ? `${metric.promptTokens ?? 0}→${metric.completionTokens ?? 0} tokens`
            : 'no token data';
        const calls = metric.callCount > 1 ? ` (${metric.callCount} calls)` : '';
        console.log(`${metric.stage.padEnd(20)} ${metric.provider}/${metric.model}  ${metric.durationMs}ms  ${tokens}${calls}`);
    }
```

No change needed for `--json` mode (line 96–99) — `result` already includes `runId`/`metrics` after Task 10, so `JSON.stringify(result, null, 2)` picks them up automatically.

- [ ] **Step 2: Manually verify against the local dev stack**

```bash
cd server
npm run ai:test-flow -- --subject "Тестовое письмо" --body "Сколько стоит абонемент?" --force-draft --no-knowledge
```

Expected: existing sections 1–5 print as before, plus a new `=== 6. METRICS ===` section listing at least `CLASSIFICATION` and `DRAFT` rows with non-zero `ms` and token counts (requires a running local Ollama — see the project's existing local-AI setup docs if it's not already running).

- [ ] **Step 3: Commit**

```bash
git add server/scripts/test-email-flow.ts
git commit -m "feat(server): print simulation metrics in the CLI test-flow output"
```

---

### Task 13: Client types and per-stage metrics rendering

**Files:**
- Modify: `client/src/pages/KnowledgeBasePage/emailSimulationTypes.ts`
- Modify: `client/src/pages/KnowledgeBasePage/ui/EmailSimulationPanel.tsx`
- Modify: `client/src/pages/KnowledgeBasePage/ui/KnowledgeBasePage.module.scss`
- Modify: `client/src/pages/KnowledgeBasePage/ui/KnowledgeBasePage.test.tsx`

**Interfaces:**
- Produces: `SimulationStage`, `SimulationProvider`, `SimulationMetric` types; `EmailSimulationResult.runId`/`.metrics`.

- [ ] **Step 1: Write the failing test**

Add to `client/src/pages/KnowledgeBasePage/ui/KnowledgeBasePage.test.tsx`, right after the existing "runs an email simulation..." test (after line 151):

```ts
    test('renders per-stage metrics (model, duration, tokens) after a simulation run', async () => {
        ($apiPrivate.post as jest.Mock).mockResolvedValue({
            data: {
                normalized: { fromAddress: 'test@example.com', subject: 'Вопрос про цены', normalizedBody: 'Сколько стоит абонемент?' },
                deterministicSpamReason: null,
                classification: { spam: false, needsReply: true, language: 'ru', intent: 'pricing', confidence: 0.9, reason: '' },
                knowledge: [],
                crmContact: null,
                draft: { replyLanguage: 'ru', subject: 'Re: Вопрос про цены', body: 'Здравствуйте!', confidence: 0.85, needsManualAnswer: false, usedKnowledgeIds: [] },
                draftSkippedReason: null,
                runId: 7,
                metrics: [
                    { stage: 'CLASSIFICATION', provider: 'OLLAMA', model: 'qwen3:0.6b', callCount: 1, durationMs: 214, promptTokens: 120, completionTokens: 30, totalTokens: 150 },
                    { stage: 'DRAFT', provider: 'OPENAI', model: 'gpt-4o-mini', callCount: 1, durationMs: 980, promptTokens: 512, completionTokens: 96, totalTokens: 608 },
                ],
            },
        });
        renderPage();
        await screen.findByText('Прайс на занятия');

        fireEvent.change(screen.getByLabelText('Тема письма *'), { target: { value: 'Вопрос про цены' } });
        fireEvent.change(screen.getByLabelText('Текст письма *'), { target: { value: 'Сколько стоит абонемент?' } });
        fireEvent.click(screen.getByText('Запустить симуляцию'));

        expect(await screen.findByText(/qwen3:0.6b/)).toBeInTheDocument();
        expect(screen.getByText(/120→30 токенов/)).toBeInTheDocument();
        expect(screen.getByText(/gpt-4o-mini/)).toBeInTheDocument();
        expect(screen.getByText(/512→96 токенов/)).toBeInTheDocument();
    });
```

- [ ] **Step 2: Run to verify failure**

```bash
cd client
npx jest src/pages/KnowledgeBasePage/ui/KnowledgeBasePage.test.tsx -t "renders per-stage metrics"
```

Expected: FAIL — the metric text is not rendered anywhere yet.

- [ ] **Step 3: Add the types**

In `client/src/pages/KnowledgeBasePage/emailSimulationTypes.ts`, add after the existing `SimulationQueryExpansion` interface (line 43):

```ts
export type SimulationStage = 'CLASSIFICATION' | 'QUERY_EXPANSION' | 'RETRIEVAL_EMBEDDING' | 'RERANK' | 'DRAFT';
export type SimulationProvider = 'OLLAMA' | 'OPENAI';

export interface SimulationMetric {
    stage: SimulationStage;
    provider: SimulationProvider;
    model: string;
    callCount: number;
    durationMs: number;
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    meta?: Record<string, unknown>;
}
```

Add `runId` and `metrics` to `EmailSimulationResult` (lines 45–54):

```ts
export interface EmailSimulationResult {
    normalized: SimulationNormalized;
    deterministicSpamReason: string | null;
    classification: SimulationClassification | null;
    knowledge: SimulationKnowledgeChunk[];
    queryExpansion: SimulationQueryExpansion | null;
    crmContact: SimulationCrmContact | null;
    draft: SimulationDraft | null;
    draftSkippedReason: string | null;
    runId: number | null;
    metrics: SimulationMetric[];
}
```

- [ ] **Step 4: Render the metric lines**

In `client/src/pages/KnowledgeBasePage/ui/EmailSimulationPanel.tsx`, add a shared helper right after the `promptSelect` helper (after line 33):

```tsx
const formatMetric = (metric: SimulationMetric): string => {
    const tokens = metric.totalTokens !== undefined ? ` · ${metric.promptTokens ?? 0}→${metric.completionTokens ?? 0} токенов` : '';
    const calls = metric.callCount > 1 ? ` · ${metric.callCount} вызовов` : '';
    return `${metric.model} · ${metric.durationMs}мс${tokens}${calls}`;
};

const MetricLine = ({ result, stage }: { result: EmailSimulationResult; stage: SimulationStage }) => {
    const metric = result.metrics.find((candidate) => candidate.stage === stage);
    if (!metric) return null;
    return <p className={s.simulationMetric}>{formatMetric(metric)}</p>;
};
```

Add the import at the top (line 3):

```ts
import { EmailSimulationForm, EmailSimulationResult, SimulationMetric, SimulationStage } from '../emailSimulationTypes';
```

Render it in `ClassificationBlock`, right after the `<h3>` (after line 102):

```tsx
            <MetricLine result={result} stage="CLASSIFICATION" />
```

Render it in `KnowledgeBlock`, right after the `<h3>` (after line 120) — up to three stages can apply here:

```tsx
            <MetricLine result={result} stage="QUERY_EXPANSION" />
            <MetricLine result={result} stage="RETRIEVAL_EMBEDDING" />
            <MetricLine result={result} stage="RERANK" />
```

Render it in `DraftBlock`, right after the `<h3>` (after line 156):

```tsx
            <MetricLine result={result} stage="DRAFT" />
```

- [ ] **Step 5: Add the SCSS class**

In `client/src/pages/KnowledgeBasePage/ui/KnowledgeBasePage.module.scss`, add right after `.simulationFields strong` (after line 270):

```scss
.simulationMetric {
    margin: 0 0 8px;
    font-size: 12px;
    color: var(--sidebar-group-label-redesigned);
}
```

- [ ] **Step 6: Update every existing simulation-response test fixture**

`MetricLine` calls `result.metrics.find(...)` unconditionally wherever it's rendered, and — critically — `KnowledgeBlock` renders even when `classification` is `null` as long as `deterministicSpamReason` is set (its guard is `if (!result.classification && !result.deterministicSpamReason) return null;`), so **every** existing mocked simulation response needs `metrics: []` added, not just the ones that reach `DraftBlock`. Find every one first:

```bash
cd client
grep -n "draftSkippedReason" src/pages/KnowledgeBasePage/ui/KnowledgeBasePage.test.tsx
```

This finds 4 existing mock response objects (as of this plan): the "runs an email simulation..." test (`draftSkippedReason: null`), the "displays the query expansion result..." test (`draftSkippedReason: 'classification_gate'`), the "shows the deterministic spam reason..." test (`draftSkippedReason: 'deterministic_spam'`), and the "sends the selected prompt id..." test (`draftSkippedReason: 'classification_gate'`). Add `runId: null, metrics: [],` into each of these 4 `data: { ... }` mock objects so `result.metrics` is never `undefined` when any block reads it, regardless of which early-return branch that particular test exercises.

- [ ] **Step 7: Run all tests to verify they pass**

```bash
cd client
npx jest src/pages/KnowledgeBasePage
```

Expected: all tests, including the 3 pre-existing simulation tests and the new one, PASS.

- [ ] **Step 8: Lint**

```bash
cd client
npm run lint:ts
```

Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add client/src/pages/KnowledgeBasePage/emailSimulationTypes.ts \
        client/src/pages/KnowledgeBasePage/ui/EmailSimulationPanel.tsx \
        client/src/pages/KnowledgeBasePage/ui/KnowledgeBasePage.module.scss \
        client/src/pages/KnowledgeBasePage/ui/KnowledgeBasePage.test.tsx
git commit -m "feat(client): render per-stage token/duration/model metrics after a simulation run"
```

---

### Task 14: Simulation history panel

**Files:**
- Create: `client/src/pages/KnowledgeBasePage/simulationHistoryTypes.ts`
- Create: `client/src/pages/KnowledgeBasePage/useSimulationHistory.ts`
- Create: `client/src/pages/KnowledgeBasePage/ui/SimulationHistoryPanel.tsx`
- Modify: `client/src/pages/KnowledgeBasePage/ui/KnowledgeBasePage.tsx`
- Modify: `client/src/pages/KnowledgeBasePage/ui/KnowledgeBasePage.test.tsx`

**Interfaces:**
- Consumes: `SimulationMetric` (Task 13), `GET /ai-email/simulation-runs` / `GET /ai-email/simulation-runs/:id` (Task 11).
- Produces: `SimulationRunSummary`, `SimulationRunDetail` (client-side mirrors of the server repository types), `useSimulationHistory()` hook, `<SimulationHistoryPanel />`.

- [ ] **Step 1: Write the failing tests**

Add to `client/src/pages/KnowledgeBasePage/ui/KnowledgeBasePage.test.tsx`, extend the `beforeEach` mock (lines 26–35) to answer the new list endpoint by default:

```ts
beforeEach(() => {
    jest.clearAllMocks();
    ($apiPrivate.get as jest.Mock).mockImplementation((url: string) => {
        if (url === '/knowledge/documents') {
            return Promise.resolve({ data: { items: [pendingDocument], total: 1, page: 1, limit: 20, totalPages: 1, pendingTotal: 1 } });
        }
        if (url === '/ai-email/prompts') return Promise.resolve({ data: [] });
        if (url === '/ai-email/simulation-runs') return Promise.resolve({ data: { items: [], total: 0, page: 1, limit: 20, totalPages: 1 } });
        return Promise.resolve({ data: {} });
    });
});
```

Then add new tests at the end of the `describe` block:

```ts
    test('lists saved simulation runs with their summed tokens and duration', async () => {
        ($apiPrivate.get as jest.Mock).mockImplementation((url: string) => {
            if (url === '/knowledge/documents') return Promise.resolve({ data: { items: [pendingDocument], total: 1, page: 1, limit: 20, totalPages: 1, pendingTotal: 1 } });
            if (url === '/ai-email/prompts') return Promise.resolve({ data: [] });
            if (url === '/ai-email/simulation-runs') {
                return Promise.resolve({
                    data: {
                        items: [{
                            id: 1, fromAddress: 'test@example.com', subject: 'Вопрос про цены',
                            classificationPromptName: null, draftBodyPromptName: 'v2 — strict grounded reply',
                            draftProvider: 'OPENAI', draftModel: 'gpt-4o-mini',
                            classificationSpam: false, classificationConfidence: 0.9,
                            deterministicSpamReason: null, draftSkippedReason: null,
                            createdAt: '2026-09-25T10:00:00.000Z',
                            metrics: [{ stage: 'DRAFT', provider: 'OPENAI', model: 'gpt-4o-mini', callCount: 1, durationMs: 980, promptTokens: 512, completionTokens: 96, totalTokens: 608 }],
                        }],
                        total: 1, page: 1, limit: 20, totalPages: 1,
                    },
                });
            }
            return Promise.resolve({ data: {} });
        });
        renderPage();
        expect(await screen.findByText('Вопрос про цены')).toBeInTheDocument();
        expect(screen.getByText('v2 — strict grounded reply')).toBeInTheDocument();
        expect(screen.getByText('608')).toBeInTheDocument();
    });

    test('shows an empty state when no simulations have been saved yet', async () => {
        renderPage();
        expect(await screen.findByText('Симуляции ещё не запускались')).toBeInTheDocument();
    });

    test('filters simulation history by provider', async () => {
        renderPage();
        await screen.findByText('Симуляции ещё не запускались');
        fireEvent.change(screen.getByLabelText('История симуляций — провайдер'), { target: { value: 'OPENAI' } });
        await waitFor(() => {
            expect($apiPrivate.get).toHaveBeenCalledWith('/ai-email/simulation-runs', {
                params: { _page: 1, _limit: 20, provider: 'OPENAI' },
            });
        });
    });
```

- [ ] **Step 2: Run to verify failure**

```bash
cd client
npx jest src/pages/KnowledgeBasePage/ui/KnowledgeBasePage.test.tsx -t "simulation runs"
```

Expected: FAIL — no such text rendered, `SimulationHistoryPanel` doesn't exist yet.

- [ ] **Step 3: Create the types file**

Create `client/src/pages/KnowledgeBasePage/simulationHistoryTypes.ts`:

```ts
import { SimulationClassification, SimulationDraft, SimulationKnowledgeChunk, SimulationMetric, SimulationProvider } from './emailSimulationTypes';

export interface SimulationRunSummary {
    id: number;
    fromAddress: string | null;
    subject: string;
    classificationPromptName: string | null;
    draftBodyPromptName: string | null;
    draftProvider: SimulationProvider | null;
    draftModel: string | null;
    classificationSpam: boolean | null;
    classificationConfidence: number | null;
    deterministicSpamReason: string | null;
    draftSkippedReason: string | null;
    createdAt: string;
    metrics: SimulationMetric[];
}

export interface SimulationRunDetail extends SimulationRunSummary {
    body: string;
    classification: SimulationClassification | null;
    knowledge: SimulationKnowledgeChunk[];
    draft: SimulationDraft | null;
}
```

- [ ] **Step 4: Create the hook**

Create `client/src/pages/KnowledgeBasePage/useSimulationHistory.ts`:

```ts
import { useCallback, useEffect, useState } from 'react';
import { $apiPrivate } from '@/shared/api/api';
import { SimulationProvider } from './emailSimulationTypes';
import { SimulationRunDetail, SimulationRunSummary } from './simulationHistoryTypes';

const PAGE_SIZE = 20;

interface SimulationRunsResponse {
    items: SimulationRunSummary[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export const useSimulationHistory = () => {
    const [runs, setRuns] = useState<SimulationRunSummary[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [providerFilter, setProviderFilterState] = useState<'' | SimulationProvider>('');
    const [selectedRun, setSelectedRun] = useState<SimulationRunDetail | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const response = await $apiPrivate.get<SimulationRunsResponse>('/ai-email/simulation-runs', {
                params: { _page: page, _limit: PAGE_SIZE, provider: providerFilter || undefined },
            });
            setRuns(response.data.items);
            setTotal(response.data.total);
            setTotalPages(response.data.totalPages);
        } finally {
            setLoading(false);
        }
    }, [page, providerFilter]);

    useEffect(() => { load(); }, [load]);

    const setProviderFilter = (value: '' | SimulationProvider) => {
        setProviderFilterState(value);
        setPage(1);
    };

    const openRun = async (id: number) => {
        const response = await $apiPrivate.get<SimulationRunDetail>(`/ai-email/simulation-runs/${id}`);
        setSelectedRun(response.data);
    };
    const closeRun = () => setSelectedRun(null);

    return { runs, loading, page, setPage, total, totalPages, providerFilter, setProviderFilter, selectedRun, openRun, closeRun };
};
```

- [ ] **Step 5: Create the panel**

Create `client/src/pages/KnowledgeBasePage/ui/SimulationHistoryPanel.tsx`:

```tsx
import { useTranslation } from 'react-i18next';
import { SimulationProvider } from '../emailSimulationTypes';
import { SimulationRunDetail, SimulationRunSummary } from '../simulationHistoryTypes';
import s from './KnowledgeBasePage.module.scss';

const HISTORY_PAGE_SIZE = 20;

const summarizeMetrics = (metrics: SimulationRunSummary['metrics']) => ({
    totalDurationMs: metrics.reduce((sum, metric) => sum + metric.durationMs, 0),
    totalTokens: metrics.reduce((sum, metric) => sum + (metric.totalTokens ?? 0), 0),
});

const outcomeLabel = (run: SimulationRunSummary, t: (key: string) => string): string => {
    if (run.deterministicSpamReason) return t('спам');
    if (run.draftSkippedReason) return t('без черновика');
    return t('черновик создан');
};

const HistoryPagination = ({ page, totalPages, total, loading, onPageChange }: {
    page: number; totalPages: number; total: number; loading: boolean; onPageChange: (page: number) => void;
}) => {
    const { t } = useTranslation();
    if (total <= 0) return null;
    const firstItemNumber = (page - 1) * HISTORY_PAGE_SIZE + 1;
    const lastItemNumber = Math.min(page * HISTORY_PAGE_SIZE, total);
    return (
        <div className={s.pagination}>
            <span>{firstItemNumber}–{lastItemNumber}{t(' из ')}{total}</span>
            <div className={s.paginationActions}>
                <button className={s.pageButton} disabled={loading || page <= 1} onClick={() => onPageChange(Math.max(page - 1, 1))} aria-label="Предыдущая страница">←</button>
                <span>{page} / {totalPages}</span>
                <button className={s.pageButton} disabled={loading || page >= totalPages} onClick={() => onPageChange(Math.min(page + 1, totalPages))} aria-label="Следующая страница">→</button>
            </div>
        </div>
    );
};

const RunDetail = ({ detail, onClose }: { detail: SimulationRunDetail; onClose: () => void }) => {
    const { t } = useTranslation();
    return (
        <div className={s.simulationResult}>
            <div className={s.header}>
                <h3>{t('Запуск #')}{detail.id}</h3>
                <button onClick={onClose}>{t('Закрыть')}</button>
            </div>
            <div className={s.simulationBlock}>
                <p className={s.simulationReason}>{detail.fromAddress} — {detail.subject}</p>
                <p className={s.draftBody}>{detail.body}</p>
            </div>
            {detail.classification && (
                <div className={s.simulationBlock}>
                    <h3>{t('Классификация')}</h3>
                    <div className={s.simulationFields}>
                        <span>{t('spam:')} <strong>{String(detail.classification.spam)}</strong></span>
                        <span>{t('needsReply:')} <strong>{String(detail.classification.needsReply)}</strong></span>
                        <span>{t('intent:')} <strong>{detail.classification.intent}</strong></span>
                        <span>{t('confidence:')} <strong>{detail.classification.confidence.toFixed(2)}</strong></span>
                    </div>
                </div>
            )}
            {!!detail.knowledge.length && (
                <div className={s.simulationBlock}>
                    <h3>{t('Найденные знания')}</h3>
                    {detail.knowledge.map((chunk) => (
                        <div key={chunk.id} className={s.knowledgeChunk}>
                            <div className={s.knowledgeChunkHeader}>
                                <span>{t('score=')}{chunk.score.toFixed(3)}</span>
                                <span>{chunk.sourceUrl}</span>
                            </div>
                            <p>{chunk.content.slice(0, 240)}</p>
                        </div>
                    ))}
                </div>
            )}
            {detail.draft && (
                <div className={s.simulationBlock}>
                    <h3>{t('Черновик ответа')}</h3>
                    <p className={s.draftSubject}>{detail.draft.subject}</p>
                    <p className={s.draftBody}>{detail.draft.body}</p>
                </div>
            )}
            <div className={s.simulationBlock}>
                <h3>{t('Метрики')}</h3>
                {detail.metrics.map((metric) => (
                    <p key={metric.stage} className={s.simulationMetric}>
                        {metric.stage} · {metric.provider}/{metric.model} · {metric.durationMs}мс
                        {metric.totalTokens !== undefined ? ` · ${metric.promptTokens ?? 0}→${metric.completionTokens ?? 0} токенов` : ''}
                    </p>
                ))}
            </div>
        </div>
    );
};

export const SimulationHistoryPanel = ({
    runs, loading, page, setPage, total, totalPages, providerFilter, setProviderFilter, selectedRun, openRun, closeRun,
}: {
    runs: SimulationRunSummary[];
    loading: boolean;
    page: number;
    setPage: (page: number) => void;
    total: number;
    totalPages: number;
    providerFilter: '' | SimulationProvider;
    setProviderFilter: (value: '' | SimulationProvider) => void;
    selectedRun: SimulationRunDetail | null;
    openRun: (id: number) => void;
    closeRun: () => void;
}) => {
    const { t } = useTranslation();
    return (
        <section className={s.card}>
            <div className={s.header}>
                <h2>{t('История симуляций')}</h2>
                <label>
                    {t('История симуляций — провайдер')}
                    <select value={providerFilter} onChange={(e) => setProviderFilter(e.target.value as '' | SimulationProvider)}>
                        <option value="">{t('Все провайдеры')}</option>
                        <option value="OLLAMA">{t('Ollama (локально)')}</option>
                        <option value="OPENAI">{t('OpenAI (облако)')}</option>
                    </select>
                </label>
            </div>
            <div className={s.tableWrap}>
                <table className={s.table}>
                    <thead>
                        <tr>
                            <th>{t('Дата')}</th>
                            <th>{t('Тема')}</th>
                            <th>{t('Промпты')}</th>
                            <th>{t('Провайдер/модель')}</th>
                            <th>{t('Токены')}</th>
                            <th>{t('Время')}</th>
                            <th>{t('Итог')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {runs.map((run) => {
                            const { totalDurationMs, totalTokens } = summarizeMetrics(run.metrics);
                            return (
                                <tr key={run.id} onClick={() => openRun(run.id)} className={s.clickableRow}>
                                    <td>{new Date(run.createdAt).toLocaleString()}</td>
                                    <td>{run.subject}</td>
                                    <td>{run.classificationPromptName ?? t('(активный)')} / {run.draftBodyPromptName ?? t('(активный)')}</td>
                                    <td>{run.draftProvider ? `${run.draftProvider}/${run.draftModel}` : '—'}</td>
                                    <td>{totalTokens || '—'}</td>
                                    <td>{totalDurationMs}{t('мс')}</td>
                                    <td>{outcomeLabel(run, t)}</td>
                                </tr>
                            );
                        })}
                        {!runs.length && <tr><td colSpan={7} className={s.empty}>{t('Симуляции ещё не запускались')}</td></tr>}
                    </tbody>
                </table>
            </div>
            <HistoryPagination page={page} totalPages={totalPages} total={total} loading={loading} onPageChange={setPage} />
            {selectedRun && <RunDetail detail={selectedRun} onClose={closeRun} />}
        </section>
    );
};
```

- [ ] **Step 6: Mount it in `KnowledgeBasePage.tsx`**

Add the import (after line 10):

```ts
import { SimulationHistoryPanel } from './SimulationHistoryPanel';
import { useSimulationHistory } from '../useSimulationHistory';
```

Wire the hook and render it after `EmailSimulationPanel` (in the component body, after the existing hook calls around line 175 and after the JSX around line 197):

```tsx
    const simulationHistory = useSimulationHistory();
```

```tsx
            <EmailSimulationPanel form={simulationForm} setForm={setSimulationForm} running={simulationRunning} result={simulationResult} run={runSimulation} prompts={prompts} />
            <SimulationHistoryPanel {...simulationHistory} />
```

- [ ] **Step 7: Add the `.clickableRow` style**

In `KnowledgeBasePage.module.scss`, add near `.table` (after the block ending at line ~152):

```scss
.clickableRow {
    cursor: pointer;
}

.clickableRow:hover {
    background: var(--sidebar-hover-bg-redesigned);
}
```

- [ ] **Step 8: Run all tests to verify they pass**

```bash
cd client
npx jest src/pages/KnowledgeBasePage
```

Expected: all tests, including the 3 new history tests, PASS.

- [ ] **Step 9: Lint + full client suite**

```bash
cd client
npm run lint:ts
npm test
```

Expected: no errors, full suite green.

- [ ] **Step 10: Commit**

```bash
git add client/src/pages/KnowledgeBasePage/simulationHistoryTypes.ts \
        client/src/pages/KnowledgeBasePage/useSimulationHistory.ts \
        client/src/pages/KnowledgeBasePage/ui/SimulationHistoryPanel.tsx \
        client/src/pages/KnowledgeBasePage/ui/KnowledgeBasePage.tsx \
        client/src/pages/KnowledgeBasePage/ui/KnowledgeBasePage.module.scss \
        client/src/pages/KnowledgeBasePage/ui/KnowledgeBasePage.test.tsx
git commit -m "feat(client): add simulation run history panel with provider filter and detail view"
```

---

### Task 15: Full-repo checks and browser QA

**Files:** none (verification only).

- [ ] **Step 1: Root CI**

```bash
cd /Users/admin/Projects/hhdc
npm run ci
```

Expected: green (mirrors what CI runs — server `test:ci` + client `npm test`/`lint:ts` per root script).

- [ ] **Step 2: Graphify refresh**

Per `AGENTS.md`'s "Always" rule, a new Prisma domain (this feature added a whole new schema file) requires a graph refresh:

```bash
npm run graphify:specs
```

- [ ] **Step 3: Manual browser QA against the local dev stack**

Follow `.agents/skills/manual-automation/` or `.agents/skills/e2e-test/` (UI changed) against a running local dev stack (`npm run docker:rebuild`, with a local `OPENAI_API_KEY` set per the earlier conversation in this session, and Ollama running with `qwen3:0.6b`/`bge-m3` pulled):

1. Open `KnowledgeBasePage`, run a simulation with `noKnowledge` unchecked and both query-expansion/rerank enabled — confirm metric lines appear under Classification/Knowledge/Draft with plausible model names, non-zero durations, and token counts for Classification/Draft.
2. Confirm the new "История симуляций" table shows the just-run simulation at the top, with summed tokens/duration matching what the panel above showed.
3. Switch the provider filter to `OpenAI` and back to `Все провайдеры` — confirm the list re-fetches (network tab) and reflects the filter.
4. Click a history row — confirm the detail view opens below the table with the original classification/knowledge/draft content and its metrics, and "Закрыть" hides it again.
5. Toggle dark theme (per `.claude/rules/code-style.md` Rule 5) and re-check the metrics line and history table are legible in both themes.

- [ ] **Step 4: Commit any QA-driven fixes**

If QA surfaces a bug, fix it, re-run the narrowest relevant test/check, and commit with a `fix:` message before moving on — do not batch QA fixes into the feature commits above.

---

## Execution Handoff Note

This plan has 15 tasks with real inter-task dependencies (Task 10 needs Tasks 2–9's `onMetric` options and `SimulationRunRepository` to exist; Task 11 needs Task 10's `runId`/`metrics` on the result; Task 14 needs Task 13's `SimulationMetric` type; Task 15 needs everything). A shipped bug here (wrong token count, double-counted rerank cost, a broken migration) is cheap to notice and fix, not catastrophic — this is an internal admin tool, not customer-facing.
