# Implementation Plan: DDC Local AI Email Assistant

## Overview

Deliver the local, human-approved email assistant in vertical phases. The local runtime, email
classification foundation, and knowledge ingestion/retrieval foundation are implemented. The next
vertical slice is Phase 3: read-only CRM context and draft generation.

## Relevant Context

- The server is an Express/TypeScript module-based API with environment configuration in
  `server/src/config/config.ts`.
- Email IMAP/SMTP and Telegram integrations already exist under
  `server/src/modules/communication/`.
- Docker Compose passes explicit environment variables to the backend; there is no Ollama service
  or LLM abstraction today.
- Production targets 2 CPU / 4 GB RAM, so concurrency and context defaults must remain bounded.

## Task List

- [x] Task 1: Phase 0 AI runtime configuration and benchmark procedure.
  - Acceptance: typed configuration exposes Ollama URL, model, context length, temperature,
    keep-alive, and max concurrency with the specified defaults; the model is never hard-coded in
    business logic; Docker dev/prod pass the variables; `.env.example` documents them.
  - Acceptance: an opt-in benchmark command records `free -h`, `docker stats --no-stream` when
    available, request latency, and Ollama response status without making CI depend on Ollama.
  - Verification: focused config tests, server build, inspect diff/status.
  - Dependencies: None.
  - Files likely touched: `server/src/config/ai.config.ts`, its test, Compose files, `.env.example`,
    benchmark script, local AI operations documentation.
  - Estimated scope: S.
- [x] Task 2: Phase 1 ingestion/normalization/classification foundation.
  - Acceptance: IMAP persistence stores bounded normalized text; deterministic spam checks run before
    model calls; Ollama classification is behind a narrow client and strict runtime schema with one
    repair retry.
  - Verification: AI module tests, existing email domain tests, and server build.
  - Dependencies: Task 1.
  - Files likely touched: `server/src/modules/ai-email-assistant/*`,
    `server/src/modules/communication/email/email-imap.service.ts`.
  - Estimated scope: M.
- [x] Task 3: Phase 2A website knowledge discovery and normalization foundation.
  - Acceptance: WordPress REST discovery with sitemap fallback, domain/include/exclude policy,
    normalized content, deterministic hash, and `knowledge:sync -- --dry-run` preview are available.
  - Verification: knowledge ingestion tests and server build.
  - Dependencies: Task 2.
  - Files likely touched: `server/src/modules/knowledge-ingestion/*`, `server/scripts/knowledge-sync.ts`.
  - Estimated scope: M.
- [x] Task 4: Phase 2B file ingestion and controlled import foundation.
  - Acceptance: allowlisted extensions, MIME/signature/size validation, text/HTML extraction,
    normalization, hashing, and explicit PDF/DOCX extraction errors are available.
  - Verification: file ingestion tests and server build.
  - Dependencies: Task 3.
  - Files likely touched: `server/src/modules/knowledge-ingestion/file-ingestion.service.ts`.
  - Estimated scope: S.
- [x] Task 5: Phase 2C local embeddings and indexing foundation.
  - Acceptance: configurable local embedding adapter defaults to the selected `bge-m3` model,
    semantic chunks, source/hash attribution, and benchmark procedure exist.
  - Verification: embedding/chunk tests and server build.
  - Dependencies: Task 4.
  - Estimated scope: M.
- [x] Task 6: Phase 2D retrieval and scheduled incremental updates foundation.
  - Acceptance: top-K/threshold/deduplicating retrieval, incremental sync planner, and opt-in
    scheduler exist behind storage/source interfaces.
  - Verification: retrieval/planner tests and server build.
  - Dependencies: Task 5.
  - Estimated scope: M.
- [x] Task 7: Phase 3 read-only CRM context and draft generation.
  - Delivered: `crm-context.service.ts` (read-only projection), `draft.service.ts`,
    `draft-pipeline.service.ts` wired behind `AI_EMAIL_DRAFT_ENABLED`.
- [x] Task 8: Phase 4 Telegram approval workflow.
  - Delivered: `telegram-approval.controller.ts`/`.routes.ts` mounted at
    `/api/v1/telegram/webhook`, `approval.service.ts` with actor allowlist and
    version-locked approval to prevent stale-draft approval.
- [x] Task 9: Phase 5 approved-only SMTP delivery and audit. (See Task 15 below — implemented
  together as part of the audit follow-up.)
- [ ] Task 10: Phase 6 hardening and evaluation.

## Audit follow-up (2026-09-16)

A spec-vs-implementation audit of this branch found the items below. Ordered safe-first;
each is independently verifiable.

- [ ] Task 11: Repo hygiene and doc/config drift fixes.
  - Acceptance: `server/server/` stray artifact removed; `LLM_KEEP_ALIVE` default is `0`
    everywhere (spec §3) — `ai.config.ts` fallback and `.env.example` currently say `300`,
    while Compose and `OPERATIONS.md` already say `0`; `tasks/todo.md` reflects Phase 3/4
    as done.
  - Verification: `git status` shows no stray files; `grep -rn "300" server/src/config/ai.config.ts .env.example` returns nothing for `LLM_KEEP_ALIVE`; server build.
  - Dependencies: None.
  - Files: `server/server/` (delete), `server/src/config/ai.config.ts`, `.env.example`, `tasks/todo.md`.
  - Estimated scope: XS.
- [ ] Task 12: Container resource limits for the Ollama service.
  - Acceptance: the shared `ollama` service in `docker-compose.yml` declares `mem_limit`
    and `cpus`, matching spec §16 ("container memory/CPU limits where supported") and the
    2 CPU / 4 GB VPS constraint; values are env-overridable with safe defaults.
  - Verification: `docker compose config` renders the limits; no change to healthcheck behavior.
  - Dependencies: None.
  - Files: `docker-compose.yml`, `.env.example`.
  - Estimated scope: XS.
- [ ] Task 13: Deterministic reply-language enforcement.
  - Acceptance: `OllamaLlmClient.generateDraft` treats a `replyLanguage` that disagrees with
    the detected `classification.language` (when both are known) as invalid output — it
    triggers the existing one-shot repair retry, then fails the draft (routed to
    `failed`/manual review) rather than persisting a mismatched-language draft. This
    replaces relying on prompt wording alone for the "always reply in the sender's
    language" requirement.
  - Verification: new `ollama.client.test.ts` cases for matching/mismatching language,
    repair-then-succeed, and repair-then-still-mismatched → throws.
  - Dependencies: None.
  - Files: `server/src/modules/ai-email-assistant/ollama.client.ts`, its test.
  - Estimated scope: S.
- [ ] Task 14: Phase 2B real PDF/DOCX extraction.
  - Acceptance: `.pdf` files extract text via `pdf-parse`, `.docx` via `mammoth`; empty or
    near-empty extraction still reports `extraction_required` (never silently indexed);
    existing MIME/signature/size checks are unchanged; no new dependency pulls in a native
    binary requiring build tooling beyond what's already available in the Docker image.
  - Verification: file-ingestion tests cover a real extractable PDF/DOCX fixture, an
    empty/image-only PDF fixture (still reports `extraction_required`), and unchanged
    `.txt/.md/.html` behavior.
  - Dependencies: None.
  - Files: `server/src/modules/knowledge-ingestion/file-ingestion.service.ts` and test,
    `server/package.json`.
  - Estimated scope: S.
  - Implementation note: `pdf-parse@1.1.1` (the pure-JS, no-native-deps release) was tried
    first, but its vendored pdf.js v1.10.100 reproducibly threw `bad XRef entry` on a
    buffer returned by `fs.readFile` (works fine on a `Buffer.concat` result — a real bug
    in that ancient bundled parser, not a test artifact). Switched to `pdf-parse@2.4.5`
    (`PDFParse` class over `pdfjs-dist`), which parses `readFile` buffers correctly.
    Its `dependencies` include `@napi-rs/canvas` (prebuilt native binary, only used by the
    unused `getImage`/`getScreenshot` APIs — plain `getText()` never touches it); the prod
    Dockerfile already has `python3 make g++` for `argon2`, so a missing prebuild would at
    worst fall back to that, not break the image. `pdfjs-dist`'s own `.d.ts` also referenced
    a DOM lib type (`ImageDataArray`) newer than this repo's implicit `lib` setting, which
    required adding `"skipLibCheck": true` to `server/tsconfig.json` — this only skips
    type-checking `.d.ts` files (ours and third-party), not application code.
- [ ] Task 15: Phase 5 approved-only SMTP delivery and audit.
  - Acceptance: a new opt-in cron (`AI_EMAIL_SEND_ENABLED`, default `false`, mirroring the
    classification/draft flags) claims `APPROVED` drafts one at a time
    (`AI_MAX_CONCURRENCY`-bounded), atomically transitions `APPROVED -> SENDING` guarded by
    `(id, version, status)` so a retry or duplicate cron tick cannot double-claim; sends via
    the existing `replyToMessage` SMTP path (reusing original thread headers/mailbox,
    spec §13) keyed off `AiEmailMessage.sourceEmailMessageId`; on success transitions
    `SENDING -> SENT` and records the outbound `EmailMessage` id and timestamp; on failure
    transitions to `FAILED` with the error recorded — never re-attempts automatically (an
    operator must re-approve), so retries cannot duplicate outbound mail.
  - Verification: new unit tests for the claim/skip/success/failure transitions with an
    in-memory fake repository and fake SMTP sender (no live SMTP in CI); server build;
    `npm run test:ci` unaffected.
  - Dependencies: None (independent of Tasks 11-14).
  - Files: `server/prisma/schema/ai-email.prisma` (+ new migration), new
    `server/src/modules/ai-email-assistant/send-pipeline.service.ts`,
    `send.persistence.ts`, `send-pipeline.cron.service.ts`, `index.ts` wiring,
    `server/src/index.ts`, `.env.example`, Compose files, `docs/spec/DDC_LOCAL_AI_EMAIL_ASSISTANT_OPERATIONS.md`.
  - Estimated scope: M.
  - Status: Done. `AiEmailDraftStatus` gained `SENDING`/`FAILED`; `AiEmailDraft` gained
    `sendIdempotencyKey` (unique), `sendAttempts`, `sentEmailMessageId`, `sentAt`, `sendError`
    (migration `20260916100000_add_ai_email_send_state`, hand-written — no live DB available
    in this environment to run `prisma migrate dev`; review the SQL against a real DB before
    deploying). New `AI_EMAIL_SEND_ENABLED` flag (default `false`) gates a 5-minute cron
    mirroring the classification/draft crons. Reuses
    `communication/email/email-smtp.service.ts`'s `replyToMessage` (same pattern already used
    by `telegram-notification.service.ts` reaching into `communication/telegram`) so thread
    headers/mailbox continuity come for free. 6 new unit tests in
    `send-pipeline.service.test.ts` cover claim/skip/success/failure with fakes (no live SMTP).
    Also found and fixed: `server/package.json`'s `test:local-ai` script (which `test:ci` runs)
    was missing `email-assistant.persistence/service/worker.test.ts` and
    `ollama.client.test.ts` entirely — those tests existed but never ran in CI. Fixed and
    documented in `AGENTS.md`.
- [ ] Task 16: Document the Phase 0 benchmark gap (cannot be closed from this environment).
  - Acceptance: `OPERATIONS.md`/`tasks/todo.md` clearly state that RAM/CPU/latency numbers
    from `scripts/benchmark-ollama*.sh` have not yet been captured against the real 2 CPU /
    4 GB target and must be run by an operator with access to that host before enabling any
    `AI_EMAIL_*_ENABLED`/`KNOWLEDGE_SYNC_ENABLED` flag in production. No fabricated numbers.
  - Verification: doc review only.
  - Dependencies: None.
  - Files: `docs/spec/DDC_LOCAL_AI_EMAIL_ASSISTANT_OPERATIONS.md`, `tasks/todo.md`.
  - Estimated scope: XS.

## Verification Plan

- Phase 0: focused Node test, `npm --prefix server run build`, and relevant documentation-link
  check; no live Ollama dependency in normal CI.
- Later phases: domain tests, integration tests, and root `npm run ci` before publishing.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Ollama is not currently deployed | Medium | Keep URL/model configurable and benchmark opt-in; defer service deployment until measured. |
| Limited VPS memory/CPU | High | Defaults enforce 2048 context, keep-alive 0, concurrency 1; benchmark captures runtime cost. |
| Secrets or email data leak into diagnostics | High | Benchmark records metadata/latency only and never sends email content or credentials. |
| Future code bypasses the LLM boundary | High | Introduce a dedicated configuration boundary before provider/workflow phases. |

