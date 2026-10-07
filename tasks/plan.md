# Implementation Plan: AI email assistant with RAG V2

## Overview

Port the email assistant and RAG V2 from `ddc-nl` into the HHDC CRM, reusing the existing AI provider registry, knowledge base, prompt versions and AI drafts. The mechanics come from `ddc-nl`; the domain model is HHDC, as described in `server/knowledge/hhdc-knowledge-v1` (facts, rules, FAQ, examples) and `-v2` (pipeline, intent router, CRM contract). Nothing is sent without human approval and no Telegram approval is restored.

## Relevant Context

- Knowledge lives in `KnowledgeDocument` / `KnowledgeChunk`; RAG V2 layer metadata is stored in `KnowledgeChunk.metadata` (`kb: "v2"`), no schema change.
- Knowledge files: `server/knowledge/hhdc-knowledge-v1` and `-v2` (`RAG_KNOWLEDGE_PATH`, comma separated). The folder is gitignored, so tests use a small committed fixture under `server/src/modules/ai/rag-v2/__fixtures__/hhdc-kb`.
- Facts carry `event_year` and `status`; a fact of another edition never answers a question about the current one (`HHDC_EVENT_YEAR`).
- CRM data (orders, tickets, payments, registrations) is read only when the email concerns the customer's own records.
- Prompt versions use the existing `PromptDefinition` endpoints with keys `email_classification` and `email_draft_body`.
- Drafts stay `AiDraft`; the RAG trace is kept in `contextSnapshot`.

## Task List

- [x] Task 1: `server/src/modules/knowledge/kb-v2/**`, `POST /knowledge/sync-v2`.
- [x] Task 2: `server/src/modules/ai/rag-v2/**`.
- [x] Task 3: `server/src/modules/ai/{email-assistant,email-llm,email-prompts,draft.service}.ts`.
- [x] Task 4: `server/src/modules/ai/inbound-pipeline.ts`, hooked to `email.received` in the outbox worker; enabled by `AI_EMAIL_CLASSIFICATION_ENABLED=true` and `AI_EMAIL_DRAFT_ENABLED=true`.
- [x] Task 5: `POST /ai/email-simulation`, `client/src/pages/CrmPage/ui/knowledge/**`.

## Verification Plan

- [x] Server: `npm run build`, `npm run test:ci`.
- [x] Client: `npm run lint:ts`, `npm test`.
- [ ] Live run against a connected AI provider with an embedding model.
- [ ] Browser QA.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Model invents prices or schedules | High | Grounding validator, one regeneration, then staff review. |
| Background drafting floods the model | Medium | Off by default; only mail received in the last 24 hours; one draft per conversation. |
| Sync overwrites knowledge edited in the CRM | Medium | Edited documents are kept unless overwrite is requested. |

## Open Questions

- Simulation history and LLM metrics from `ddc-nl` are not ported.
- Email thread history is not passed to the model yet (the context template has an `email_thread` block).
- The golden email set (`16_test_dataset`) is not wired as an automated evaluation against a live model.
