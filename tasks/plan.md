# Implementation Plan: Email deletion, inbox pagination, and Telegram notifications

## Overview

Verify and harden remote-first email deletion, add incremental inbox loading, and add a minimal Telegram notifier for operational email events using the existing bot token.

## Relevant Context

- Conversation deletion already calls Gmail/IMAP before deleting the local Conversation.
- The inbox API supports `page` and `pageSize`, but the client always requests one fixed page of 100.
- Telegram runtime was removed from V1; the new notifier must stay isolated and must not restore legacy login, polling, approval, or mini-app workflows.

## Task 1: Remote-first deletion is verifiably safe

**Description:** Strengthen provider and orchestration tests so local data is removed only after every remote mailbox confirms trash/spam.

**Acceptance criteria:**
- [x] Gmail trashes the remote thread and IMAP moves matching messages to `\Trash`.
- [x] Local Conversation is retained when any remote provider fails.
- [x] Multiple-provider conversations do not delete locally after a partial remote failure.

**Verification:**
- [x] Server: focused Gmail, IMAP, and disposition tests.
- [x] Server: `npm run build`.

**Dependencies:** None

**Files likely touched:**
- `server/src/integrations/email/**`
- `server/src/modules/communications/disposition*.ts`

**Estimated scope:** S

## Task 2: Load more conversations

**Description:** Expose pagination in the CRM client and append subsequent pages while preserving account and search filters.

**Acceptance criteria:**
- [x] Initial inbox load is bounded.
- [x] “Load more” appends the next page without duplicates.
- [x] The control disappears when all matching conversations are loaded.
- [x] Changing mailbox or search resets to the first page.

**Verification:**
- [x] Client Jest test covers append and filter reset.
- [x] Client: `npm run lint:ts`, `npm run lint:scss`, and `npm test`.
- [ ] Browser QA at desktop/mobile and light/dark when browser tooling is available.

**Dependencies:** None

**Files likely touched:**
- `client/src/entities/crm/model/communications.ts`
- `client/src/pages/CrmPage/ui/CommunicationsPage.tsx`
- `client/src/pages/CrmPage/ui/email/InboxList.tsx`
- `client/src/pages/CrmPage/ui/email/EmailWorkspace.tsx`
- `client/src/pages/CrmPage/ui/CommunicationsPage.module.scss`

**Estimated scope:** M

## Task 3: Minimal Telegram operational notifier

**Description:** Send privacy-safe Telegram messages through the existing bot for new inbound mail and email-sync failures.

**Acceptance criteria:**
- [x] Chat id is configured through `TELEGRAM_EMAIL_NOTIFY_CHAT_ID`, not hard-coded in executable code.
- [x] New inbound email notification contains no body or credentials.
- [x] Sync failures are reported without secrets.
- [x] Telegram failure never blocks email ingestion or sync state updates.
- [x] No legacy Telegram polling/login/approval runtime is restored.

**Verification:**
- [x] Server notifier tests use a mocked HTTP seam.
- [x] Server email tests and build pass.
- [x] `.env.example` documents the chat id placeholder.

**Dependencies:** Task 1

**Files likely touched:**
- `.env.example`
- `server/src/integrations/telegram/notify.ts`
- `server/src/modules/communications/ingest.ts`
- `server/src/modules/communications/sync.ts`

**Estimated scope:** M

## Task 4: IMAP first sync imports by message count

**Description:** The first sync took the last 200 UIDs. UIDs are sparse, so a mailbox with UIDs up to 1306 yielded only 12 messages. The window is now the newest 200 messages by sequence number; cursors are versioned (`v2:`) so mailboxes synced earlier re-read the window once (ingestion deduplicates).

**Acceptance criteria:**
- [x] First sync selects the newest 200 messages by position.
- [x] A pre-v2 cursor triggers one re-import; later syncs continue by UID.
- [x] Imported history does not produce Telegram alerts (only mail received within 24 hours is announced).

## Verification Plan

- [x] Focused client/server tests.
- [x] `npm run ci` or exact documented blockers.
- [x] Code review and secret scan.
- [ ] Browser QA when browser tooling is available (blocked: automation browser cannot open the local client).

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Remote deletion partially succeeds | High | Delete locally only after all providers confirm; retain local record on any failure. |
| Pagination duplicates or loses rows | Medium | Append by id, reset on filters, use server total as completion signal. |
| Telegram leaks personal data | High | Do not send message bodies, credentials, or raw provider errors. |
| Telegram outage blocks mail | High | Best-effort notifier with contained logging. |

## Open Questions

- Confirm the initial Telegram event allowlist: new inbound email and email-sync failure.