- [x] Task 17: Fix real crawler correctness against talentcenterddc.nl and rebuild the knowledge base.
  - Found live, against the real site + dev MySQL/Ollama: (1) language was hardcoded `'nl'`
    everywhere (WP REST API exposes no `lang` field on this site); (2) no filtering excluded
    `/nl/`, `/en/`, `/uk/` translation duplicates, so every page was indexed 4x; (3)
    `SitemapKnowledgeSource`'s `<loc>` regex silently matched zero URLs against this site's
    AIOSEO sitemaps because they wrap every `<loc>` in `CDATA`; (4) it also never recursed into
    a `<sitemapindex>`, so the per-post-type sub-sitemaps (styles, choreographer, schedule) were
    never reached — those are custom post types with **no WordPress REST route at all**
    (`/wp-json/wp/v2/styles` → 404), so `WordPressKnowledgeSource` (the prior primary discovery
    strategy) could never see them regardless; (5) WooCommerce cart/shop/my-account and thin
    category/tag archives were being indexed as knowledge.
  - Fix: added `detectKnowledgeLanguage()` (URL path-prefix → language, falling back to a new
    `KnowledgePolicy.canonicalLanguage`, configurable via `KNOWLEDGE_CANONICAL_LANGUAGE`, default
    `nl` per spec — set to `ru` for this deployment since the site's un-prefixed pages are
    Russian, confirmed via `hreflang="ru"`/`x-default` and `<html lang="ru-RU">`); wired it into
    both sources; `isAllowedKnowledgeUrl` now excludes any non-canonical-language-prefixed path
    and adds `cart`/`shop`/`my-account`/`category`/`tag` to the existing exclude list; rewrote
    `SitemapKnowledgeSource` to parse both plain and CDATA-wrapped `<loc>`, recurse into a
    `<sitemapindex>` (bounded depth 2), and de-duplicate URLs found in more than one sub-sitemap;
    flipped `scripts/knowledge-sync.ts` to try sitemap first (complete) with WordPress REST as
    fallback (previously the reverse).
  - Verified live: cleared `knowledge_documents`/`knowledge_chunks` (was 95 docs/543 chunks,
    mixed `bge-m3`/`all-minilm` embeddings, ~56 docs were an unrelated file corpus from earlier
    `knowledge:import` testing) and re-ran `knowledge:sync` against the real site — 23 documents,
    94 chunks, 0 failures, all `language=ru`, all `bge-m3` (1024-dim, single model). Discovery
    now includes all 6 individual style pages and the choreographer page that were previously
    invisible. Retrieval re-tested with real queries: style-specific queries now correctly
    surface `/styles/hip-hop/`, `/styles/contemporary/`, etc. as top results; no more duplicate
    same-page-different-language results in top-K.
  - Also fixed: local `.env` had `OLLAMA_EMBEDDING_MODEL=locusai/all-minilm-l6-v2` (not the spec
    default `bge-m3`) — root cause of the mixed-embedding-model chunks found in the pre-rebuild
    DB; changed to `bge-m3`. Added `KNOWLEDGE_CANONICAL_LANGUAGE` to `.env`, `.env.example`, and
    both Compose files.
  - Known remaining content-quality caveats (not fixed, documented in OPERATIONS.md): `/agreement/`
    embeds other-language text directly in its HTML via a client-side widget (not gated by URL
    prefix); `/schedule/<branch>/` pages render their real timetable client-side, so the raw HTML
    fetch mostly captures template boilerplate instead of schedule data. Both would need JS
    rendering or a structured data source to fix properly — out of scope for this task.
  - Verification: 3 new/updated test files (`knowledge-ingestion.service.test.ts` — 11 tests,
    covering `detectKnowledgeLanguage`, non-canonical-language exclusion, CDATA parsing,
    sitemap-index recursion, cross-sub-sitemap dedup); `npm run test:local-ai` (59/59) and
    `npx tsc --noEmit` both clean.
  - Files: `server/src/modules/knowledge-ingestion/knowledge-ingestion.service.ts` (+test),
    `server/src/modules/knowledge-ingestion/index.ts`, `server/scripts/knowledge-sync.ts`,
    `.env`, `.env.example`, `docker-compose.dev.yml`, `docker-compose.prod.yml`,
    `docs/spec/DDC_LOCAL_AI_EMAIL_ASSISTANT_OPERATIONS.md`.

- [x] Task 18: `needsReply` classification fix.
  - `classificationPrompt` in `ollama.client.ts` gave the model a field name (`needsReply:
    boolean`) with zero semantic guidance. Live-reproduced on a real customer email sent through
    the site's own contact form during this session (`ai_email_messages.id=59`, sender
    denis.mirgoyazov@gmail.com via the WordPress contact-form notification path): `needsReply`
    came back `false` on both `qwen3:0.6b` (9/9 synthetic runs) and initially on `qwen3:1.7b` for
    this specific real email, despite an explicit question about styles/schedule.
  - Fix: added one line — "A reply is needed whenever the sender asks a question, requests
    information, pricing, scheduling, or action from staff — even implicitly. It is NOT needed
    only for confirmations, auto-replies, or messages requiring no response." Re-verified live:
    `needsReply:true` consistently afterward on the same real email and on the earlier synthetic
    trial-lesson sample (2/2, 3/3).
  - Verification: new regression test in `ollama.client.test.ts` asserting the prompt contains
    this guidance (can't assert live-LLM determinism in a unit test, but the wording is now
    pinned against silent removal); `npm run test:local-ai` (60/60), `tsc --noEmit` clean.
  - Files: `server/src/modules/ai-email-assistant/ollama.client.ts` (+test).
- [x] Task 19: Draft-generation JSON-format reliability fix.
  - Even with `needsReply` fixed, live drafting for the same real email failed schema validation
    5/5 times on `qwen3:1.7b` — the model consistently answered in well-formatted Markdown prose
    (headers, bold text) instead of the required raw JSON object, ignoring the explicit "raw JSON
    only" prompt instruction, and the existing one-shot repair retry did not recover (the model
    repeated the same style). This did not happen for the shorter classification prompt.
  - Fix: added Ollama's native `format: "json"` constrained-decoding parameter to both the
    classification and draft `/api/generate` requests — this is Ollama's own grammar-constrained
    JSON mode, not a prompt-wording workaround, and directly prevents markdown/prose output
    regardless of prompt phrasing. Confirmed via a standalone `curl` test before wiring it in.
  - Verified end-to-end, live, for real: with `AI_EMAIL_CLASSIFICATION_ENABLED=true` and
    `AI_EMAIL_DRAFT_ENABLED=true` already set in this dev `.env`, the actual running
    `hhdc-backend-dev` container (bind-mounted source, picks up edits without a rebuild) itself
    reclassified and drafted email id=59 on its own 5-minute cron tick (`[AiEmailDraft]
    processed=1, skipped=0, failed=0` in its logs) and sent the real Telegram approval
    notification via `notifyDraftForApproval` — not a script simulation.
  - Files: `server/src/modules/ai-email-assistant/ollama.client.ts`.

