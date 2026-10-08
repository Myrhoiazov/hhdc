# Choreographer Management V2.1 — Implementation Progress

Specification: [choreographer-management-v2.1-agent-spec.md](../choreographer-management-v2.1-agent-spec.md). Audit: [repository-audit.md](repository-audit.md).

## Phase 0 — Audit — done (2026-10-08)

`repository-audit.md`: reuse map, missing capabilities, migration plan, open decisions. No blocking model conflict.
The other planning documents listed in section 20 of the specification are not written yet.

## Phase 1 — Profile foundation — done (2026-10-08)

**Migration** `20261008090000_choreographer_profile_v2_1` (additive): new profile columns, enum `ChoreographerRelationshipStatus`,
index on status, idempotent backfill of a profile for every person with the `CHOREOGRAPHER` role, legacy `bio` copied to `bioFull`.

**Server** (`server/src/modules/choreographers/`)
- `profile.schemas.ts`, `profile.summary.ts`, `profile.service.ts`, `profile.routes.ts`
- `GET /choreographers` (search, relationship filter, pagination), `POST /choreographers` (from an existing person, idempotent, adds the role),
  `GET /choreographers/:personId`, `PATCH /choreographers/:personId`
- Permissions `choreographers.read`, `choreographers.create`, `choreographers.update` added to the seed
- Profile changes write `Activity` (field names) and `AuditLog` (before/after values)

**Client** (`client/src/pages/CrmPage/ui/choreographers/`)
- List at `/people/choreographers`, profile at `/people/choreographers/:id[/:tab]`, menu entry gated by `choreographers.read`
- Header with summary chips; tabs Overview and Biography (edit form with the update permission, read-only otherwise)

**Tests**: `profile.test.ts` (5), `ChoreographerPages.test.tsx` (5). Server and client suites pass.

**Known limits**
- Verified with automated tests and a read query against the dev database; not walked through in a browser.
- Styles and languages are validated string lists on the profile, not a lookup table.
- The legacy `GET/PUT /choreographers/profile/:personId` endpoints are untouched.
- Finance chips in the header and the other eight tabs belong to later phases.

## Phase 2 — Biography, contacts, media — done (2026-10-08)

Decisions taken: files live on a private local volume behind a `StorageProvider` interface; `sharp` renders the variants.

**Migration** `20261008120000_choreographer_content_v2_1` (additive): `StorageObject`, `ChoreographerMedia`, `ChoreographerContact`,
`ChoreographerBioVersion`, three enums, and two partial unique indexes written in SQL (one cover per person, one current
biography version per language and kind).

**Storage** (`server/src/common/storage/`)
- `storage.ts`: `StorageProvider`, local implementation rooted at `STORAGE_ROOT` (default `private-uploads`, already a volume in the
  production compose file and gitignored). Keys are generated server-side and validated against path traversal.
- `image.ts`: format detected from file signature, decoded with `sharp`, 10 MB and 12 000 px limits; a 1600 px display variant and a
  400 px thumbnail, both WebP without metadata. The original is kept privately. SVG is not accepted.

**Server** (`server/src/modules/choreographers/`)
- `media.service.ts`, `media.rules.ts`: upload, list, reorder, set cover, rights status, soft delete, authenticated file endpoint.
  The ten-photo cap is enforced inside a transaction under a per-person advisory lock; files of a failed upload are removed.
  The original variant needs `choreographers.media.manage`.
- `contacts.service.ts`: additional contacts with kind, primary flag, validity period; delete deactivates and keeps the record.
- `bio.service.ts`: immutable biography versions per language and kind (SHORT / FULL / PROMO), plain text only.
- `content.routes.ts`; permissions `choreographers.contacts.read`, `choreographers.contacts.manage`, `choreographers.media.manage`.

**Client** (`client/src/pages/CrmPage/ui/choreographers/`)
- Tabs Photos (`MediaTab.tsx`), Contacts (`ContactsTab.tsx`) and biography variants (`BioVersions.tsx`); tabs are listed by permission.

**Tests**: `storage.test.ts` (4), `content.test.ts` (7), `ChoreographerPages.test.tsx` (12).
**Checked against the dev database and storage**: twelve concurrent uploads for one choreographer → ten stored, two rejected with
`MEDIA_LIMIT_REACHED`, exactly one cover, thirty storage objects (no orphans); removing the cover promotes the next photo. The
temporary person and files were removed afterwards.

