# AI draft provider switching

## Intent

HHDC Admin should keep the email-assistant pipeline local by default while allowing an admin to
switch the provider used for the final reply draft from Ollama to OpenAI without restarting the
backend. The provider switch applies only to final reply-body generation. Email normalization,
deterministic spam checks, classification, CRM lookup, embeddings, retrieval, query expansion, and
reranking remain local and continue to use Ollama or deterministic code.

The generated draft still requires the existing human approval step in Telegram. OpenAI never sends
an email and never receives credentials, SMTP configuration, or tool access. If the selected
provider fails, the message is left for manual handling; the system must not silently fall back to
another provider.

## Current architecture

The domain already exposes `LlmClient` and `DraftLlmClient` interfaces, and the draft pipeline
accepts a `DraftLlmClient`. This is a suitable seam for provider selection. The concrete wiring is
still Ollama-specific, however: the worker, cron pipeline, and simulation construct
`OllamaLlmClient` directly; the classification and draft methods live in the same adapter; and the
knowledge-ingestion clients all call Ollama directly. `AiConfig` has no provider setting, and
`AiEmailDraft.model` records only a model name, not the provider that generated it.

The current local-AI specification explicitly describes Ollama as the only LLM and excludes cloud
LLM APIs. That specification and its operations document must be updated as part of this feature.

## Runtime model

The system will use two distinct provider boundaries:

```text
Inbound email
  -> normalize + deterministic spam checks
  -> Local classification (Ollama)
  -> Local CRM lookup + RAG (Ollama embeddings/retrieval)
  -> DraftProviderFactory
       -> Ollama draft provider
       -> OpenAI draft provider
  -> persist draft + provider metadata
  -> Telegram approval
  -> existing SMTP send pipeline
```

`DraftProvider` is the narrow interface for final draft generation. It receives the already-built
draft context and returns only the reply body. The deterministic code continues to derive the
subject, reply language, confidence, manual-review flag, and knowledge references. The existing
`LlmClient` classification interface remains local and is not routed through the provider switch.

`DraftProviderFactory` reads the active database setting at the beginning of each draft worker run
or simulation. It creates either `OllamaDraftProvider` or `OpenAiDraftProvider`. A job keeps the
selected provider and model for its entire generation attempt, so an admin change cannot change a
provider halfway through a request. The simulation endpoint uses the same factory and can report
which provider/model generated the preview.

## Configuration and secrets

The database stores the active non-secret selection in a singleton `AiRuntimeSettings` row:

- `draftProvider`: `OLLAMA` or `OPENAI`;
- `draftModel`: the selected model identifier;
- `updatedById` and timestamps for auditability.

The database never stores provider keys. Environment/secret configuration supplies:

- `OPENAI_API_KEY` — required only when OpenAI is selected;
- `OPENAI_BASE_URL` — optional endpoint override for compatible infrastructure;
- `OPENAI_DEFAULT_MODEL` — default used to initialize the setting;
- `OPENAI_ALLOWED_MODELS` — comma-separated allowlist accepted by the admin API;
- existing Ollama URL/model settings for local classification, RAG, and local drafting.

The server validates that an OpenAI model is in the configured allowlist before saving or using it.
The admin UI receives provider and allowed model names, never secrets. Startup validation reports a
clear configuration error only when OpenAI is selected without its API key; the local provider must
continue to work when OpenAI is not configured.

## Persistence and failure behavior

`AiEmailDraft` will record:

- `provider` (`OLLAMA` or `OPENAI`);
- `model`;
- `generationErrorCode` and a bounded human-readable error message for failed attempts.

The existing `FAILED` draft status becomes the durable manual-processing state for provider errors.
The pipeline creates a failed draft record with the original email/version and no generated body,
logs the provider error without the API payload, and does not call another provider. The admin can
retry explicitly after correcting the provider configuration; a retry creates the next draft
version and records fresh provider metadata. Existing generated, edited, approved, and sent drafts
are never regenerated because the global setting changed.

Provider errors are normalized into stable codes such as `PROVIDER_NOT_CONFIGURED`,
`PROVIDER_TIMEOUT`, `PROVIDER_RATE_LIMITED`, `PROVIDER_INVALID_RESPONSE`, and
`PROVIDER_UNAVAILABLE`. Raw provider responses and prompts are not written to logs or persisted.

## Admin API and UI

Add an admin-only AI settings API alongside the existing AI-email routes:

- `GET /ai-email/settings` returns the active provider, model, allowed models, configuration status,
  and updated-at metadata;
- `PUT /ai-email/settings` validates provider/model, persists the selection, and records the actor;
- `POST /ai-email/settings/test` performs a synthetic provider health check without customer data.

Only `ADMIN` may read or change provider settings. The test endpoint never sends a customer email
and must not use a real CRM message. The UI adds the provider section to the existing Knowledge
Base AI controls next to the prompt library and simulation panel, with provider/model selection,
configuration status, last update, and a guarded save action.
The UI must state that changing the setting affects new draft attempts only and that provider
failures require manual handling.

The prompt-library UI remains shared between providers. Provider-specific adapters receive the same
resolved `DRAFT_BODY` instructions and the same dynamically appended email/CRM/knowledge context.
The classification prompt and classification model remain local and are not exposed as an OpenAI
selection.

## OpenAI adapter contract

Use the official OpenAI server SDK behind `OpenAiDraftProvider`. Keep the SDK isolated to the
provider adapter; the pipeline must depend only on `DraftProvider`. The adapter requests a single
text response for the reply body, applies the existing length and non-empty validation, and returns
an error for timeout, non-2xx response, malformed response, or quota/rate-limit failure.

The OpenAI request contains only the final drafting context already assembled by the application:
the inbound message text, selected CRM projection, resolved prompt instructions, and retrieved
knowledge. It does not include API keys, mailbox credentials, unrelated database rows, internal
approval state, or tool definitions. The adapter does not enable tool calls, browsing, file access,
or autonomous actions.

## Testing and rollout

Unit tests will cover configuration parsing, allowlist validation, provider factory selection,
OpenAI request shaping, response parsing, timeout/rate-limit mapping, and the no-fallback rule.
Pipeline tests will prove classification and RAG still use local seams while only draft generation
uses the selected provider. Controller tests will cover admin authorization and settings updates.
Client tests will cover provider/model rendering, validation, save status, and the warning shown for
manual handling. E2E will open the admin settings, switch the provider in the isolated environment,
run a synthetic test, and verify that a draft attempt records the selected provider without sending
an email.

Rollout starts with `OLLAMA` as the database default, preserving current behavior. OpenAI remains
disabled until `OPENAI_API_KEY` and an allowed model are configured. Enabling OpenAI is an explicit
admin action, and switching back to Ollama is always available. No migration or deployment step
will transmit existing email data to OpenAI.

## Out of scope

- Routing classification, embeddings, query expansion, or reranking to OpenAI;
- automatic provider fallback;
- per-email or per-user provider selection;
- storing API keys in Prisma or editing secrets from the UI;
- sending mail directly from OpenAI;
- automatic regeneration of existing drafts after a provider switch.