- [x] Task 20: Knowledge normalizer/chunking fixes (found while diagnosing why the real draft for
  email id=59 just paraphrased the customer's own question instead of answering it).
  - `normalizeKnowledgeHtml`'s `<li>`/`<p>` regexes were unanchored (`/<li[^>]*>/`,
    `/<\/?p[^>]*>/`), so "li" also matched "link" and "p" also matched "path"/"picture"/"pre".
    Every `<link>` tag in a WordPress page's `<head>` (favicons, canonical, hreflang alternates —
    15-30 per page) became a content-free "- " bullet. Confirmed live against
    talentcenterddc.nl/contact/: ~15 bullet lines of pure noise before any real content. Fixed
    with a lookahead anchor (`<li(?=[\s>/])`, `<\/?p(?=[\s>/])`).
  - Separately, `chunkKnowledgeDocument`'s default `maxCharacters` (1200) combined with `ragTopK`
    (4) produced a ~7100-character draft prompt against a 2048-token `num_ctx` — confirmed live
    that qwen3:1.7b returns an empty `{}` for an over-budget prompt regardless of `num_ctx` used
    at *inference* time if the training/serving default truncation still applies unpredictably;
    reduced the default to 500 so 4 chunks stay within budget alongside the rest of the prompt.
  - The user asked directly whether chunking accounts for overlap between consecutive chunks — it
    did not. Added a `overlapCharacters` parameter (default 250, approximating a 100-token
    minimum for Cyrillic text at this codebase's character-based budgeting) that stitches the
    trailing slice of each chunk onto the next one, so a fact landing on a chunk boundary isn't
    invisible to whichever half retrieval doesn't return.
  - Verification: 5 new/updated tests in `knowledge-ingestion.service.test.ts` and
    `embedding.service.test.ts`; full `test:local-ai` and `tsc --noEmit` clean after each change;
    knowledge base rebuilt twice more against the real site to verify live.
  - Files: `server/src/modules/knowledge-ingestion/knowledge-ingestion.service.ts` (+test),
    `server/src/modules/knowledge-ingestion/embedding.service.ts` (+test).
- [ ] Task 21: Draft-generation reliability with `qwen3:1.7b` — **still open, not resolved**.
  - Tried `format: "json"` (Ollama's grammar-constrained JSON mode) for drafting: this reliably
    returned an **empty `{}`** for the real, knowledge-grounded prompt (confirmed at `num_ctx`
    2048, 4096, and 8192, and at temperature 0 and 0.2 — ruling out context truncation and
    sampling noise as the sole cause). Reverted `format: "json"` for `generateDraft` specifically
    (kept for `classifyEmail`, where it works reliably) and increased the repair-retry budget
    from 1 to 2 (3 attempts total).
  - Final live test after all Task 20 fixes (clean knowledge, no format:json, 3 attempts): **1/3
    real end-to-end runs against the real email succeeded**; 2/3 still returned markdown/prose
    that failed schema validation after all 3 attempts. The one success was schema-valid and
    correctly flagged `needsManualAnswer: true`, but its content was vague/lightly hallucinated
    ("среди стилей: грация, красота, пластика" — marketing-copy phrases, not the actual style
    names from FAQ/styles pages) rather than precisely grounded in the retrieved knowledge.
  - This is an unresolved model-capability question, not a prompt-wording bug: `qwen3:1.7b`
    reliably handles the short classification task but is inconsistent at the compound task
    (strict JSON schema + RAG grounding + tone/length instructions) needed for drafting. Spec
    section 20's Phase 0 gate ("quality is acceptable for assisted drafting") is not yet met.
  - Options going forward (not decided): (a) accept the current failure rate — a failed draft
    just stays `FAILED`/unset rather than sending anything, so the safety property holds, it's
    only availability that suffers; (b) try `qwen3:4b` (already pulled locally) or another larger
    model and re-benchmark against the 2 CPU / 4 GB resource ceiling (still blocked on the Phase 0
    benchmark from Task 16, never run against real hardware); (c) more structural prompt work
    (few-shot example of the exact JSON, or splitting drafting into two calls: free-text answer
    then a second small JSON-formatting-only pass).

- [x] Task 22: Draft generation redesigned to a body-only call — resolves Task 21, no larger model
  needed. User's direction: cannot deploy a bigger model on this server, must optimize for the
  small one already running.
  - Root design change: only the reply **body** is generated by the LLM now. Every other
    `EmailDraft` field (`replyLanguage`, `subject`, `usedKnowledgeIds`, `confidence`,
    `needsManualAnswer`) is computed deterministically in `ollama.client.ts` from data the
    pipeline already has — `replyLanguage` from the classification just run,
    `usedKnowledgeIds` from the chunks retrieval already selected, `subject` via the existing
    `buildReplySubject` helper (reused from `communication/email/email-smtp.service.ts`),
    `confidence`/`needsManualAnswer` from the top retrieval score (`CONFIDENT_KNOWLEDGE_SCORE =
    0.55`; below that or with no knowledge at all, `needsManualAnswer` is forced `true`). This
    removes an entire failure class: the model no longer needs to correctly emit a JSON object
    with 6 fields matching a schema, it only needs to write a paragraph.
  - Discovered live while investigating: Ollama's API already separates reasoning from the final
    answer (`thinking` field vs. `response` field) — reasoning tokens were never leaking into our
    parsed output, ruling that out as a cause. But the reasoning phase itself was expensive
    (hundreds of tokens for a trivial question) and, for THIS drafting task specifically, harmful:
    with thinking enabled the model would "creatively" mistranslate exact facts pulled from
    KNOWLEDGE (e.g. invented "Фанк-живопись" for the style name "Jazz Funk"); with `think: false`
    it copied the same facts verbatim, correctly, and 3-5x faster. Passed `think: false` for
    `generateDraft` only.
  - Tried disabling thinking for `classifyEmail` too (in the spirit of "minimize cost") — this was
    a regression: live-tested 3/3, classification consistently misreported an unambiguously
    Russian email body as `language: "en"` without thinking, but got it right with thinking on.
    Reverted — `classifyEmail` keeps the reasoning phase and `format: "json"` (both already
    working reliably there); only `generateDraft` disables thinking and drops `format: "json"`
    (which, per Task 19/21, actively broke drafting by returning an empty `{}` for this longer,
    knowledge-grounded prompt).
  - Verified live via the real `generateEmailDraft` production function (not a standalone script)
    against the real email id=59, 5 consecutive runs: **5/5 succeeded**, 1.3-2.7s each (vs. the
    prior ~1/3 success rate at 10-15s+ per attempt with thinking on). Content stayed grounded in
    retrieved knowledge (specific age ranges, "занятия по принципу от простого к сложному",
    correct style-name handling) without the price/free hallucination seen in earlier tests with
    this exact email — not guaranteed to never recur, but meaningfully more reliable.
  - Verification: rewrote the draft-related `ollama.client.test.ts` tests (language-mismatch
    retry tests no longer apply — `replyLanguage` can't mismatch by construction now) — new tests
    assert body-only prompting, `think: false`, deterministic field population independent of
    model output, and score-derived `confidence`/`needsManualAnswer`. Full `test:local-ai`
    (64/64) and `tsc --noEmit` clean.
  - Files: `server/src/modules/ai-email-assistant/ollama.client.ts` (+test).

## Open Questions

- Which Ollama host placement is appropriate? `bge-m3` is the V1 embedding default; operator-run
  latency and cross-language retrieval measurements remain a deployment gate.
- Content-accuracy hallucination risk remains even with format reliability solved (Task 22) — the
  model has been observed inventing a "free trial" claim not present in KNOWLEDGE despite an
  explicit instruction not to. Every draft still requires human Telegram approval before send, so
  this cannot reach a customer unreviewed, but reviewers should know to specifically check
  price/availability claims.

- [x] Task 23: Telegram inbound delivery — no webhook registered, fixed with local-dev polling.
  - The user tapped Edit in Telegram, nothing happened, then sent `/edit 12 1 <text>` — no
    response, no DB change (`ai_email_drafts` status stayed `GENERATED`, no row in
    `ai_email_approvals`). Diagnosed with `GET https://api.telegram.org/bot<token>/getWebhookInfo`:
    `"url": ""` — Telegram had never been told where to deliver updates, so nothing the user did
    in the chat could reach the server, independent of any application code (including the
    genuine Edit-response bug fixed earlier this session, which could only matter once an update
    actually arrives). `getUpdates` also returned 0 pending — Telegram does not retain
    undelivered updates indefinitely, so the user's original tap and message are not recoverable
    and had to be redone once polling was live.
  - Offered a temporary `ngrok` tunnel to register a real webhook; the user explicitly declined
    ("не надо делать туннель и нгрок") and asked for a way to do it without exposing anything
    publicly, then declined running the tunnel manually too.
  - Implemented `getUpdates` long polling as a full alternative: the server pulls updates from
    Telegram every request (no inbound HTTP path, nothing to expose). Refactored
    `telegram-approval.controller.ts` to extract a transport-agnostic `handleTelegramApprovalUpdate`
    core (previously the logic lived directly in the Express handler) so the webhook route and the
    new polling loop share one implementation instead of two that could drift. New
    `telegram-approval.polling.service.ts`: `fetchTelegramUpdates` (one long-poll call, 25s
    timeout), `pollTelegramApprovalUpdatesOnce` (processes a batch, advances the offset past a
    failing update too — so one poison update can't wedge the loop forever), and
    `startTelegramApprovalPolling` (opt-in via `TELEGRAM_POLLING_ENABLED`, off by default since
    production is expected to use a real webhook on a real domain).
  - Enabled for this session's dev environment (`.env`), recreated the `hhdc-backend-dev`
    container so it picked up the new env var, confirmed live in its logs:
    `[TelegramPolling] started (local-dev alternative to the webhook)`.
  - Verification: 6 new tests in `telegram-approval.polling.service.test.ts` (long-poll request
    shape, offset handling, error propagation, and — via mocking `handleTelegramApprovalUpdate`
    through the shared CommonJS module object, the same technique this codebase already uses for
    `axios.post` — that one failing update doesn't stop the batch or get retried forever). Wired
    into `test:local-ai` (was missed on the first pass — caught by rerunning the suite and noticing
    the count didn't include the new file). 72/72, `tsc --noEmit` clean.
  - Files: `server/src/modules/ai-email-assistant/telegram-approval.controller.ts` (+test),
    new `telegram-approval.polling.service.ts` (+test), `index.ts`, `server/src/index.ts`,
    `.env`, `.env.example`, both Compose files.
  - Follow-up (same session, still Task 23): recreating the backend container to pick up
    `TELEGRAM_POLLING_ENABLED=true` also recreated `hhdc-ollama` (both defined in the same
    `docker compose up` invocation), and polling immediately started failing with `HTTP 409` from
    `getUpdates` — Telegram's documented "Conflict: terminated by other getUpdates request"
    response for two concurrent long-polls on one token. Traced to
    `~/.claude/channels/telegram/.env` (this Claude Code session's own Telegram channel) using the
    **same bot token** as this project's `.env` (compared safely — lengths/hash-style equality
    check, never printed either secret). Set `TELEGRAM_POLLING_ENABLED=false` and recreated the
    backend again to stop the conflict and stop competing with the user's own Claude channel.
    Resolution needs a second, dedicated bot token for DDC (via @BotFather) before polling can be
    re-enabled — not something to fix by touching the other process, which isn't this project's.
  - Files: `server/src/modules/ai-email-assistant/telegram-approval.controller.ts` (+test),
    new `telegram-approval.polling.service.ts` (+test), `index.ts`, `server/src/index.ts`,
    `.env`, `.env.example`, both Compose files.
  - Open: a dedicated Telegram bot token for DDC (separate from this Claude Code session's own
    channel) is needed before `TELEGRAM_POLLING_ENABLED` can go back to `true`. The user's
    original Edit tap and `/edit` message are unrecoverable either way (Telegram doesn't retain
    undelivered updates) and will need to be redone once a working delivery path exists.

- [x] Task 24: Removed `format: "json"` from `classifyEmail` too.
  - Found while first live-testing Task 25's new CLI tool: classification — previously reliable
    with `format: "json"` (Task 19) — started reproducibly returning an empty `{}` (schema
    validation: every field `undefined`), for both a brand-new short synthetic email AND the same
    real customer email that had classified correctly earlier in this session. Verified via direct
    `curl` against the raw Ollama API: the identical prompt returned `{}` 4/4 times with
    `format: "json"` and correct, schema-valid JSON on the first try when `format: "json"` was
    dropped (4/4 correct, including right `language`/`needsReply`) — isolating the parameter, not
    prompt content, resource limits, or model state, as the variable that mattered. (Ruled out
    Docker resource limits specifically: the container that was actually reachable at
    `127.0.0.1:11434` for all of this session's testing is the native macOS `ollama serve`
    process, not the Compose-managed `hhdc-ollama` container that the earlier `mem_limit`
    change applies to — confirmed via `docker stats`/`ollama ps` before ruling it out.)
  - Fix: dropped `format: "json"` from `classifyEmail`'s request, matching what `generateDraft`
    already does (Task 22) — plain generation, schema validation, one repair retry. Does not
    achieve 100% reliability (a live rerun of the real client showed 3/4), but that residual
    failure rate was already an accepted, designed-for outcome for drafting (a failed
    classification/draft is marked `FAILED` for manual review, never guessed) — this just extends
    the same tradeoff to classification instead of leaving it exposed to a *worse*, undiscovered
    failure mode.
  - Files: `server/src/modules/ai-email-assistant/ollama.client.ts`.

- [x] Task 25: `npm run ai:test-flow` — local CLI for the pipeline.
  - The whole session up to this point exercised the pipeline through one-off throwaway scripts
    deleted after each use; the user asked for a permanent, reusable CLI instead. Runs one
    hand-written subject/body through normalize → deterministic spam check → classify → RAG
    retrieve → draft using the real production functions for every stage. Read-only: no writes to
    `ai_email_messages`/`ai_email_drafts`, no Telegram notification, only real (read-only) CRM
    contact lookup and knowledge retrieval.
  - Flags: `--from`, `--subject` (required), `--body`/`--body-file`/stdin for the body, `--top-k`
    to override `RAG_TOP_K` for one run, `--no-knowledge` to skip retrieval (classification-only
    testing), `--force-draft` to see what the model would write even when classification says
    spam/no-reply-needed, `--json` for a single machine-readable object instead of the
    stage-by-stage human-readable output.
  - Hit a pre-existing circular-import landmine on the first run: importing from the
    `ai-email-assistant` barrel (`index.ts`) as the *first* thing a fresh entry point does pulls in
    `send.persistence.ts` → `communication/email/email-smtp.service.ts` →
    `communication/email/email-imap.service.ts`, which itself imports back from the same barrel —
    a cycle that happens to resolve fine in the real app's own import order but leaves
    `createPrismaAiEmailRepository` (and friends) `undefined` when entered this way. Fixed by
    importing the specific submodules the script actually needs
    (`email-assistant.service`, `ollama.client`, `crm-context.service`, `draft.service`) instead
    of the barrel — sidesteps the cycle entirely and only pulls in what a classification/drafting
    test actually needs (not the unrelated SMTP-sending machinery).
  - Verified live end-to-end multiple times, including `--json`, `--no-knowledge`, and
    `--force-draft`; all behaved as designed.
  - Files: new `server/scripts/test-email-flow.ts`, `server/package.json` (`ai:test-flow` script),
    `docs/spec/DDC_LOCAL_AI_EMAIL_ASSISTANT_OPERATIONS.md`.

- [x] Task 26: Two fixes surfaced directly by using `ai:test-flow` as a real user.
  - `ai:test-flow` (without the env wrapper) failed with a confusing Prisma/`DATABASE_URL` error
    when run without first manually sourcing and overriding the environment — the user hit this
    twice. Rather than rely on remembering a separate `:local` variant, swapped the names: plain
    `ai:test-flow` is now the host-env-aware wrapper (`scripts/run-local.sh`) by default, and the
    wrapper now echoes its resolved `OLLAMA_URL`/`OLLAMA_MODEL`/`DATABASE_URL` (password masked)
    to stderr on every run so a misconfiguration is visible immediately. The pre-wrapper behavior
    is still available as `ai:test-flow:raw` for use inside the backend container, where the
    environment is already correct.
  - Live classification failure the user hit through the CLI: valid `spam`/`needsReply`/
    `language`/`intent`/`confidence`, but `reason` missing — `emailClassificationSchema` was
    `.strict()` and required all six fields, so losing the one field nothing branches on (spec
    section 8: "`reason` ... must not be treated as hidden reasoning") discarded an otherwise
    correct classification and burned the repair retry. Made `reason` optional with an empty-string
    default; every field that actually drives control flow stays required. New tests for both the
    accept-without-reason and still-reject-without-a-real-field cases.
  - Files: `server/scripts/run-local.sh`, `server/package.json`,
    `server/src/modules/ai-email-assistant/email-assistant.service.ts` (+test).

- [x] Task 27: Draft prompt rewritten in Russian with an explicit persona and tone.
  - User's direct request: identify where the "system prompt" lives (answer: there isn't a
    separate system role — `/api/generate` takes one flat prompt string; the closest equivalent is
    the instruction lines at the top of `draftBodyPrompt`/`classificationPrompt` in
    `ollama.client.ts`) and give the customer-facing drafting call a persona: "a dance school's
    consultant assistant", in Russian, with a defined tone.
  - Scope decision (stated to the user, not silently assumed): only `draftBodyPrompt` — the
    customer-facing text — was rewritten. `classificationPrompt` stays in English and untouched
    for now: it produces internal structured data, not customer-facing prose, and its reliability
    was only just stabilized (Task 24); re-testing a full-language change there wasn't warranted
    unless asked for separately.
  - First pass (persona line + abstract tone adjectives — "доброжелательный, тёплый и
    профессиональный") measurably improved nothing structurally but the tone still read flat/
    encyclopedic live ("У нас есть программы для детей..." with no greeting or acknowledgment of
    what the customer actually wrote). Small models respond better to concrete, checkable
    instructions than adjectives, so added one: open with a short greeting and reference something
    specific from the customer's email. Verified live, 3/3: every run opened with
    "Здравствуйте!"/"Привет!" and referenced the customer's stated age/experience before answering.
  - `replyLanguage` selection (`LANGUAGE_NAMES_RU`, e.g. "на английском языке") stayed independent
    of the prompt's own language — a Russian-language instruction set asking for a Dutch/English/
    Ukrainian reply was not separately re-verified beyond the existing `replyLanguage` pass-through
    guarantee (Task 22 made it deterministic, not model-reported, so it cannot drift regardless of
    prompt language).
  - Files: `server/src/modules/ai-email-assistant/ollama.client.ts` (+test).

- [x] Task 28: Removed an age assumption the user caught in Task 27's own prompt, and a verbatim-copy
  regression found while verifying the fix.
  - The user pointed out that the greeting/acknowledgment instruction added in Task 27 literally
    said "если он упомянул возраст ребёнка" (if they mentioned the CHILD's age) — hardcoding that
    any inquiry is about a child, when the studio serves all ages (kids, teens, adults) and levels.
    Reworded to be audience-neutral and added an explicit instruction not to default to "child"
    just because the retrieved KNOWLEDGE skews that way (the site's content is genuinely
    kids-heavy) — determine who the email is actually about strictly from the email itself.
  - Live-testing that fix on an adult-themed sample ("Мне 32 года, никогда не танцевала...")
    surfaced two more real issues: (1) the draft opened by copying the customer's email almost
    verbatim — a "never copy the email body" instruction existed in the pre-Task-22 JSON prompt
    but was dropped during that redesign, unnoticed until now; (2) even after the audience-bias
    fix, the model still echoed "ребёнка" because the actual retrieved KNOWLEDGE chunk phrased a
    fact that way (e.g. "адаптирует под уровень каждого ребёнка") and the prompt's own "copy facts
    verbatim" instruction (anti-hallucination) pulled directly against the audience-neutrality one.
  - Fixed both: an abstract "don't copy the email" instruction did nothing on its own (matches
    Task 27's earlier finding — small models need concrete examples, not adjectives/prohibitions);
    replaced with a concrete instruction to open with a one-sentence paraphrase demonstrating
    understanding, with worked examples for both an adult and a child case. Added a specific rule
    for the audience-word conflict: keep the underlying fact (price, trial availability, etc.)
    verbatim, but swap only the audience word itself ("ребёнок"/"взрослый") for a neutral one
    ("ученик"/"вы") when it doesn't match what the actual email says.
  - Verified live: 3/3 adult-themed runs opened with a paraphrase (not a copy), correctly surfaced
    the adult-specific "High Heels" content, and used "ученика" instead of "ребёнка"; re-ran the
    original child-themed sample once more to confirm that case is still handled correctly
    (unchanged: "детей 7–10 лет", accurate schedule/styles). 75/75, `tsc --noEmit` clean.
  - Files: `server/src/modules/ai-email-assistant/ollama.client.ts`.

## Confirmed

- Telegram approval delivery for the Task 19 live test was confirmed by the user via a screenshot
  of the actual Telegram message (draft `11:1`, full formatted notification with Approve/Edit/
  Reject/Spam buttons) — the end-to-end classify → draft → Telegram-notify path genuinely works.

## Knowledge Base Admin Page (2026-09-22)

User request: study the standalone `rag/` reference project (hybrid RAG: query expansion, BM25,
RRF, reranker, upload UI, MCP server) and pull in what's worth integrating, plus add a dedicated
admin page for managing the knowledge base manually — file upload, a URL field for one-off page
crawling, a "run embedding" action, a category per document, and LLM-facing metadata (priority,
tags). Decisions made with the user (brainstorming session): admin page ships first; the
BM25/RRF/reranker pipeline upgrade is deliberately deferred to a separate future task since it's a
backend-only change independent of this UI. Category is a fixed enum mirroring the
`server/knowledge/ddc-knowledge/` folder taxonomy already in use. Metadata fields: priority
(weight) + free-form tags — audience/language and expiry were considered but not requested.
"Insert a link" was clarified by the user to mean a URL to crawl for content, not a reranker
endpoint setting.

Key existing-code findings that shape this section's tasks:
- `KnowledgeRetrievalService` (`server/src/modules/knowledge-ingestion/retrieval.service.ts`) is
  vector-only cosine similarity today — untouched by this section.
- `MysqlKnowledgeRepository.persistDocument` always embeds and writes chunks in one step, setting
  `status: 'ACTIVE'` unconditionally — there is no "staged, not yet embedded" state, which the
  user's explicit "run embedding" button requires.
- `KnowledgeDocument`/`KnowledgeChunk` (`server/prisma/schema/knowledge.prisma`) have no
  category/priority/tags columns today.
- There is currently no HTTP route at all for knowledge management — everything runs through the
  WordPress/sitemap cron (`sync.service.ts`) or the AI email assistant's internal use of
  `KnowledgeRetrievalService`. This section adds the first admin-facing API and UI for it.
- `isAllowedKnowledgeUrl` (`knowledge-ingestion.service.ts`) enforces a domain allowlist for the
  existing WordPress/sitemap sources — too restrictive for an admin pasting an arbitrary URL, and
  it does not guard against SSRF (private/loopback/link-local targets), which a new manual-crawl
  endpoint needs independently.

- [x] Task 29: Knowledge document category/priority/tags + a "staged, not yet embedded" status.
  - Acceptance: `KnowledgeDocumentStatus` gains `PENDING` (content stored, no chunks yet);
    `KnowledgeDocument` gains `category` (new `KnowledgeCategory` enum: `BRAND`, `LOCATIONS`,
    `DANCE_STYLES`, `CLASSES`, `SCHEDULE`, `REGISTRATION`, `FAQ`, `CAMP`, `BUSINESS_RULES`,
    `SOURCES`, `OTHER`), `priority` (`Int @default(0)`), `tags` (`Json`, string array); migration
    applied; `prisma:generate` run; existing WordPress/sitemap sync path unaffected (defaults
    `category = OTHER`, `priority = 0`, `tags = []` for documents it creates).
  - Verification: `cd server && npm run prisma:generate`; existing
    `knowledge-ingestion.service.test.ts`/`sync.service.test.ts` still pass unmodified.
  - Dependencies: None.
  - Files: `server/prisma/schema/knowledge.prisma` (+ migration).
  - Estimated scope: S.
- [x] Task 30: Manual ingestion staging — file upload and single-URL crawl, saved as `PENDING`.
  - Acceptance: `MysqlKnowledgeRepository` gains a `stageDocument` method that persists a
    `NormalizedKnowledgeDocument` + category/priority/tags with status `PENDING` and **no**
    chunks (no embedding call made). A new `crawlKnowledgeUrl(url, options)` function
    (`knowledge-ingestion.service.ts` or a sibling file) fetches a single page and normalizes it
    like `importKnowledgeFile` does for files, sourceType `'manual'`. New SSRF guard rejects
    non-`http(s)` protocols and resolves the hostname to reject loopback/private/link-local/
    multicast ranges (10.x, 172.16–31.x, 192.168.x, 127.x, 169.254.x, `::1`, `fc00::/7`,
    `fe80::/10`) before fetching — independent of `isAllowedKnowledgeUrl`'s domain allowlist,
    which does not apply to an admin-supplied arbitrary URL.
  - Verification: new unit tests for `stageDocument` (MySQL repository, mocked Prisma client) and
    the SSRF guard (rejects `http://127.0.0.1/`, `http://169.254.169.254/`, `file:///etc/passwd`,
    accepts a real public URL); reuse existing `importKnowledgeFile` tests unchanged.
  - Dependencies: Task 29.
  - Files: `server/src/modules/knowledge-ingestion/mysql-knowledge.repository.ts`,
    `knowledge-ingestion.service.ts` (+ new SSRF guard, own test file).
  - Estimated scope: M.
- [x] Task 31: Knowledge admin API — upload, crawl, list, edit metadata, run embedding, delete.
  - Acceptance: new `knowledge-ingestion.routes.ts` → `.controller.ts`, `requireRole('ADMIN')`,
    mounted at `/knowledge` in `server/src/routes/index.ts`:
    `POST /knowledge/documents/upload` (multipart, reuses `MAX_KNOWLEDGE_FILE_BYTES`/
    `SUPPORTED_KNOWLEDGE_EXTENSIONS`, deletes the temp file after extraction), `POST
    /knowledge/documents/crawl` (`{ url, category, priority, tags }`), `GET /knowledge/documents`
    (list with category/status filter + chunk count), `PATCH /knowledge/documents/:id` (category/
    priority/tags only), `DELETE /knowledge/documents/:id`, `POST
    /knowledge/documents/:id/embed` and `POST /knowledge/documents/embed` (bulk: all `PENDING`) —
    both chunk via `chunkKnowledgeDocument`, embed via `OllamaEmbeddingClient`, persist chunks,
    flip status to `ACTIVE`.
  - Verification: new `knowledge-ingestion.controller.test.ts` (node --test, mirrors
    `company.controller.test.ts` conventions) covering upload/crawl/embed/list/patch/delete +
    the ADMIN-only guard; `cd server && npm run build`.
  - Dependencies: Task 30.
  - Files: `server/src/modules/knowledge-ingestion/knowledge-ingestion.routes.ts` (new),
    `knowledge-ingestion.controller.ts` (new, + test), `server/src/routes/index.ts`.
  - Estimated scope: M.
- [x] Task 32: `KnowledgeBasePage` — upload/crawl forms, category/priority/tags, documents table.
  - Acceptance: new page at `client/src/pages/KnowledgeBasePage` (self-contained hooks pattern,
    matching `OrganizationBrandsPage` — no Redux slice, direct `$apiPrivate` calls): drag-and-drop
    or file-picker upload OR a URL field (mutually exclusive in one form), category `<select>`,
    priority input, tags chip-input; a table of documents (title, category, status badge,
    priority, tags, chunk count, last synced) with "Запустить эмбеддинг" (only on `PENDING`
    rows) and delete actions; dark theme via `-redesigned` tokens per
    `.claude/rules/code-style.md` rule 3 (status badges) and rule 5 (dark theme check). Wired into
    `AppRoutes`/`RoutePath` (`KNOWLEDGE_BASE` / `/knowledge-base`) and the ADMIN-only sidebar
    block in `getSidebarItems.ts` (next to "Почта"), reusing the `ContentHub` icon.
  - Verification: `npm run lint:ts` and `npm test` from `client/`; manual browser QA (upload a
    `.md` file, crawl a real URL, run embedding, confirm status transitions PENDING → ACTIVE,
    check dark theme).
  - Dependencies: Task 31.
  - Files: `client/src/pages/KnowledgeBasePage/*` (new), `client/src/app/providers/router/config/
    routeConfig.tsx`, `client/src/shared/config/routeConfig/routeConfig.tsx`,
    `client/src/widgets/Sidebar/model/selectors/getSidebarItems.ts`.
  - Estimated scope: M.
- [x] Task 33: Wire new server tests into the domain test script; full `npm run ci` green.
  - Acceptance: every new/changed server test file (Tasks 30/31) added to `test:local-ai` (and
    therefore `test:ci`) in `server/package.json`'s explicit file list — this project's domain
    scripts are hand-listed, not glob-based; nothing new introduced by this section slips out of
    `npm run ci`.
  - Verification: `cd server && npm run test:local-ai`; `npm run ci` from repo root.
  - Dependencies: Tasks 29–32.
  - Files: `server/package.json`.
  - Estimated scope: XS.

**Risks specific to this section:**

| Risk | Impact | Mitigation |
|------|--------|------------|
| Manual URL crawl becomes an SSRF vector (admin-supplied URL reaching internal services, e.g. the Docker-internal Ollama/MySQL hosts or cloud metadata endpoints) | High | Dedicated protocol + resolved-IP-range guard in Task 30, independent of the existing domain-allowlist guard; deny-by-default. |
| `stageDocument`/`persistDocument` divergence causes the two paths (auto sync vs. manual staging) to drift | Medium | Task 30 extends the existing repository class rather than forking a parallel one; both share `chunkKnowledgeDocument`/`OllamaEmbeddingClient`. |
| Uploaded file content is sensitive (student/client data mistakenly uploaded as "knowledge") | Medium | ADMIN-only route guard (Task 31); no change to existing `MAX_KNOWLEDGE_FILE_BYTES`/extension allowlist. |
| Prisma enum migration on a table already holding rows from the WordPress/sitemap sync | Low | `category`/`priority`/`tags` all ship with defaults (Task 29), so the migration backfills existing rows without a data-migration script. |

**Open questions:** None outstanding — decomposition, category taxonomy, metadata fields, and the
"link" meaning were all confirmed with the user before this section was written.

**Delivered and live-verified.** Migration applied against the real local dev DB (`docker exec
hhdc-backend-dev` — `prisma migrate dev` couldn't create a shadow DB under this DB user's
privileges, so the SQL was generated via `prisma migrate diff --from-url ... --to-schema-datamodel`
and hand-added as a migration folder, then applied with `prisma migrate deploy`; the generated JSON
`tags` column needed an explicit `DEFAULT (JSON_ARRAY())` added by hand — Prisma's diff omitted a
default entirely, which would have failed against the 56 existing rows). `npm run typecheck`/
`test:local-ai` (97 tests) and full `npm run test:ci` (349 tests) green on server; full client
`npm test` (1011 tests) and `stylelint` green.

Full manual browser QA against the real dev stack (logged in as the seeded `test@test.com` ADMIN)
surfaced two real bugs that automated tests had missed, both fixed:
- **Path params containing `:`/`/` (e.g. a manual URL's document id, which embeds the crawled URL
  itself) broke the REST routes** — `/knowledge/documents/:id/embed` 404'd because the client built
  the URL with a raw, unencoded id. Fixed by `encodeURIComponent(id)` on the embed/delete calls
  (client); confirmed live against a real crawl of `https://example.com/` through to a real Ollama
  embedding call and `ACTIVE` status.
- **multer's default temp filename has no extension, but `importKnowledgeFile` picks its
  parser (pdf/docx/txt/md/html) from the extension of the path on disk, not `req.file.originalname`
  — every uploaded file was silently rejected as "unsupported file type".** Fixed by giving multer a
  `filename` function that preserves the original extension (`knowledge-ingestion.routes.ts`, same
  pattern as `company.routes.ts`'s brand-logo upload) and by passing `sourceId`/`title` from
  `req.file.originalname` explicitly in the controller — otherwise the document's displayed title
  and its dedup identity would have been the random temp filename instead of the uploaded file's
  real name. Confirmed live: uploaded a real `.md` file, saw the correct title, ran embedding, got a
  real chunk and `ACTIVE` status.

Also found while driving the browser: the automated `computer type` action does not reliably fire
React's controlled-input `onChange` in this app (login form and the new page's inputs both silently
kept their old/placeholder value after "type") — worked around with `form_input` for simple cases
and, when that also didn't trigger the login submit, by dispatching real `input`/`change` events via
the native value setter and calling `.click()` directly through `javascript_tool`. Not a bug in this
feature; noting it here in case a future browser-QA session hits the same wall.

Both test knowledge-base rows created during this QA session (`test-knowledge.md`,
`https://example.com/`) were deleted afterward — the real ~56-document knowledge base (from the
existing WordPress/sitemap sync) was left untouched.

## Email Assistant Simulation Panel (2026-09-22, same day)

User's direct follow-up request: add a way to simulate a request (subject + body) and see what
the model answers, on the same `KnowledgeBasePage`. This already existed as a local-only CLI
(`npm run ai:test-flow`, Task 25) — normalize → deterministic spam check → LLM classify → RAG
retrieve → draft, read-only against CRM/knowledge, nothing persisted, no Telegram notification.
Classified as a **bounded** change (brainstorming skill): the flow already exists in this repo,
this only exposes it over HTTP and adds a UI panel — no new design doc needed.

- [x] Task 34: Extract the CLI's pipeline into a shared, reusable service.
  - Acceptance: new `server/src/modules/ai-email-assistant/simulation.service.ts` exports
    `runEmailAssistantSimulation(input)`, the exact same 5 stages `scripts/test-email-flow.ts` ran
    inline; the CLI script itself refactored to call this function (arg parsing/printing only)
    so the CLI and the new HTTP endpoint can never drift apart — mirrors how webhook/polling were
    unified behind `handleTelegramApprovalUpdate` in Task 23.
  - Files: `server/src/modules/ai-email-assistant/simulation.service.ts` (new),
    `server/scripts/test-email-flow.ts` (refactored, behavior-preserving).
- [x] Task 35: HTTP endpoint — `POST /ai-email/simulate`, ADMIN-only.
  - Acceptance: `simulation.controller.ts` (Zod schema: `subject`/`body` required, `from`/`topK`/
    `noKnowledge`/`forceDraft` optional) + `simulation.routes.ts`, mounted at `/ai-email` in
    `server/src/routes/index.ts`, `requireRole(UserRole.ADMIN)`.
  - Verification: `simulation.controller.test.ts` (Zod schema unit tests — the handler itself,
    like the CLI it wraps, needs live Ollama/MySQL and isn't unit tested, consistent with
    `MysqlKnowledgeRepository` being untested for the same reason); wired into `test:local-ai`.
  - Files: `server/src/modules/ai-email-assistant/simulation.controller.ts` (+ test),
    `simulation.routes.ts`, `server/src/routes/index.ts`, `server/package.json`.
- [x] Task 36: `EmailSimulationPanel` on `KnowledgeBasePage` — form + rendered model output.
  - Acceptance: new section on the same page (per the user's explicit "на той же странице"):
    from/subject/topK/body inputs, `noKnowledge`/`forceDraft` checkboxes, "Запустить симуляцию";
    renders deterministic-spam-stop, classification (spam/needsReply/language/intent/confidence),
    retrieved knowledge chunks (score + sourceUrl + preview), and the generated draft (or the
    skip reason) — i.e. the CLI's stage-by-stage output, as a web UI.
  - Files: `client/src/pages/KnowledgeBasePage/emailSimulationTypes.ts`,
    `useEmailSimulation.ts`, `ui/EmailSimulationPanel.tsx` (+ SCSS additions), wired into
    `KnowledgeBasePage.tsx`.

**Two things found and fixed while building/verifying this:**
- A TS inference quirk (not the known no-strictNullChecks one): once `simulation.controller.ts`
  also imported `simulation.service.ts`'s much larger type graph (draft/classification schemas
  etc.), `parsed.data` from `schema.safeParse(req.body)` widened to all-fields-optional at the
  `runEmailAssistantSimulation(parsed.data)` call site specifically — reproduced in isolation,
  narrowed down to that combination, worked around by destructuring `parsed.data` into named
  consts and passing a fresh object literal instead of the parsed object wholesale.
- `t(key, { var })` interpolation does **not** work in this repo's Jest tests — `config/jest/
  __mocks__/react-i18next.ts` mocks `t` as `(key) => key`, ignoring the options argument entirely.
  Discovered via a real failing test (rendered literal `{{reason}}` instead of the substituted
  value), not by reading the mock first. Fixed by dropping interpolation for these labels — static
  label wrapped in `t()`, dynamic value rendered as a separate `{expression}` beside it (the
  pattern already used elsewhere on this page, e.g. `STATUS_LABELS`/`doc.priority`) — works
  identically in both the real i18next runtime and the test mock.

**Delivered and live-verified** against the real dev stack (real Ollama, real ~56-document
knowledge base, no test rows created since this feature is read-only): a real pricing question
("Сколько стоит абонемент... для ребёнка 8 лет и есть ли пробное занятие?") correctly classified
(`pricing`, `confidence 0.90`), retrieved 4 real relevant chunks (FAQ/pricing/trial-lesson,
scores 0.63–0.70), and produced a coherent Russian draft citing the real prices (€1190/€1390,
€450 deposit) and trial-lesson availability. Also verified the deterministic-spam branch live
("you won the lottery, cryptocurrency investment opportunity" → stopped at
`obvious_spam_keyword`, no draft attempted). Server `tsc --noEmit` clean, `test:local-ai` 101/101;
client `stylelint` clean, full `npm test` 1014/1014.

## Knowledge Documents Pagination (2026-09-22, same day)

User's direct follow-up: paginate the knowledge-base materials table, reusing the existing
pagination element, 20 per page. No dedicated shared `Pagination` component exists in this repo —
every list page (`InvoicesPagePagination`, `MollieCustomersPagination`, etc.) has its own small
self-contained copy of the same `←  X–Y из Z  1 / N  →` pattern with matching `.pagination`/
`.paginationActions`/`.pageButton` SCSS. Reused that exact pattern (copied from
`InvoicesPagePagination.tsx`, closest architecturally) plus the server's `_page`/`_limit` query-
param and `{items, total, page, limit, totalPages}` response convention, already used by
`GET /invoices` — `GET /knowledge/documents` now matches it exactly.

- [x] Task 37: `GET /knowledge/documents` accepts `_page`/`_limit`, returns a paginated envelope.
  - Acceptance: new `MysqlKnowledgeRepository.listDocumentsPage(filter, {page, limit})` (kept
    separate from the existing unpaginated `listDocuments`, which
    `embedPendingKnowledgeDocuments` — "run embedding for all pending" — still needs
    unpaginated, across every page, not just the one currently displayed) and
    `countDocuments(filter)`; controller parses `_page`/`_limit` the same way
    `invoices.controller.ts` does and responds `{items, total, page, limit, totalPages,
    pendingTotal}` — `pendingTotal` is a real fix, not cosmetic: without it the "run embedding for
    all pending (N)" button's count would silently only reflect the current page after
    pagination, not the true pending count the button actually acts on.
  - Files: `server/src/modules/knowledge-ingestion/mysql-knowledge.repository.ts`,
    `knowledge-ingestion.controller.ts`.
- [x] Task 38: Client — 20-per-page pagination UI on the documents table.
  - Acceptance: `useKnowledgeDocuments` sends `_page`/`_limit: 20`, exposes `page`/`setPage`/
    `total`/`totalPages`/`pendingTotal`; new `DocumentsPagination` in `KnowledgeBasePage.tsx`,
    copied from `InvoicesPagePagination`'s structure/props (`page`/`totalPages`/`total`/`loading`/
    `onPageChange`) and its `.pagination`/`.paginationActions`/`.pageButton` SCSS.
  - Verification: new test — 21 total documents across a mocked 2-page response, `1–20 из 21` /
    `1 / 2` rendered, clicking → sends `_page: 2`, second page's document appears, next-page
    button disabled on the last page.
  - Files: `client/src/pages/KnowledgeBasePage/useKnowledgeDocuments.ts`, `useKnowledgeBase.ts`,
    `ui/KnowledgeBasePage.tsx` (+ SCSS), `ui/KnowledgeBasePage.test.tsx`.

**Live-verified** against the real ~55-document knowledge base (already at 3 pages): page 1
showed `1–20 из 55` / `1 / 3`; clicking → loaded page 2 (`21–40 из 55`) with different real
documents and a real `GET /knowledge/documents?_page=2&_limit=20` request. Server `tsc --noEmit`
clean, `test:local-ai` 101/101; client `stylelint` clean, full `npm test` 1015/1015.

## Editable, DB-Backed System Prompts (2026-09-22, same day)

User's direct follow-up: make the system prompt editable via a field, saveable to the DB, testable
with visible results, switchable between saved prompts, and taggable. Confirmed with the user
before building: **both** prompts (`classificationPrompt` and `draftBodyPrompt`, both hardcoded in
`ollama.client.ts`) become editable, and the **active** prompt per slot affects real production
email classification/drafting too — not just the simulation panel.

Design (kept deliberately narrow given production impact): only the *instructions* text is
user-editable and DB-backed; the per-email dynamic data each prompt function appends
(`FROM`/`SUBJECT`/`BODY` for classification; `ПИСЬМО_КЛИЕНТА`/`ДАННЫЕ_CRM`/`ЗНАНИЯ` for drafting)
stays hardcoded application logic appended *after* the stored instructions — a saved prompt can
rewrite persona/rules/tone freely but can never accidentally omit the actual email the model must
act on. `{{replyLanguage}}` is a placeholder in the DRAFT_BODY instructions, substituted from the
already-computed classification (the target language is a deterministic pipeline decision, not
something free text should guess). An empty `ai_prompts` table (fresh install) changes zero
behavior — `PrismaAiPromptRepository.getActiveContent` falls back to `DEFAULT_PROMPT_CONTENT`,
which is exactly the pre-feature hardcoded text, verbatim.

- [x] Task 39: `AiPrompt` model — slot (`DRAFT_BODY`|`CLASSIFICATION`), name, content, tags, one
  active row per slot enforced transactionally.
  - Files: `server/prisma/schema/ai-email.prisma` (+ migration), `prompt-library.service.ts`
    (`DEFAULT_PROMPT_CONTENT`, `PrismaAiPromptRepository` — list/create/update/activate/remove/
    getActiveContent/getContentById).
- [x] Task 40: `ollama.client.ts` resolves instructions from the prompt library instead of a
  hardcoded constant.
  - Acceptance: `OllamaLlmClient` takes optional `promptRepository` (defaults to
    `PrismaAiPromptRepository`) and `promptOverrides: {classificationPromptId?, draftBodyPromptId?}`
    — an override wins for that call; otherwise the slot's active row; otherwise the built-in
    default. `classificationPrompt`/`draftBodyPrompt` functions became
    `buildClassificationPrompt(instructions, ...)`/`buildDraftBodyPrompt(instructions, ...)`,
    taking the resolved instructions as a parameter instead of hardcoding them.
  - Existing `ollama.client.test.ts` updated with a `fakePromptRepository` (resolves straight to
    `DEFAULT_PROMPT_CONTENT`, no Prisma/MySQL) injected into every client construction — otherwise
    every test would hit the real DB and fail with "Environment variable not found: DATABASE_URL".
  - Files: `server/src/modules/ai-email-assistant/ollama.client.ts` (+ test).
- [x] Task 41: Admin CRUD API — `/ai-email/prompts`, ADMIN-only.
  - Acceptance: `GET /` (list, optional `?slot=`), `POST /` (create), `PATCH /:id` (update),
    `POST /:id/activate` (transactional slot-exclusive activation), `DELETE /:id`.
  - Files: `server/src/modules/ai-email-assistant/prompt.controller.ts` (+ test),
    `prompt.routes.ts`, `server/src/routes/index.ts`, `server/package.json`.
- [x] Task 42: `simulation.service.ts`/`.controller.ts` accept `classificationPromptId`/
  `draftBodyPromptId` — test a candidate prompt for one run without activating it.
- [x] Task 43: `PromptLibraryPanel` on `KnowledgeBasePage` — list (grouped by slot, active badge),
  create/edit form (slot, name, tags, content), activate, delete; `EmailSimulationPanel` gained two
  prompt selects (defaulting to "(активный)") wired to the new override fields.
  - Files: `client/src/pages/KnowledgeBasePage/promptLibraryTypes.ts`, `usePromptLibrary.ts`,
    `ui/PromptLibraryPanel.tsx` (+ SCSS), `emailSimulationTypes.ts`, `useEmailSimulation.ts`,
    `ui/EmailSimulationPanel.tsx`, `ui/KnowledgeBasePage.tsx`, `ui/KnowledgeBasePage.test.tsx`
    (+4 new tests: list/create/activate/select-a-specific-prompt-for-one-run).

**Two real bugs found while building/verifying this, both fixed before they reached the running
dev server (one did reach it — see below):**
- `String.prototype.replaceAll` (used for the `{{replyLanguage}}` substitution) compiles clean
  under plain `tsc --noEmit` but **not** under `ts-node` as this project's nodemon actually runs it
  (`ts-node --files src/index.ts`) — `tsc --noEmit -p tsconfig.json` and `node --test -r ts-node/
  register` disagreed on the exact same file/line, and the real dev server crashed on it
  (confirmed in `docker logs hhdc-backend-dev`) while a real user was actively using the app.
  Fixed by switching to `.split(...).join(...)`, and now treating `node --test -r ts-node/register`
  (or an actual server restart) as the real compile check for new server code — `tsc --noEmit`
  alone was insufficient. Fixed within about a minute of the crash; server recovered immediately.
- The same TS inference quirk from the simulation-panel section (widening `parsed.data` to
  all-optional once a file also imports a large type graph) recurred in the new
  `simulation.controller.ts` change (adding the two prompt-id fields) — same destructuring
  workaround applied.

**Live-verified against the real dev stack, including the production-impact claim specifically:**
created a test `DRAFT_BODY` prompt ("reply in at most one sentence, no persona") →
ran it via the simulation panel *without* activating it (selected explicitly by id) → got a
one-sentence reply, proving the per-run override works without touching production. Then
activated it → re-ran the simulation *without* selecting any prompt (left on "(активный)") → got
the same one-sentence style, proving the active prompt is genuinely what the no-override path
(the same path real production classify/draft calls use) resolves to. Deleted the test prompt
immediately after, returning both slots to "no active prompt" (i.e. the original hardcoded
persona-based behavior) before ending the session. Server `tsc --noEmit` clean (with the caveat
above), `test:local-ai` 107/107; client `stylelint` clean, full `npm test` 1019/1019.

## Hybrid Retrieval: BM25 + RRF (2026-09-22/23, same session)

User's direct follow-up, after asking "did we implement everything for the RAG/LLM
improvement?": the answer was no — the retrieval upgrade explored in `rag/` (BM25, RRF, reranker,
query expansion) had been explicitly deferred when the Knowledge Base Admin Page work started.
User approved doing BM25 + RRF now, with reranker/query expansion left as optional follow-ups
(not built this pass — see Open Questions below).

Design, chosen to make this a strictly additive quality upgrade with zero risk to the production
draft pipeline's confidence math:
- `KnowledgeRetrievalService.retrieve()` still applies the existing `minimumScore` cosine-
  similarity bar and document-version de-dup **first, unchanged** — BM25/RRF only re-rank and
  re-select *within* that already-qualifying set; a chunk vector search itself would reject can
  never be surfaced by BM25. The `score` field returned per chunk is still the plain cosine
  similarity (never an RRF/BM25 score) — `ollama.client.ts`'s `CONFIDENT_KNOWLEDGE_SCORE` threshold
  keeps meaning what it always meant.
- `MysqlKnowledgeRepository`/`InMemoryKnowledgeRepository.search()` already score the *entire*
  active-chunk corpus internally before slicing to the requested limit (pre-existing behavior) —
  requesting a large `CANDIDATE_POOL_SIZE` (500) from `retrieve()` costs nothing extra and just
  avoids truncating before hybrid fusion gets a chance to re-rank; the real KB (~50 docs / a few
  hundred chunks) is nowhere near this size.

- [x] Task 44: `Bm25Search` — pure-TS Okapi BM25, ported from `rag/src/bm25.ts`.
  - Ported with two portability fixes the original rag/ code didn't need: no `\p{L}`/`u`-flag
    Unicode regex property escapes (TS1501 under this project's ts-node target) — an explicit
    Latin+Cyrillic character class instead; no direct `for...of`/spread over a `Set`/`Map`
    (TS2802) — `Array.from(...)` instead, matching the existing
    `Array.from(new Set(...))` pattern already used in `knowledge-ingestion.service.ts`.
  - Files: `server/src/modules/knowledge-ingestion/bm25.service.ts` (+ test, 5 cases).
- [x] Task 45: `fuseRankedLists` — Reciprocal Rank Fusion, ported from `rag/src/rrf.ts`.
  - Files: `server/src/modules/knowledge-ingestion/rrf.service.ts` (+ test, 5 cases).
- [x] Task 46: Wired both into `KnowledgeRetrievalService.retrieve()`.
  - Verification: existing `retrieval.service.test.ts` case still passes unmodified (BM25 finds no
    term overlap with "query" against single-word test content → degrades to pure vector order,
    exactly the pre-existing expected result); two new cases added — one proving BM25 promotes a
    lower-cosine chunk that matches query terms above a higher-cosine chunk that doesn't, one
    proving the no-term-overlap fallback explicitly.
  - Files: `server/src/modules/knowledge-ingestion/retrieval.service.ts` (+ test), `server/package.json`.

**One bug caught before it ever reached the dev server this time** (the `tsc`-vs-`ts-node` lib
mismatch — see the prior section's note and its own project memory — is now a known thing to check
for): `npx tsc --noEmit` was clean, but `node --test -r ts-node/register` on the very first version
of `bm25.service.ts` failed with `TS1501` (Unicode regex property escape) and `TS2802` (direct
iteration over a `Set`) — both fixed (see Task 44) *before* saving triggered nodemon in the running
container, so this time the real dev server never crashed.

**Live-verified** against the real dev stack and the real ~55-document knowledge base: a query
naming a specific real entity verbatim ("Lito Dance Camp") retrieved 4 correctly-scoped chunks
(scores 0.634–0.690, confirming the returned score stayed plain cosine, not RRF-scaled),
classified as `event`/`confidence 0.80`, and produced an accurate draft citing specific facts pulled
from those chunks (4★ hotel, 3 meals/day, 2–3 dance classes/day, medical insurance, €450 deposit,
branded T-shirt) with nothing fabricated. Server `tsc --noEmit` clean, `node --test -r ts-node/
register` clean (both checked, per the lib-mismatch lesson), full `test:local-ai` 119/119, full
`test:ci` 371/371.

**Open questions (deliberately not built this pass):**
- **Reranker** (cross-encoder re-scoring via a dedicated Ollama model, e.g. `qwen3-reranker`, with
  bi-encoder-similarity fallback per the `rag/` reference) — would need a new model pulled in this
  deployment's Ollama and adds a per-candidate round-trip; not done.
- **Query Expansion** (LLM-cleaned/expanded query before retrieval) — adds one more LLM call to
  every classify→retrieve→draft cycle; not done.
- Both are natural next candidates if retrieval quality still needs work after this hybrid upgrade
  is used for a while — ask if/when wanted.

## Query Expansion + Reranker (2026-09-23, same session)

User said "делай" (do it) right after the two open questions above were listed — implemented both
this pass. Also answered a direct side-question mid-turn: `RAG_CHUNK_SIZE`/`RAG_CHUNK_OVERLAP` are
**not** env vars in this codebase — `chunkKnowledgeDocument`'s 500-char size / 250-char overlap are
hardcoded default parameters (`embedding.service.ts`), and every call site (`sync.service.ts`,
`mysql-knowledge.repository.ts`) calls it with no override; left as-is, not asked for.

Design, extending the same "additive, never lowers the confidence bar" principle from the BM25+RRF
section:
- **Query expansion** (`query-expansion.service.ts`): ported `parseExpansionResponse`'s robust
  JSON extraction (direct parse → code-fence strip → balanced-brace extraction) from `rag/src/
  queryExpansion.ts` verbatim — but **not** its `format: "json"` request option, and **not** its
  `/api/chat` endpoint. This deployment already found (Task 24) that `format: "json"` makes qwen3
  reliably return an empty `{}`, and the rest of `ollama.client.ts` already uses a single flat
  `/api/generate` prompt (no chat roles) — copying the reference's exact request shape would have
  reintroduced a bug this project already fixed twice. Also changed the prompt to keep
  `clean_query`/`keywords` in the query's own language rather than translating to English (this
  deployment's canonical language is Russian, and translating would hurt both embedding match and
  BM25 literal-term matching against non-English content). Every failure mode (network error,
  non-2xx, unparseable output) falls back to the original query + locally-extracted keywords,
  never throws.
- **Reranker** (`reranker.service.ts`): ported from `rag/src/reranker.ts` — tries Ollama's native
  `/api/rerank` first, falls back to re-embedding each candidate and ranking by cosine similarity
  to the query, falls back to the original order if even that fails. Never overwrites a chunk's
  `score` field (same rule as BM25/RRF) — reranking only changes order/selection.
- **Config** (`ai.config.ts`): `ragQueryExpansionEnabled`/`ragRerankEnabled` (env
  `RAG_QUERY_EXPANSION_ENABLED`/`RAG_RERANK_ENABLED`, both default `false`) gate the **real
  production** path (`draft-pipeline.cron.service.ts`) — each adds a model call to every
  classify→retrieve→draft cycle on a 2 CPU/4 GB VPS, for a quality benefit that should be evaluated
  before it runs unattended on real customer emails. `ragRerankModel` (env `RAG_RERANK_MODEL`,
  default `qwen3-reranker:0.6b`) is only consulted if `/api/rerank` exists at all — almost
  certainly not pulled in this deployment, so reranking will realistically always take the
  bi-encoder fallback path unless/until someone pulls a dedicated cross-encoder model.
- **Simulation panel**: both are always available regardless of the production flags (an admin
  evaluates the real effect before opting production in), with `noQueryExpansion`/`noRerank`
  checkboxes to disable either per-run for an apples-to-apples comparison. `EmailSimulationResult`
  gained `queryExpansion: {cleanQuery, keywords} | null`, displayed in the "Найденные знания"
  block.
- `KnowledgeRetrievalService.retrieve()` (plain array, unchanged signature) is now a thin wrapper
  around new `retrieveWithDetails()` (returns `{chunks, queryExpansion}`), which the simulation
  panel uses to surface what query expansion actually did.

- [x] Task 47: `query-expansion.service.ts` — `parseExpansionResponse` (pure) + `OllamaQueryExpansionClient`.
  - Files: `server/src/modules/knowledge-ingestion/query-expansion.service.ts` (+ test, 10 cases).
- [x] Task 48: `reranker.service.ts` — `OllamaReranker` (native → bi-encoder → no-op fallback chain).
  - Files: `server/src/modules/knowledge-ingestion/reranker.service.ts` (+ test, 5 cases).
- [x] Task 49: `ai.config.ts` gains `ragQueryExpansionEnabled`/`ragRerankEnabled`/`ragRerankModel`.
  - Files: `server/src/config/ai.config.ts` (+ test), `.env.example`.
- [x] Task 50: Wired into `KnowledgeRetrievalService` (new `retrieveWithDetails`),
  `draft-pipeline.cron.service.ts` (config-gated), `simulation.service.ts`/`.controller.ts`
  (always available + opt-out toggles).
- [x] Task 51: Client — `noQueryExpansion`/`noRerank` checkboxes + query-expansion display block
  in `EmailSimulationPanel`.
  - Files: `client/src/pages/KnowledgeBasePage/emailSimulationTypes.ts`, `useEmailSimulation.ts`,
    `ui/EmailSimulationPanel.tsx`, `ui/KnowledgeBasePage.test.tsx` (+1 test).

**One RTL test-matching lesson, not a product bug:** the query-expansion display renders as
sibling text nodes inside one `<p>` (label + value + label + value) — `screen.findByText('цена
абонемента')` (exact match) found nothing even though the text was genuinely on the page, because
RTL matches per-node `textContent`, not arbitrary substrings across sibling text nodes within the
same element. Fixed by using a regex matcher (`/цена абонемента/`), the same fix already used
earlier in this file for the spam-reason assertion — worth remembering for any future assertion
against text built from multiple interpolated `t()` calls in one element.

**Live-verified** against the real dev stack with both features active (their simulation-panel
default): the deliberately casual, typo-free-but-vague query "привет а можно узнать что там с
высокими каблуками у вас, это как хип хоп или другое, и сколько стоит" — expansion correctly
extracted `высокие каблуки, хип хоп, цена` as keywords, hybrid retrieval correctly surfaced 4
chunks specifically about the "High Heels" dance *style* (not literal footwear) with scores in the
normal 0.546–0.654 cosine range, and the draft correctly told the customer about adult High Heels
classes with no prior experience required — a real disambiguation win attributable to query
expansion feeding better search terms into BM25/vector search. Server `tsc --noEmit` clean,
`test:local-ai` 135/135, full `test:ci` 387/387; client full `npm test` 1020/1020.

## Configurable Chunk Size/Overlap (2026-09-23, same session)

**Design:** `chunkKnowledgeDocument` (`server/src/modules/knowledge-ingestion/embedding.service.ts`)
took `maxCharacters`/`overlapCharacters` as hardcoded default parameters (`500`/`250`). Every real
call site (`sync.service.ts`, `mysql-knowledge.repository.ts`) calls it with no override args, so
these hardcoded defaults were the only values ever actually used across every ingestion path
(WordPress/sitemap sync, manual file upload, manual URL crawl). Moved them into `ai.config.ts` as
`ragChunkSize`/`ragChunkOverlap`, driven by new env vars `RAG_CHUNK_SIZE`/`RAG_CHUNK_OVERLAP`, with
new defaults `700`/`100` (character-based, no tokenizer wired up in this codebase; ~2-2.5
chars/token for Cyrillic, this deployment's canonical language). `chunkKnowledgeDocument`'s
signature is unchanged (still takes optional override params for tests) — only its *default*
values now read from config, so no call site needed to change and existing tests that pass
explicit args are unaffected.

**Task 52:** `ai.config.ts` — `DEFAULT_RAG_CHUNK_SIZE`/`DEFAULT_RAG_CHUNK_OVERLAP` constants +
`ragChunkSize`/`ragChunkOverlap` fields, parsed via a new `nonNegativeInteger` helper (overlap may
legitimately be 0) alongside the existing `positiveInteger` helper (chunk size must be >0, falls
back to default on 0/negative/non-numeric).

**Task 53:** `embedding.service.ts` — `chunkKnowledgeDocument`'s default parameters switched from
hardcoded `500`/`250` to `aiConfig.ragChunkSize`/`aiConfig.ragChunkOverlap`.

**Task 54:** Test fixtures — `ai.config.test.ts` (new defaults assertion, env-driven parsing test,
new fallback-behavior test for zero/negative/non-numeric chunk size vs. overlap allowing zero);
`query-expansion.service.test.ts`, `reranker.service.test.ts`, `ollama.client.test.ts` — added the
two new required `AiConfig` fields to each full-shape fixture.

**Task 55 — real gap found and fixed:** `docker-compose.dev.yml`/`docker-compose.prod.yml` were
checked as part of this change and turned out to only pass `RAG_TOP_K` through to the backend
service's `environment:` block — `RAG_QUERY_EXPANSION_ENABLED`/`RAG_RERANK_ENABLED`/
`RAG_RERANK_MODEL` from the *previous* session section were never added there either, meaning none
of those flags could actually be set via `.env` in the real dev/prod containers regardless of
`.env` contents (they were silently stuck on their code-level defaults). Fixed by adding all five
RAG-related passthroughs (`RAG_QUERY_EXPANSION_ENABLED`, `RAG_RERANK_ENABLED`, `RAG_RERANK_MODEL`,
`RAG_CHUNK_SIZE`, `RAG_CHUNK_OVERLAP`) to both compose files' backend `environment:` block, same
`${VAR:-default}` style as every other optional var there.

**Task 56:** `.env.example` — documented `RAG_CHUNK_SIZE`/`RAG_CHUNK_OVERLAP` next to
`RAG_RERANK_MODEL`, noting the character-based/no-tokenizer caveat and that every ingestion path
shares these defaults.

**Checks:** Server `npx tsc --noEmit` clean; `node --test -r ts-node/register` on
`ai.config.test.ts` + `embedding.service.test.ts` (10/10, both compile paths verified per the
ts-node/tsc lib-mismatch lesson); full `npm run test:local-ai` 136/136; `npm run build` clean;
full `npm run test:ci` 388/388. Both `docker compose -f docker-compose.yml -f
docker-compose.dev.yml config` and the prod equivalent parse with no syntax errors after the
compose edits. No client changes in this section — nothing to re-run there.

Not independently browser-QA'd beyond the above: this is a low-risk, backward-compatible default
change (chunking granularity only, same code paths already exercised live in the BM25/RRF and
query-expansion/reranker sections above) — deferred to the next real ingestion run against the
live knowledge base rather than repeating a full end-to-end simulation for a parameter-only
change.

---

# Implementation Plan: Telegram Admin Bot (2026-09-23)

Contract: `docs/spec/TELEGRAM_ADMIN_BOT_SPEC.md` + `docs/prompts/TELEGRAM_ADMIN_BOT_AGENT_PROMPT.md`.
Acceptance checklist: `docs/TELEGRAM_ADMIN_BOT_CHECKLIST.md`.

## Discovery summary (REUSE / REFACTOR / ADD)

Three pre-existing Telegram mechanisms, one physical bot (one `TELEGRAM_TOKEN`, shared across
features):
- `auth/telegram/` — OIDC login only, produces `AuthIdentity{provider:'TELEGRAM', providerUserId}`
  (`providerUserId` = OIDC `sub`, expected but not yet verified to equal the Bot API's numeric
  `from.id` — verify this as the first Phase 1 step, before building the identity resolver on it).
- `communication/telegram/telegram.service.ts` — low-level transport (`sendTelegramMessage`, raw
  `axios` to the Bot API, hardcoded single `TELEGRAM_CHAT_ID`).
- `ai-email-assistant/telegram-approval.*` — existing webhook (`POST /api/v1/telegram/webhook`,
  `X-Telegram-Bot-Api-Secret-Token`) + polling (`TELEGRAM_POLLING_ENABLED`) dual transport, one
  core `handleTelegramApprovalUpdate(update)`, callback routing by regex on `callback_data`
  (`ai:draft:<id>:<version>:<action>`). Authorization is a flat `TELEGRAM_APPROVER_IDS` allowlist —
  **not** CRM-user-based, and explicitly not reusable as-is for admin authorization (spec forbids
  "group membership as authorization").

**REUSE as-is:** `createClient`/`getAllClients` (`clients.service.ts`), `createCustomerRecord`
(idempotent by email, `payments.controller.ts:753`), `findCustomerWithValidMandate`
(`payments.controller.ts:2710`), `getMollieDashboardSummary` (`payments.dashboard.service.ts:86`),
the Mollie webhook/sync (`payments.controller.ts:634`, untouched — Telegram never sets payment
state itself), `recordAuthSecurityEvent` (`auth.security-audit.service.ts:58`), `AuthIdentity` +
`User.role`.

**REFACTOR:**
- Export `buildPaymentSummaryPayload` (currently private in `clients.controller.ts:352`) — move to
  `clients.service.ts` so both the HTTP controller and the Telegram module can call it directly
  in-process (no HTTP round-trip needed since the bot runs in the same server).
- Extract the subscription-creation and payment-link-creation logic currently embedded directly in
  `mollieCreateMandateSubscriptionController` (`payments.controller.ts:2722`) and
  `mollieCreateCustomerPaymentLinkController` (`payments.controller.ts:1974`) into named, exported,
  HTTP-agnostic functions the existing controllers call — same pattern `clients.service.ts` already
  follows. Scope strictly to these two extractions, not a full `payments.controller.ts` split.
- Add `TELEGRAM_STUDENT_CREATED` / `TELEGRAM_MOLLIE_CUSTOMER_CREATED` /
  `TELEGRAM_SUBSCRIPTION_CREATED` / `TELEGRAM_PAYMENT_LINK_CREATED` to `AuthSecurityEventType` —
  `recordAuthSecurityEvent` itself is unchanged.
- Extract a small shared low-level Bot API client (`sendMessage`/`answerCallbackQuery`/
  `editMessageText`) out of `communication/telegram` + `telegram-approval.*`'s duplicated raw
  `fetch`/`axios` calls into `server/src/common/telegram/telegram-bot-api.client.ts`, used by both
  the existing email-approval bot and this new module.

**ADD:**
- `server/src/modules/telegram-admin-bot/` — new module (webhook dispatch by `callback_data`
  prefix on the *existing* `/api/v1/telegram/webhook` route: `ai:draft:*` → existing handler,
  `adm:*` or an in-progress admin flow's free text → new handler; no second bot/webhook).
- Telegram `from.id` → CRM `User` resolver + role check (bot-side equivalent of `requireRole`),
  built on the existing `AuthIdentity` link.
- Per-admin flow-state store with TTL (Redis if `REDIS_URL` set, else in-memory — same convention
  as the existing rate-limiter).
- `getClientCount()` (`prisma.client.count()`) in `clients.service.ts` — no existing endpoint
  returns a bare student count.
- A short-lived per-(adminUserId, operation, targetId) in-memory/Redis lock in the new module
  around subscription/payment-link creation calls, since neither has any existing duplicate
  protection (confirmed: not even the web UI has one) and the spec requires more than "disable the
  button." Scoped to the Telegram module only — not a change to the shared payments module.

**OUT OF SCOPE (per spec §3, confirmed by user):** mandate *creation* via Telegram (status display
only — see decision below), `groupIds` during Telegram student creation, reusing the generic
`search` module (too broad, leaks unrelated domains).

## Decisions (confirmed with user before implementation)

1. **Mandate**: Telegram shows mandate status only (valid / none, via
   `findCustomerWithValidMandate`). Actual mandate creation requires typing the client's IBAN
   (`createMandateSchema` — synchronous directdebit mandate, not a checkout-URL flow as the spec
   assumed) and stays web-CRM-only for v1. The bot's Mollie submenu shows "Mandate: ✅/❌" with a
   note to create it in the web CRM when absent — no Telegram input flow for it.
2. **Bot/webhook**: reuse the existing bot (`TELEGRAM_TOKEN`) and existing webhook route, dispatch
   by `callback_data` prefix — no second BotFather registration.
3. **Chat scope**: financial write flows run in the existing shared group
   (`TELEGRAM_CHAT_ID`), same as email-approval and payment notifications today — not restricted
   to an admin's private chat. Still keep messages compact per spec §18 (no full profile dumps).
4. **RBAC**: gate the entire bot (dashboard, search, student creation, all Mollie flows) to CRM
   users with `role === 'ADMIN'` — simplest, unambiguous, and the explicit choice for the
   financial-write flows; applying it uniformly avoids a partial-role-gating special case for v1.

## Task List

- [ ] Task 1 (Phase 1 — foundation): verify `AuthIdentity.providerUserId` (OIDC `sub`) equals the
  Bot API's numeric `from.id` for a real linked admin account; build the identity/RBAC resolver;
  extract the shared low-level Bot API client; wire webhook dispatch by `callback_data` prefix
  alongside the existing email-approval handler; implement the flow-state store (TTL, per-admin);
  root menu + Back/Cancel.
- [ ] Task 2 (Phase 2 — read-only): dashboard flow (`getMollieDashboardSummary` + new
  `getClientCount()`); student search flow (`getAllClients`); student card
  (`buildPaymentSummaryPayload`, exported).
- [ ] Task 3 (Phase 3 — student creation): guided create-student flow calling `createClient`
  as-is, with a confirmation step; audit via `recordAuthSecurityEvent`.
- [ ] Task 4 (Phase 4a — Mollie Customer): create/link flow calling `createCustomerRecord`
  (already idempotent by email); audit.
- [ ] Task 5 (Phase 4b — Mandate status + Subscription): mandate status display (no creation);
  subscription flow (extracted service fn) with prerequisite checks (customer + valid mandate),
  preview/confirm, the new short-lived duplicate-protection lock, audit.
- [ ] Task 6 (Phase 4c — Payment Link): payment-link flow (extracted service fn), confirm step,
  duplicate-protection lock, checkout URL returned via inline button, audit.
- [ ] Task 7 (Phase 5 — tests/hardening): unit tests per
  `docs/TELEGRAM_ADMIN_BOT_CHECKLIST.md`'s Verification section; tick every checklist box; browser/
  Telegram-live QA against the real dev stack.

## Verification Plan

- [ ] Server: `node --test -r ts-node/register` on new/changed files, then the matching domain
  test script, then full `npm run test:ci`.
- [ ] `npx tsc --noEmit` clean.
- [ ] Live QA against the real dev bot/chat (not just unit tests) before considering any phase done
  — matches this session's established practice for AI/Telegram features.
- [ ] `docs/TELEGRAM_ADMIN_BOT_CHECKLIST.md` fully ticked before declaring the feature complete.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| OIDC `sub` ≠ Bot API numeric `from.id` | High — identity resolver silently never matches | Verify against a real linked account in Task 1 before building on the assumption; fall back to a one-time explicit re-link step if they differ |
| `payments.controller.ts` (~3200 lines) — extracting subscription/payment-link logic touches a large, business-critical file | Medium — regression risk in existing web flows | Extract only the two named functions verbatim (no behavior change), keep existing controllers as thin wrappers, run full `test:ci` + manual web-UI smoke test after |
| No existing duplicate protection on subscription/payment-link creation (web UI included) | Medium — double-tap in Telegram could double-charge/double-subscribe | New Telegram-local short-lived lock (Task 5/6); flagged as a gap that also affects the web UI today, not introduced by this feature |
| Shared-group financial messages contain client name/amount/checkout URL | Accepted by user (decision 3) | Keep messages minimal (no full profile, no IBAN, no raw errors) |

## Open Questions

- None outstanding — all fork points resolved by explicit user decision above.

## Progress (2026-09-23, same session)

**Done — Phase 1 (foundation) + Phase 2 (dashboard/search) + Phase 3 (student creation):**

- `server/src/common/telegram/telegram-bot-api.client.ts` — shared low-level Bot API wrapper
  (`sendMessage`/`editMessageText`/`answerCallbackQuery`), used only by the new module; the
  existing `communication/telegram/telegram.service.ts` and `ai-email-assistant/telegram-approval.*`
  were left untouched rather than migrated onto it, to keep this pass's diff to working code
  minimal.
- `server/src/common/telegram/telegram-update-dispatcher.ts` — routes one shared webhook/polling
  update stream between the existing email-approval handler (`ai:draft:*` callbacks, `/edit`
  commands) and the new admin bot (everything else, gated on an active flow or `/start`).
  `telegram-approval.controller.ts`'s webhook controller was removed in favor of a new shared
  `common/telegram/telegram-webhook.controller.ts` (avoids a circular import between the
  dispatcher and the controller it dispatches to); `telegram-approval.polling.service.ts` now
  calls the dispatcher too. `telegramApprovalWebhookController` → extracted to
  `telegramWebhookSecretIsValid` (pure predicate), reused by the new shared controller.
- `server/src/modules/telegram-admin-bot/` — new module: `telegram-admin-bot.auth.ts` (RBAC
  resolver over the existing `AuthIdentity`), `telegram-admin-bot.state.ts` (flow-state store,
  Redis-or-memory, same convention as `auth.rate-limit.service.ts`), `telegram-admin-bot.menu.ts`,
  `telegram-admin-bot.dashboard.flow.ts`, `telegram-admin-bot.student-search.flow.ts`,
  `telegram-admin-bot.student-create.flow.ts` (pure step logic), `telegram-admin-bot.service.ts`
  (the core update handler, dependency-injected for testability).
- Exports added (one-word `export` additions, no behavior change): `createClientSchema`
  (`clients.controller.ts`), new `getClientCount()` (`clients.service.ts`).
- Migration `20260923120000_add_telegram_admin_audit_events`: 4 new `AuthSecurityEventType`
  values (`TELEGRAM_ADMIN_STUDENT_CREATED`/`_MOLLIE_CUSTOMER_CREATED`/`_SUBSCRIPTION_CREATED`/
  `_PAYMENT_LINK_CREATED`) — the latter 3 added now (inert until Phase 4) to avoid a second
  migration round-trip.
- **Real pre-existing bug found and fixed via live testing**: `auth/auth.csrf.middleware.ts`'s
  `csrfExempt` whitelisted `/mollie/webhook` and `/instagram/webhook` but never
  `/telegram/webhook` — meaning the webhook transport for the *existing* email-approval bot was
  silently 403'd by CSRF whenever `TELEGRAM_POLLING_ENABLED=false`, unrelated to anything in this
  feature. Fixed by adding `/telegram/webhook` to the exemption list (same rationale as the other
  two: server-to-server call, own secret-header check, no session/CSRF cookies possible). Added
  `auth.csrf.middleware.test.ts` (didn't exist before) covering all three exemptions.

**Live-verified** against the real dev stack (real MySQL, real Telegram Bot API, real configured
group): created a temporary `AuthIdentity` linking a throwaway Telegram id to the `test@test.com`
ADMIN user, POSTed synthetic Telegram updates directly to `POST /api/v1/telegram/webhook` with the
real webhook secret. `/start` → real "DDC ADMIN" message sent to the real configured group.
Removing the identity → same `/start` correctly returns "no access" with no menu/data. Dashboard
and search rendering verified directly against the real dev DB (0 students, 0 payments — an
empty/reset dev DB, not an error). Did **not** live-test the create-student write path itself
(would have written a fake student into the dev DB) — covered instead by the 9/9 injected-fake
unit tests in `telegram-admin-bot.service.test.ts`. Temporary `AuthIdentity` row deleted after
testing.

**Checks:** `npx tsc --noEmit` clean; new `npm run test:telegram-admin-bot` script (28/28); full
`npm run test:ci` (0 failures across every suite); `npm run build` clean.

**Deliberately deferred to a follow-up pass (Phase 4 — Mollie financial operations):**
Mollie Customer create/link, mandate *status display* (not creation, per decision 1), Subscription,
Payment Link — these need the `payments.controller.ts` extractions (`createCustomerRecord`,
subscription/payment-link logic) noted in the REFACTOR list above, plus the new short-lived
duplicate-protection lock, none of which are built yet. Root menu currently shows only the 3
buttons whose flows exist (Dashboard, Новый ученик, Найти ученика); the Mollie buttons are added
once Phase 4 lands, per the "no dead buttons for a real admin" note in `telegram-admin-bot.menu.ts`.

## Production rollout findings (2026-09-23, same day — real deploy to the live server)

Merged to `main` via Release PR #143 and deployed by the user. Two real findings surfaced only by
testing against the actual production Telegram bot, neither reproducible in the dev sandbox:

**1. The Phase-1 identity assumption was wrong — `AuthIdentity.providerUserId` (Telegram OIDC's
`sub` claim) is NOT the Bot API's numeric `from.id`.** Confirmed live: the real stored
`providerUserId` for the admin's web login was `8603223464270931507` (19 digits — an opaque,
per-OIDC-client pseudonymous identifier), while the same admin's real Bot API id (via
`@userinfobot`) is `348397131` (9 digits, the classic Telegram user id format). These are two
different identifier spaces; a web "Войти через Telegram" login can **never** produce a row that
`resolveTelegramAdmin` (which looks up by the raw numeric `from.id` from bot updates) will match.
**Current production state is a manual workaround, not a code fix**: a second `AuthIdentity` row
was inserted directly (`provider: 'TELEGRAM'`, `providerUserId: '<real numeric id>'`, same
`userId`) for the one admin who needs bot access today. This works because the `(provider,
providerUserId)` unique index doesn't collide (different providerUserId value) and nothing else in
the codebase assumes exactly one Telegram identity row per user — but it does not scale (every new
admin needs the same manual `docker exec ... prisma.authIdentity.create` treatment) and isn't
self-service.
**Follow-up needed**: a real bot-driven linking flow (e.g. an admin sends `/link` to the bot, which
already sees the real numeric `from.id` on any message, and confirms it against their web session
via a short-lived code) — a proper Phase-1 addition, not yet built. Until then, onboarding a new
bot admin requires this same manual DB step.

**2. A persistent, never-identified "phantom" process was fighting for control of the bot's
Telegram API session** — both `getUpdates` (409 "terminated by other getUpdates request") and,
when a webhook was registered instead, `setWebhook`/an immediate silent `deleteWebhook` (webhook
reverted to empty within ~1 second of being set, reproduced twice, once triggered from a completely
different machine/network than production). Ruled out exhaustively: local dev (`TELEGRAM_POLLING_ENABLED=false`
confirmed both via env and zero open sockets to Telegram from the container), every other container
on the production VPS (`ddc-bot-prod`, `ddc-backend-prod` — both confirmed to use different bot
tokens), and all recent GitHub Actions runs (none in-flight). Root cause was never found. **Resolved
by revoking and reissuing the bot token via @BotFather** — the new token has had a clean
`getWebhookInfo` (no conflicts) since. If this recurs on the new token, the phantom process is
still out there somewhere unaccounted for (an old forgotten script/server is the leading
suspicion) — worth a wider search (other VPS instances, teammates' machines, old cron jobs) before
assuming it's something in this codebase.