**Known limits**
- Not walked through in a browser.
- Reordering uses earlier/later buttons; drag-and-drop works for upload only.
- Replacing a photo means removing it and uploading a new one; there is no in-place replace.
- Soft-deleted photos keep their files: no storage cleanup job exists yet.
- No malware scan; contacts are not linked to mail threads yet (Phase 6).

## Phase 3 — Event history — done (2026-10-08)

No migration: `EventChoreographer` is reused as it is (stable id, unique event + person).

**Server**: `history.rules.ts`, `history.service.ts`; `GET/POST /choreographers/:personId/events`, `PATCH /choreographers/:personId/events/:assignmentId`;
permission `choreographers.events.manage`.
- A duplicate assignment to the same event answers 409 `ALREADY_ASSIGNED`; an assignment id from another profile is not found.
- Confirming emits the existing `choreographer.confirmed` domain event, so automations keep working.
- Someone who got the role through the event page (role, no profile) now gets a profile the first time they are opened.

**Client**: tab Events & History grouped by year (`EventsTab.tsx`); add to event (past editions included), status / travel / hotel
edited in place; the event page links each choreographer to this tab — both screens show the same assignment row.

**Tests**: `history.test.ts` (3) plus page tests.
**Checked against the dev database** with temporary data: two events in two years, duplicate blocked, foreign assignment rejected,
history and header summary correct. Temporary data removed.

**Known limits**: no per-assignment detail drawer; the fee column in this tab is left to the Finance tab; no merge tool for legacy
duplicate assignments (the unique index already prevents them).

## Phase 4 — Finance history — done (2026-10-08)

Decision applied (audit item 4): `ChoreographerCost` stays the expense table and is extended; no second expense ledger.

**Migration** `20261008150000_choreographer_finance_v2_1` (additive): `ChoreographerFeeAgreement`, `ChoreographerPaymentRecord`, five enums,
expense columns on `ChoreographerCost` (estimated / actual amount, paid by, reimbursable, date), a partial unique index
(one AGREED fee per assignment), amount check constraints, and an idempotent backfill of existing cost rows.

**Server**: `finance.rules.ts` (pure), `finance.service.ts`, `finance.routes.ts`
- `GET /choreographers/:personId/finance` — per assignment and per year, **one totals block per currency**; 403 without `choreographers.finance.read`.
- `POST /choreographer-assignments/:assignmentId/fee-agreements | expenses | payments`, cancel endpoints, `POST …/payments/:id/status`.
- Fee rows are immutable: a new agreed fee marks the previous one SUPERSEDED. Expenses are corrected in place with before/after in the audit log.
  Payment amounts are fixed; only the status moves, forward only.
- Confirming a payment (or cancelling a confirmed one) needs `choreographers.payments.confirm`. Writes use the already seeded `choreographers.finance.write`.
- Activity entries never contain amounts; the audit log does.
- The event financial overview now also counts agreed fees as an estimated FEE cost; the legacy cost endpoints were moved from `events.*` to the finance permissions.

**Client**: tab Finance (`FinanceTab.tsx`) — yearly and per-event totals, negotiation history, expenses, payments, three record forms.

**Tests**: `finance.test.ts` (9, including the 2026 example of specification section 12) plus page tests.
**Checked against the dev database** with temporary data: offers 2000 → 2700 → agreed 2400 → agreed 2500 leaves one AGREED and one SUPERSEDED;
totals match the specification example; confirmation without the permission is refused; a confirmed payment cannot go back to pending.

**Known limits**
- Not walked through in a browser.
- Payments are not linked to invoices yet (Phase 5); no FX conversion — currencies are only shown side by side.
- Expenses cannot be edited from the UI yet (record and cancel only); the API supports correction.
- The event overview still adds amounts of different currencies together — that behaviour predates this module.

## Phase 5 — Contracts, invoices and files — done (2026-10-08)

The existing `Document` model is reused: a file document is owned through `entityType = "Person"` + `entityId`, with the event and the
assignment as optional context. No second document table.

