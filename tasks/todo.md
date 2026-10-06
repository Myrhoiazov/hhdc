# Todo: DDC Local AI Email Assistant

- [x] Task 1: Phase 0 AI runtime configuration and benchmark procedure (live measurements remain an operator-run prerequisite)
- [x] Task 2: Phase 1 ingestion/normalization/classification foundation (worker scheduling remains next slice)
- [x] Task 3: Phase 2A/2B/2C/2D knowledge ingestion, embeddings and retrieval foundation
- [x] Task 4: Phase 3 read-only CRM context and draft generation
- [x] Task 5: Phase 4 Telegram approval workflow
- [x] Task 6: Phase 5 approved-only SMTP delivery and audit (see Task 15)
- [ ] Task 7: Phase 6 hardening and evaluation
- [x] Task 11: Repo hygiene and doc/config drift fixes (stray `server/server/`, `LLM_KEEP_ALIVE` default drift)
- [x] Task 12: Container resource limits for the Ollama Compose service
- [x] Task 13: Deterministic reply-language enforcement in draft generation
- [x] Task 14: Phase 2B real PDF/DOCX extraction (pdf-parse v2 + mammoth; see plan.md note on the v1 buffer bug)
- [x] Task 15: Phase 5 approved-only SMTP delivery and audit (AI_EMAIL_SEND_ENABLED, default false)
- [x] Task 16: Document the Phase 0 benchmark gap (documented in OPERATIONS.md; still needs an operator to actually run it before enabling any flag in production)
- [x] Task 17: Fix real crawler correctness against talentcenterddc.nl and rebuild the knowledge base (language detection, dedup, sitemap-index recursion, CDATA parsing; live-verified against the real site + MySQL + Ollama)
- [x] Task 18: Fixed `needsReply` classification — added explicit criteria to the prompt (was giving the model nothing to reason from). Verified live: a real customer email through the site's contact form (id=59) now classifies `needsReply:true` consistently, vs. `false` before on both `qwen3:0.6b` and `qwen3:1.7b`.
- [x] Task 19: Draft JSON-format investigation — `qwen3:1.7b` reproducibly ignored "raw JSON only" for the draft prompt (markdown prose instead). Ollama's `format: "json"` fixed that for classification (kept there) but made drafting return an empty `{}` instead (confirmed live, ruling out context-size and temperature as the cause) — reverted for drafting, kept 3 repair attempts there instead. Verified live end-to-end at least once: real email → IMAP sync → classify → draft → persisted → real Telegram approval notification, confirmed by the user via screenshot.
- [x] Task 20: Fixed two real knowledge-quality bugs found while diagnosing a draft that just paraphrased the customer's question: `normalizeKnowledgeHtml`'s unanchored `<li>`/`<p>` regexes matched `<link>`/`<path>`/`<picture>`/`<pre>` by prefix, bloating every document with content-free "- " bullets; chunk size (1200 chars) + topK (4) overflowed the 2048-token draft context (reduced default to 500). Also added chunk overlap (250 chars, ~100+ tokens) per user's direct question — there was none before.
- [x] Task 21/22: Draft-generation reliability solved without a bigger model, per explicit direction (server can't run one). Redesigned to ask the LLM for body text only — every other field (`replyLanguage`, `subject`, `usedKnowledgeIds`, `confidence`, `needsManualAnswer`) is now computed deterministically from data the pipeline already has, not parsed from model JSON. Also disabled "thinking" for this call only (`think: false`) — 3-5x faster and stopped the model mistranslating exact facts from knowledge (kept thinking ON for classification, where disabling it broke language detection). Live-verified via the real production function: 5/5 successful runs (was ~1/3).
- [x] Task 23: Found and fixed why nothing arrived in Telegram after "Edit" — no bug this time, the Telegram bot had **no webhook registered at all** (`getWebhookInfo` → `"url":""`), so Telegram had nowhere to deliver button presses or messages, regardless of controller code. User declined a public tunnel (ngrok). Implemented `getUpdates` long-polling as a webhook alternative that needs no public URL — new `telegram-approval.polling.service.ts`, opt-in via `TELEGRAM_POLLING_ENABLED`, reusing the exact same `handleTelegramApprovalUpdate` core logic the webhook uses (refactored out of the controller so webhook and polling can never drift apart). Then found the DDC bot and this Claude Code session's own Telegram channel share one bot token — Telegram's `getUpdates` refuses two concurrent long-polls on the same token (`HTTP 409`) — so polling was turned back off (`TELEGRAM_POLLING_ENABLED=false`) pending a dedicated bot token for DDC. 72/72 tests, `tsc --noEmit` clean.
- [x] Task 24: Removed `format: "json"` from classification too (not just drafting, Task 19/22) — confirmed live it also made `classifyEmail` reliably return an empty `{}` for prompts that had worked minutes earlier, for both a short synthetic email and the real customer email, independent of prompt content. Plain generation + existing schema validation/repair-retry went from 0/4 to 3-4/4 live across repeated tests — matches the same fix already applied to drafting.
- [x] Task 25: Added `npm run ai:test-flow`, a local CLI to run one hand-written subject/body through the real pipeline (normalize → spam check → classify → RAG retrieve → draft) without IMAP, DB writes, or Telegram — supports `--from`, `--body`/`--body-file`/stdin, `--top-k`, `--no-knowledge`, `--force-draft`, `--json`. Had to import the specific submodules instead of the `ai-email-assistant` barrel to dodge a pre-existing circular import (barrel → send.persistence → communication/email/email-smtp.service → email-imap.service → back to the barrel) that only surfaces when the barrel is the first thing a fresh entry point imports.
- [x] Task 26: Two fixes found by dogfooding the new CLI — `ai:test-flow` now IS the env-aware wrapper by default (was a separate `:local` variant nobody remembered to use; raw version moved to `ai:test-flow:raw`), and prints its resolved config on every run; `emailClassificationSchema`'s `reason` field is now optional (default `''`) since it's audit-only text nothing branches on, and was occasionally the only field a real classification came back missing.
- [x] Task 27: Rewrote the drafting prompt (`draftBodyPrompt`) in Russian with an explicit persona ("помощник-консультант школы танцев Talent Center DDC") and concrete tone instructions (open with a greeting, reference something specific from the customer's email) — user's direct request. Abstract tone adjectives alone didn't change live output; concrete, checkable instructions did (verified 3/3). Classification's prompt intentionally left in English/untouched (internal, not customer-facing, recently stabilized) — flagged to the user as a scope choice, not decided unilaterally.
- [x] Task 28: User caught a real bug in Task 27's own prompt — the greeting instruction assumed every inquiry was about a child ("возраст ребёнка"), but the studio serves all ages/levels. Fixed to be audience-neutral and told the model not to default to "child" just because retrieved knowledge skews that way. Testing that surfaced two more issues: a "never copy the customer's email" instruction had been silently dropped during Task 22's redesign (drafts were opening with near-verbatim copies again), and the model kept saying "ребёнка" for adult customers because the retrieved knowledge chunk itself said that — added a rule to keep facts verbatim but swap only the mismatched audience word for a neutral one. Verified live: 3/3 adult-themed and the original child-themed sample all correct now.
- [ ] Checks passed (`npm run ci` from the root)
- [ ] Code review passed
- [ ] Browser QA completed or marked not required
- [ ] Ready for PR

## Knowledge Base Admin Page (2026-09-22)

- [x] Task 29: Prisma — `category`/`priority`/`tags` on `KnowledgeDocument`, new `PENDING` status
- [x] Task 30: Backend — manual file upload + single-URL crawl staging (with SSRF guard)
- [x] Task 31: Backend — admin API (list/patch/delete/run-embedding), ADMIN-only
- [x] Task 32: Client — `KnowledgeBasePage` (upload/crawl forms, table, route, sidebar entry)
- [x] Task 33: Wire new tests into `test:local-ai`; `npm run ci` green
- [x] Checks passed (server: typecheck + test:local-ai 97 + test:ci 349; client: lint/stylelint + test 1011)
- [ ] Code review passed
- [x] Browser QA completed (real dev stack: crawled a real URL, uploaded a real file, ran embedding via real Ollama, dark theme, cleaned up test rows) — found and fixed 2 real bugs (see plan.md "Delivered and live-verified")
- [ ] Ready for PR (into `feat/local-ai-email-assistant-phase0`, not `develop` — see plan.md)

## Email Assistant Simulation Panel (2026-09-22, same day)

- [x] Task 34: Extract `ai:test-flow` CLI's pipeline into shared `simulation.service.ts`
- [x] Task 35: `POST /ai-email/simulate` HTTP endpoint, ADMIN-only
- [x] Task 36: `EmailSimulationPanel` on `KnowledgeBasePage` (form + rendered model output)
- [x] Checks passed (server: typecheck + test:local-ai 101/101; client: stylelint + test 1014/1014)
- [ ] Code review passed
- [x] Browser QA completed live — real pricing question correctly classified/answered with real
  knowledge citations; deterministic-spam branch also verified live (see plan.md)
- [ ] Ready for PR (same branch as the Knowledge Base Admin Page section above)

## Knowledge Documents Pagination (2026-09-22, same day)

- [x] Task 37: `GET /knowledge/documents` paginated (`_page`/`_limit`, `+pendingTotal`)
- [x] Task 38: Client pagination UI, 20/page, reusing `InvoicesPagePagination`'s pattern
- [x] Checks passed (server: typecheck + test:local-ai 101/101; client: stylelint + test 1015/1015)
- [ ] Code review passed
- [x] Browser QA completed live — real 55-document knowledge base showed 3 pages, page 2 loaded
  real different documents on click
- [ ] Ready for PR (same branch as the sections above)

## Editable, DB-Backed System Prompts (2026-09-22, same day)

- [x] Task 39: `AiPrompt` model — slot/name/content/tags, one active row per slot
- [x] Task 40: `ollama.client.ts` resolves instructions from active/overridden prompt, not hardcoded
- [x] Task 41: Admin CRUD API `/ai-email/prompts` (list/create/update/activate/delete), ADMIN-only
- [x] Task 42: Simulation accepts a per-run prompt override (test without activating)
- [x] Task 43: `PromptLibraryPanel` + prompt selects in `EmailSimulationPanel`
- [x] Checks passed (server: test:local-ai 107/107; client: stylelint + test 1019/1019)
- [ ] Code review passed
- [x] Browser QA completed live — created/tested-without-activating/activated/verified
  active-affects-default-path/deleted a test prompt; confirmed real dev server crash+recovery
  from a `replaceAll` ts-node-only compile issue (see plan.md)
- [ ] Ready for PR (same branch as the sections above)

## Hybrid Retrieval: BM25 + RRF (2026-09-22/23, same session)

- [x] Task 44: `Bm25Search` — pure-TS Okapi BM25, ported from `rag/src/bm25.ts`
- [x] Task 45: `fuseRankedLists` — Reciprocal Rank Fusion, ported from `rag/src/rrf.ts`
- [x] Task 46: Wired into `KnowledgeRetrievalService.retrieve()` (score-bar/de-dup unchanged, BM25/RRF only re-rank within the qualifying set)
- [x] Checks passed (server: tsc + ts-node both clean, test:local-ai 119/119, test:ci 371/371)
- [ ] Code review passed
- [x] Browser QA completed live — "Lito Dance Camp" query retrieved 4 correctly-scoped real chunks (cosine scores 0.634–0.690), accurate draft with no fabricated facts
- [ ] Ready for PR (same branch as the sections above)
- [x] Follow-ups from this section (reranker, query expansion) — done, see next section

## Query Expansion + Reranker (2026-09-23, same session)

- [x] Task 47: `query-expansion.service.ts` (`OllamaQueryExpansionClient` + pure parser)
- [x] Task 48: `reranker.service.ts` (`OllamaReranker`, native → bi-encoder → no-op fallback)
- [x] Task 49: `ai.config.ts` flags (`ragQueryExpansionEnabled`/`ragRerankEnabled`/`ragRerankModel`, all default off for real production) + `.env.example`
- [x] Task 50: Wired into `KnowledgeRetrievalService`, production cron (config-gated), simulation (always available + opt-out)
- [x] Task 51: Client checkboxes + query-expansion display in `EmailSimulationPanel`
- [x] Checks passed (server: tsc + ts-node clean, test:local-ai 135/135, test:ci 387/387; client: test 1020/1020)
- [ ] Code review passed
- [x] Browser QA completed live — casual/vague query ("привет а можно узнать что там с высокими
  каблуками... это как хип хоп или другое") correctly disambiguated to the "High Heels" dance
  style (not literal footwear) via query expansion; hybrid retrieval + reranker + draft all ran
  without errors
- [ ] Ready for PR (same branch as the sections above)

## Configurable Chunk Size/Overlap (2026-09-23, same session)

- [x] Task 52: `ai.config.ts` — `ragChunkSize`/`ragChunkOverlap` fields, defaults 700/100, `RAG_CHUNK_SIZE`/`RAG_CHUNK_OVERLAP` env vars
- [x] Task 53: `embedding.service.ts` — `chunkKnowledgeDocument` defaults now read from config instead of hardcoded 500/250
- [x] Task 54: Test fixtures updated (`ai.config.test.ts`, `query-expansion.service.test.ts`, `reranker.service.test.ts`, `ollama.client.test.ts`)
- [x] Task 55: Real gap found + fixed — `RAG_QUERY_EXPANSION_ENABLED`/`RAG_RERANK_ENABLED`/`RAG_RERANK_MODEL`/`RAG_CHUNK_SIZE`/`RAG_CHUNK_OVERLAP` were never passed through in `docker-compose.dev.yml`/`docker-compose.prod.yml`
- [x] Task 56: `.env.example` documented
- [x] Checks passed (server: tsc + ts-node clean, test:local-ai 136/136, build clean, test:ci 388/388; both compose files validated with `docker compose config`)
- [ ] Code review passed
- [x] Browser QA — not repeated; low-risk default-only change over code paths already live-verified in the sections above
- [ ] Ready for PR (same branch as the sections above)

## Telegram Admin Bot — Phase 1-3 (2026-09-23, new branch feat/telegram-admin-bot)

Contract: `docs/spec/TELEGRAM_ADMIN_BOT_SPEC.md`, `docs/prompts/TELEGRAM_ADMIN_BOT_AGENT_PROMPT.md`.
Acceptance checklist: `docs/TELEGRAM_ADMIN_BOT_CHECKLIST.md` (Discovery/Foundation/Dashboard/
Students/Verification sections ticked; Mollie sections deliberately left for Phase 4).

- [x] Discovery + REUSE/REFACTOR/ADD matrix + plan (see `tasks/plan.md`)
- [x] Phase 1: shared Bot API client, shared update dispatcher (one webhook/bot for both
  features), RBAC resolver over existing `AuthIdentity`, flow-state store, root menu, Back/Cancel
- [x] Phase 2: dashboard flow (`getMollieDashboardSummary` + new `getClientCount`), student search
  flow (`getAllClients`)
- [x] Phase 3: guided student-creation flow (`createClient` + exported `createClientSchema`),
  audited via `recordAuthSecurityEvent`
- [x] Real bug found+fixed: `/telegram/webhook` was missing from `auth.csrf.middleware.ts`'s CSRF
  exemption list (pre-existing, affected the already-shipped email-approval bot too whenever
  polling is off) — added, with new `auth.csrf.middleware.test.ts`
- [x] Checks passed (server: tsc clean, new `test:telegram-admin-bot` 28/28, full `test:ci` 0
  failures, `build` clean)
- [x] Live-verified against the real dev stack (real Telegram Bot API + real dev MySQL): temp
  `AuthIdentity` linked/unlinked to prove authorized vs unauthorized behavior, `/start` sent a
  real message to the real configured group, dashboard/search rendered real (empty) DB data
  correctly; temp identity removed after
- [ ] Code review passed
- [ ] Phase 4 (Mollie Customer / mandate status / Subscription / Payment Link) — not started, see
  `tasks/plan.md` "Deliberately deferred" note
- [ ] Ready for PR (checkpoint reached deliberately before financial-write operations)
