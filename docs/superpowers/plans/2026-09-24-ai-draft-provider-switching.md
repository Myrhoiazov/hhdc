# Switchable AI Draft Providers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an admin-controlled runtime switch between local Ollama and OpenAI for final email draft body generation, while keeping classification and retrieval local and routing provider failures to manual processing.

**Architecture:** Keep the existing `DraftLlmClient` seam and introduce provider adapters plus a factory that reads a persisted singleton runtime setting. Add a Prisma-backed settings repository and admin-only settings routes; the UI in Knowledge Base renders the current provider/model and allows a safe test call. Draft persistence records provider/model and bounded failure metadata; no automatic fallback occurs.

**Tech Stack:** TypeScript, Express 5, Zod, Prisma 6/MySQL, React 19, Axios, Jest/Node test runner, SCSS Modules.

**Spec:** `docs/superpowers/specs/2026-09-24-ai-draft-provider-switching-design.md`

## Global Constraints

- OpenAI is used only for final reply-body generation; classification, spam checks, CRM lookup, embeddings, query expansion, reranking, and sending remain local/application-owned.
- Provider selection is runtime state in the database and can be changed by an ADMIN without a process restart.
- OpenAI credentials are environment-only (`OPENAI_API_KEY`, optional `OPENAI_BASE_URL`, `OPENAI_DEFAULT_MODEL`, `OPENAI_ALLOWED_MODELS`); never persist secrets.
- A selected-provider failure creates a durable manual-processing state and never silently falls back to the other provider.
- Every generated retry is a new draft version; Telegram/human approval remains required before SMTP send.
- Prisma schema changes require `npm run prisma:generate` and a migration; run `npm run graphify:specs` after the structural change.
- No credentials, customer data, generated dependencies, or AI attribution trailers may be committed.

## Review Focus

- Missing/blank `OPENAI_API_KEY` while OpenAI is selected must return `PROVIDER_NOT_CONFIGURED` and leave the message for manual handling; test in provider factory and route.
- OpenAI timeout/rate-limit/invalid JSON must map to bounded error codes without leaking provider response bodies; test adapter normalization.
- Concurrent settings updates must leave one valid singleton row and return the latest provider/model; test repository update semantics.
- Simulation must honor the selected provider but use synthetic input and must not mutate customer drafts; test simulation service/controller.
- Existing Ollama classification and RAG calls must remain untouched when OpenAI is selected; test pipeline wiring with spies/fakes.

### Task 1: Persist runtime AI draft settings

**Files:**
- Create: `server/prisma/schema/ai-runtime-settings.prisma`
- Modify: `server/prisma/schema/ai-email.prisma` (provider/error metadata on `AiEmailDraft`)
- Create: `server/src/modules/ai-email-assistant/runtime-settings.service.ts`
- Test: `server/src/modules/ai-email-assistant/runtime-settings.service.test.ts`

**Interfaces:**
- Produces `DraftProviderName`, `AiRuntimeSettings`, `AiRuntimeSettingsRepository`, and `getOrCreateAiRuntimeSettings`/`updateAiRuntimeSettings` used by the factory and controller.
- `AiRuntimeSettings` exposes `{ provider: 'OLLAMA' | 'OPENAI'; model: string; updatedAt: Date }` and never exposes API keys.

- [ ] Write failing repository/service tests for default `OLLAMA`, model validation against allowed OpenAI models, and atomic singleton update.
- [ ] Add Prisma enum/model and draft fields `provider`, `generationErrorCode`, `generationErrorMessage` with bounded lengths and defaults preserving existing rows.
- [ ] Implement config-backed defaults and repository methods using the existing Prisma client and a fixed singleton key.
- [ ] Run the focused service test, `cd server && npm run prisma:generate`, create the migration with Prisma, and run the test again.
- [ ] Commit `feat: persist runtime AI draft provider settings`.

### Task 2: Add OpenAI and provider-factory adapters

**Files:**
- Modify: `server/src/config/ai.config.ts`
- Create: `server/src/modules/ai-email-assistant/draft-provider.ts`
- Create: `server/src/modules/ai-email-assistant/openai.client.ts`
- Create: `server/src/modules/ai-email-assistant/draft-provider.factory.ts`
- Modify: `server/src/modules/ai-email-assistant/ollama.client.ts`
- Test: `server/src/modules/ai-email-assistant/openai.client.test.ts`
- Test: `server/src/modules/ai-email-assistant/draft-provider.factory.test.ts`

**Interfaces:**
- `DraftProvider` extends the existing `DraftLlmClient` contract with `providerName` and `model` metadata.
- `createDraftProviderFactory(settingsRepository)` returns `getSelectedProvider()` and `testSelectedProvider()`; it selects only the persisted setting and throws typed `DraftProviderError` codes.
- OpenAI adapter sends only the resolved draft prompt/context, parses the existing `emailDraftSchema`, and redacts provider error details.