**Migration** `20261008180000_choreographer_documents_v2_1` (additive): `DocumentVersion`, `Contract`, `Invoice`, enums `ContractStatus` and
`InvoiceStatus`, new `DocumentType` values RIDER / TRAVEL / HOTEL, context and archive columns on `Document`.

**Server**
- `common/storage/document-file.ts`: PDF, DOCX and images recognised by file signature (a renamed executable or a plain ZIP is refused), 20 MB limit, safe file names.
- `modules/documents/document.rules.ts`, `document-files.service.ts`, `document-files.routes.ts`:
  `GET/POST /choreographers/:personId/documents`, `GET /documents/by-event/:eventId`, `GET /documents/:id/file`, `POST /documents/:id/versions`,
  `PATCH /documents/:id/metadata`, `GET /documents/:id/download[?version=n]`.
- Replacing a file adds a version; earlier versions stay downloadable. Archiving hides a document from lists without destroying it.
- An assignment can be linked only if it belongs to the same choreographer; the event is taken from the assignment.
- Contracts and invoices are visible and downloadable only with `documents.sensitive.read`; without it they answer 404. Every download of one is written to the audit log.
- **Invoice status is not payment truth**: the API returns `paymentEvidence` (NONE / PARTIAL / PAID from confirmed payment records linked to the invoice,
  MANUAL when a paid label was set by hand). A payment record can reference an invoice of the same choreographer.
- Duplicate `(issuer, number)` invoices produce a warning, not an error.
- Downloads are served with `nosniff`, a sandboxing CSP and `attachment` for anything that is not a PDF or an image. Storage keys never leave the server.
- Permissions: the already seeded `documents.read`, `documents.sensitive.read`, `documents.write` are used instead of new `choreographers.documents.*` keys.
  The legacy metadata routes under `/documents` moved from `events.*` to these permissions.

**Client**: tab Documents (`DocumentsTab.tsx`) — list, open, earlier versions, new version, status, archive, upload form with invoice fields;
`EventDocuments.tsx` on the event page lists the same documents and links back to the profile.

**Tests**: `document-files.test.ts` (6) plus page tests.
**Checked against the dev database and storage** with temporary data: versions 1 and 2 both readable; a contract is invisible and not downloadable
without the sensitive permission; a foreign assignment and a disguised executable are refused with no file left behind; invoice evidence moves
NONE → PARTIAL → PAID only as linked payments are confirmed; the event lists the same document ids. Temporary data and files removed.

**Known limits**
- Not walked through in a browser.
- Files open in a new browser tab; there is no embedded preview pane.
- Payments are linked to an invoice through the API; the payment form has no invoice picker yet.
- No malware scan, no retention job, no per-document sharing; archived documents are not listed in the UI.
- Contract and invoice dates (expiry, issue, due) are stored but not editable from the UI yet.

## Phase 6 — Emails and relationship timeline — done (2026-10-08)

Mail is not copied anywhere: the Emails tab reads `Conversation` and `Message`.

**Migration** `20261008210000_choreographer_conversation_links_v2_1` (additive): `ChoreographerConversationLink` with a reason, a note,
who linked it, and soft removal; a partial unique index allows one active link per conversation and choreographer.

**Server** (`relations.rules.ts`, `relations.service.ts`, routes in `content.routes.ts`)
- `GET /choreographers/:personId/conversations` — the person's own threads plus explicitly linked ones, each with `provenance`
  (`direct_person_email` or `manual_link`), a preview of the latest message, search and pagination.
- `POST` / `DELETE /choreographers/:personId/conversations/:conversationId/link` — both need a written reason and are audited.
  Linking does not change the conversation; unlinking keeps the row as history.
- **No automatic linking.** A manager, agent or agency address never links or even suggests a thread. Threads sent from the
  choreographer's own secondary address are offered as candidates only; showing one still takes an explicit link.
- `GET /choreographers/:personId/activity` — keyset-paged timeline with a type filter. Finance entries need
  `choreographers.finance.read`, document entries need `documents.read`; raw metadata is not returned.
- New permissions: `choreographers.conversations.read`, `choreographers.conversations.link`, `choreographers.activity.read`.

**Client**: tabs Emails (`EmailsTab.tsx`) and Activity (`ActivityTab.tsx`).

**Checked against the dev database**: two choreographers sharing one manager address — the manager's thread appears on neither
profile; after an explicit link it appears on that one profile only; after unlinking it disappears while the conversation and the link
history stay. A thread from an own secondary address is offered as a candidate and not shown.

**Known limits**: reading and replying happens in the Email workspace (the tab links there, without opening the exact thread);
`PROVIDER_REFERENCE` links are modelled but nothing creates them; unlinking asks for the reason in a browser prompt.

## Phase 7 — Notes, tasks and reminders — done (2026-10-08)

**Migration** `20261009090000_choreographer_notes_v2_1` (additive): `ChoreographerNote` (pinned flag, soft delete), `Task.reminderSentAt`,
index on `Task.personId`.

**Server** (`followup.rules.ts`, `followup.service.ts`)
- Notes: `GET/POST /choreographers/:personId/notes`, `PATCH/DELETE …/notes/:noteId`. Pinned first. Removing keeps the row.
  The audit log records who wrote or removed a note, never its text. Notes do not appear in the activity timeline.
- Tasks: the existing `Task` model is reused with `personId`; `GET/POST /choreographers/:personId/tasks`. The same tasks appear in Operations.
- Reminders: the worker checks every 15 minutes and writes one in-app `Notification` per open task that is due within 24 hours or
  overdue, to the assignee (or the creator). Each task is claimed before the notification is written, so overlapping sweeps cannot
  remind twice. Reminders go to staff only.
- New permissions: `choreographers.notes.read`, `choreographers.notes.manage` (tasks use the existing `tasks.read` / `tasks.write`).

**Client**: tab Notes and follow-ups (`NotesTab.tsx`).

**Checked against the dev database**: pinned ordering, a note cannot be edited through another choreographer's id, removal keeps the row,
no note text in the audit log, two overlapping reminder sweeps plus a third produce exactly one notification.

**Known limits**: a note can be pinned and removed but its text is not editable from the UI (the API allows it); a task is assigned to
whoever creates it — there is no assignee picker; a changed due date does not re-arm the reminder; reminders are in-app only.

## Phase 8 — Hardening — partly done (2026-10-08)

Done:
- **Permission audit.** `route-guards.test.ts` fails if any choreographer, assignment or document endpoint (40 on the main router,
  nested routers included) does not start with the permission guard.
- **Privacy fix found by the audit.** The general `GET /people/:id/timeline` returned choreographer finance and document activity to
  anyone with `people.read`. It now applies the same filter as the choreographer timeline, for the page and for the count.
- **Seed roles.** SUPPORT reads linked mail and the timeline; VIEWER does not get internal notes, finance or sensitive documents.
  The dev database roles were aligned by hand (additively); the seed itself was not re-run.
- **Migration chain.** All migrations were applied to an empty throwaway database and compared with the Prisma schema: no drift.
- **Upload security.** Signature checks, size limits and "no orphan file" are covered by `storage.test.ts`, `document-files.test.ts`
  and the live checks of Phases 2 and 5.
- **Quality gate.** Per-file Skylos on the new files: no function-level findings. `npm run check:skylos` itself still fails on its own
  script error (`DIFF_ARGS[@]: unbound variable`), which predates this work.

Not done:
- Browser walk-through (desktop and mobile, light and dark) and Playwright specs for the new screens.
- Migration rehearsal on a populated copy of real data, backup/restore and deployment smoke tests.
- Load check on a long history (lists are capped and indexed, but not measured).
- Malware scanning of uploads and a retention policy.
- Release notes and a rollout plan.

## Demonstration data

`server/prisma/seed-choreographers-demo.ts` fills the module with fictional data so every tab can be seen without a mailbox
connection: conversations are written straight into the database, nothing is fetched or sent.

```bash
# inside the backend container (the files go to its private storage)
docker exec -e SEED_DEMO=true hhdc-backend-dev npm run seed:choreographers-demo
docker exec -e SEED_DEMO=true hhdc-backend-dev npm run seed:choreographers-demo:reset
```

- Creates three events (2025, 2026, 2027), four choreographers and a shared agency manager, all under `@demo.hhdc.test`.
- Every record is validated by the same schema and written by the same service as a request from the UI; photos and PDFs are generated.
- Refuses to run in production or without `SEED_DEMO=true`; does nothing if the data is already there.
- The reset removes the people, events, conversations, tasks, files and activity it created. Audit log rows are kept.