- [ ] Add failing tests for successful OpenAI draft parsing, timeout/rate-limit/invalid response mapping, missing key, and no fallback when OpenAI fails.
- [ ] Add `openai` dependency only if absent; read `OPENAI_*` config without committing values; keep embeddings/query expansion/reranker on Ollama.
- [ ] Implement the adapter with bounded request timeout, model allow-list validation, and stable error codes (`PROVIDER_NOT_CONFIGURED`, `TIMEOUT`, `RATE_LIMITED`, `INVALID_RESPONSE`, `UNAVAILABLE`).
- [ ] Implement factory selection and synthetic test generation without customer data.
- [ ] Run focused adapter/factory tests and the existing Ollama tests.
- [ ] Commit `feat: add switchable Ollama and OpenAI draft providers`.

### Task 3: Wire draft pipeline, persistence, and manual failure state

**Files:**
- Modify: `server/src/modules/ai-email-assistant/draft.persistence.ts`
- Modify: `server/src/modules/ai-email-assistant/draft-pipeline.service.ts`
- Modify: `server/src/modules/ai-email-assistant/draft-pipeline.cron.service.ts`
- Modify: `server/src/modules/ai-email-assistant/simulation.service.ts`
- Test: `server/src/modules/ai-email-assistant/draft-pipeline.service.test.ts`
- Test: `server/src/modules/ai-email-assistant/simulation.service.test.ts`

**Interfaces:**
- Pipeline obtains the selected draft provider from the factory; classification worker continues constructing `OllamaLlmClient`.
- `AiEmailDraftRepository` persists provider/model on success and creates a failed/manual record with bounded error code/message on provider failure.

- [ ] Write failing tests proving selected OpenAI provider is used for body generation, Ollama remains used for classification/RAG, and provider failure increments `failed` while persisting manual state with no notification.
- [ ] Extend persistence input with provider metadata and add a failure persistence method that creates the next version with `status=FAILED`, `needsManualAnswer=true`, and redacted error metadata.
- [ ] Wire cron and simulation through the factory; simulation returns provider/model/error metadata but does not write customer drafts.
- [ ] Run the focused pipeline/simulation tests plus `npm run test:local-ai`.
- [ ] Commit `feat: route draft generation through selected provider`.

### Task 4: Expose admin settings API and audit-safe test endpoint

**Files:**
- Create: `server/src/modules/ai-email-assistant/runtime-settings.controller.ts`
- Create: `server/src/modules/ai-email-assistant/runtime-settings.routes.ts`
- Modify: `server/src/routes/index.ts`
- Test: `server/src/modules/ai-email-assistant/runtime-settings.controller.test.ts`

**Interfaces:**
- `GET /ai-email/settings` returns provider/model/status metadata.
- `PUT /ai-email/settings` accepts `{ provider, model }`, validates allowed models, records `updatedById`, and returns the saved setting.
- `POST /ai-email/settings/test` performs a synthetic provider call and returns `{ ok, provider, model, errorCode? }`; all routes require token auth and ADMIN role.

- [ ] Write failing controller tests for admin authorization, invalid provider/model, successful update, and redacted test failures.
- [ ] Implement Zod schemas, controller error mapping, and routes using existing `isToken`/`requireRole` patterns.
- [ ] Register routes under `/ai-email/settings` and run focused tests.
- [ ] Commit `feat: add admin AI provider settings API`.

### Task 5: Add Knowledge Base admin controls

**Files:**
- Create: `client/src/pages/KnowledgeBasePage/aiProviderSettingsTypes.ts`
- Create: `client/src/pages/KnowledgeBasePage/useAiProviderSettings.ts`
- Create: `client/src/pages/KnowledgeBasePage/ui/AiProviderSettingsPanel.tsx`
- Modify: `client/src/pages/KnowledgeBasePage/ui/KnowledgeBasePage.tsx`
- Create/modify: `client/src/pages/KnowledgeBasePage/ui/AiProviderSettingsPanel.module.scss`
- Test: `client/src/pages/KnowledgeBasePage/ui/KnowledgeBasePage.test.tsx`

**Interfaces:**
- Hook loads `/ai-email/settings`, updates with `PUT`, and calls `/ai-email/settings/test`; UI displays current provider/model, allowed model input, loading/success/error states, and a manual-processing warning.

- [ ] Add a failing component test for loading settings, switching to OpenAI, testing connection, and showing a redacted failure message.
- [ ] Implement hook and panel using existing API client, i18n helper, SCSS module tokens, and dark-theme styles.
- [ ] Keep prompt library and simulation controls intact; make provider selection explicit in the same Knowledge Base AI controls area.
- [ ] Run the focused Jest test, `npm run lint:ts`, and `npm test` from `client/`.
- [ ] Commit `feat: add admin UI for AI draft provider switching`.

### Task 6: Documentation, graph, review, and full verification

**Files:**
- Modify: `docs/spec/DDC_LOCAL_AI_EMAIL_ASSISTANT_OPERATIONS.md`
- Modify: `docs/spec/DDC_LOCAL_AI_EMAIL_ASSISTANT_SPEC.md`
- Generate/update: Prisma migration and graph artifacts as required by repository scripts.

- [ ] Update operations/spec docs to describe OpenAI env setup, runtime switch, manual failure behavior, and secret handling.
- [ ] Run `npm run graphify:specs`.
- [ ] Run `npm run ci` from the repository root and resolve failures without unrelated changes.
- [ ] Review `git diff develop...HEAD` against AGENTS.md and the approved spec, then commit documentation/verification changes as `docs: document switchable AI draft providers`.
