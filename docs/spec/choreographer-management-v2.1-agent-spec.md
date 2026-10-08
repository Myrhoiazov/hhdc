# Choreographer Management V2.1 — Implementation Plan & Coding Agent Specification

**Project:** Event & Talent CRM  
**Status:** Ready for repository discovery and incremental implementation  
**Language:** Russian (technical identifiers in English)  
**Database:** PostgreSQL + Prisma; existing V1 architecture remains authoritative  
**Scope:** Internal backoffice only — no choreographer/customer login  
**Version:** 2.1

> **IMPORTANT:** V1 is already under active development. This specification extends it. Do not rewrite V1, do not assume unverified repository structure, do not reset databases, and do not duplicate existing domain models. Read actual source code, Prisma schema, migrations, and V1/V2 documents before making changes.

---

# 0. Purpose and product boundaries

Build a complete internal **Choreographer 360°** workspace: professional profile, biography, up to ten photographs, multiple contacts and managers, participation history across events/years, fee negotiations and financial history, contracts and invoices, correspondence, files, notes, tasks, reminders and activity timeline.

- `User` = authenticated internal staff, subject to RBAC.
- `Person` = external person being tracked; **never** receives a CRM account.
- `ChoreographerProfile` extends a `Person` with `CHOREOGRAPHER` role.
- Existing `Event`, `EventChoreographer`, `Conversation`, `Message`, `Activity`, `AuditLog`, `ProviderConnection` remain canonical.
- All uploads and actions happen through authenticated staff UI or trusted backend integrations.
- Do not implement a public portal, public profile editing, ticket checkout, contract signing inside CRM, or automated payment execution.
- External contract signatures, emails and payments are handled by external providers and tracked internally.

# 1. Success criteria / user stories

As an authorized manager, I can:

1. Open a choreographer's unified internal profile from People → Choreographers.
2. Create a profile from an existing `Person` without duplicating the person; add `CHOREOGRAPHER` role.
3. Record stage name, legal name where appropriate, biography, styles, countries, languages, social media, portfolio and operational preferences.
4. Upload/reorder/replace/delete up to **10 active photos**, designate a cover and set media-usage consent/rights notes.
5. Maintain multiple emails, phones and social links, including manager, agent, assistant and billing contact.
6. Attach a choreographer to any existing or historic event; view timeline grouped by year, with role, sessions, status and fee.
7. Record offer → negotiation → agreed fee, currency, scope, change history and responsible staff member.
8. Record planned/actual expenses, advances and confirmed payments **separately**.
9. Upload contracts, invoices, riders and supporting files; preview/download; categorize and link to event/assignment; preserve versions.
10. Link Gmail correspondence to the choreographer safely and view it chronologically without copying messages.
11. Add internal notes, follow-up tasks and reminders.
12. Search/filter/sort choreographers and find previous collaborators.
13. View a permission-filtered activity timeline and audit sensitive changes.
14. Access the same linked contract/invoice from choreographer and event views without duplicating storage.
15. See truthful loading/empty/error states; work on mobile/tablet for staff use.

# 2. Explicit exclusions

Not part of this implementation:
- Customer, participant, choreographer authentication or portals.
- Public biography website publishing.
- Built-in e-signature provider.
- Full accounting, tax reporting, bank reconciliation or payroll.
- Automated refunds, payouts or autonomous AI writes.
- New mail sync implementation if V1 already owns it; only integrate existing mail.
- Replacing `Person`, `Event`, `Conversation`, `Message` or V1 provider adapters.
- General-purpose workflow designer or full V2 automation engine.
- Assuming Google Drive/Mollie integration is ready without code evidence.

# 3. Mandatory discovery before coding — Phase 0

Inspect and document:
- Repository layout, package versions, TypeScript config, FSD conventions, backend module boundaries.
- Current Prisma schema, migrations, indexes, `Person`, `PersonRole`, `Event`, `EventChoreographer`, `Conversation`, `Message`, `Activity`, `AuditLog`, `Document` (if any), `Task` (if any), RBAC.
- Current file storage mechanism, secrets handling, upload limits and any signed URL infrastructure.
- Email ingestion/matching/linking behavior and OAuth/provider constraints.
- Existing event management, UI components, i18n, data-fetching, test setup.
- Whether V2 has already added `ChoreographerProfile`, `ChoreographerCost`, `Contract`, `Document`, `Payment` or other overlapping models.
- Current production deployment/backups and data volumes.

**Deliver first:** `docs/spec/choreographer-v2.1/repository-audit.md` with (a) reuse map, (b) missing capabilities, (c) actual migration plan, (d) implementation order, (e) risks/questions. Stop and ask if a blocking domain decision cannot be resolved safely.

**Never invent repository facts.** Treat schema names below as logical target names, not instructions to create duplicates.

# 4. Navigation and information architecture

Main menu:

```text
People
├── All Contacts
├── Participants
└── Choreographers
    ├── List
    └── [Choreographer Profile]
```

Profile header:
- Cover/avatar, stage name, legal name (restricted), location, styles, relationship status.
- Quick actions: Edit, Add to Event, Add Contact, Upload Document, Add Note, Create Task, Link Conversation.
- Summary chips: total event assignments, last event year, upcoming event, open tasks, financial summary (only if permitted).

Profile tabs:

```text
Overview
Biography
Media
Contacts
Events & History
Finance
Emails
Documents
Notes & Tasks
Activity
```

Show/hide tabs by permission, not only CSS. Unauthorized API access must be rejected server-side.

# 5. UI/UX details by tab

## 5.1 Overview
- Profile summary, upcoming/past events, most recent communication, next task, contract alerts.
- Latest changes timeline, quick edit, incomplete-profile checklist.
- Financial cards only with `choreographers.finance.read`.
- No misleading combined money totals across currencies.

## 5.2 Biography
- Stage name, display name, pronouns optional only if business-required, home country/city, time zone.
- Styles (normalized tags), spoken languages, biography short/full, experience/achievements.
- Instagram, TikTok, YouTube, website, portfolio links with URL validation.
- Optional multi-language biography variants (`locale`, `kind`, `content`, `version`).
- `updatedBy`, `updatedAt`; rich text sanitized; never store arbitrary HTML from untrusted sources.
- Distinguish internal notes from approved promotional biography.

## 5.3 Media
- Up to **10 active images per choreographer** (not per event).
- Accepted MIME: JPEG, PNG, WebP; validate MIME and magic bytes, size (configurable; initial default 10 MB each), pixel dimensions.
- Server-generated thumbnails and optimized display images; preserve original privately.
- Drag-and-drop upload and reorder, designate one cover, captions/credit, rights/consent notes.
- Replace media via new version/object; delete = soft delete metadata + scheduled safe storage cleanup.
- Concurrency-safe cap enforced in backend transaction/lock; UI cap is insufficient.
- Forbid SVG uploads unless a secure sanitizer and threat model exist.
- EXIF metadata stripped from display variants; never leak location metadata.

## 5.4 Contacts
- `Person` primary contact remains canonical.
- Additional contacts: manager/agent/assistant/accounting/other; name, organization, role, email, phone, preferred channel, locale, primary flag, notes.
- Distinguish choreographer's own secondary addresses from a third party's email.
- Optional relationship to existing `Person` when known; do not force new Person for every agent.
- Contact validity period and active/inactive; avoid overwriting historic agent contacts.
- Never auto-link manager email threads to multiple choreographers solely on matching sender email.

## 5.5 Events & History
- All assignments across events and years, ordered by `Event.startAt` (not a manually typed year).
- Columns: event, year, dates, role, invitation/confirmation status, sessions, agreement status, fee currency/amount (permission-gated), documents.
- Link existing `EventChoreographer` (unique `(eventId, personId)` if domain permits single assignment; otherwise explicit assignment ID).
- Support historical backfill by linking existing events or creating an event record via existing Events module.
- No duplicate event assignment; provide merge/resolve for legacy records.
- Detail drawer per assignment with notes, travel/hospitality, contract, finances, sessions and activity.

## 5.6 Finance
- Summary **per event assignment and currency**, plus yearly grouping.
- Separate **fee offers**, **agreed fee**, **cost estimates**, **actual expenses**, **invoices**, **payment records**.
- Totals: agreed fees, actual expenses, confirmed payments, outstanding amount; each has documented semantics.
- Never infer payment status from invoice upload.
- Amounts are `Decimal`, not floating point. Currency ISO 4217.
- If multiple currencies: display separate subtotals; optional FX reporting requires dated rates and explicit conversion.
- Record who changed a fee, previous/new values, reason, date.
- Expense types: travel, hotel, per diem, transfer, equipment, other.
- Distinguish expense borne by organizer vs reimbursable to choreographer.
- Payment status only updated by authorized staff or verified provider event; no auto-disbursement.

## 5.7 Emails
- Reuse existing `Conversation` and `Message`; never copy mail bodies into choreographer-specific tables.
- Show date, sender, recipients, subject, event association, message preview, attachments where supported.
- Match own verified email addresses deterministically; shared manager/agency emails must be explicitly linked.
- Provide `Link conversation` / `Unlink conversation` with audit and reason.
- Show provenance: `direct_person_email`, `manual_link`, `event_assignment_context`; avoid silently inferring links from name similarity.
- Do not auto-link an email thread merely because the same manager represents multiple people.
- Existing AI draft and human approval workflow remains unchanged.
- Optional AI summary is read-only and cites underlying messages; never invent agreements.

## 5.8 Documents
- Upload PDF, JPG/PNG/WebP and DOCX; validate content type and file signature.
- Type: CONTRACT, INVOICE, RIDER, TRAVEL, HOTEL, OTHER.
- Link to `Person`, optionally `Event` and `EventChoreographer`, and optional financial record.
- Staff-only upload, view, download, replace (versioned), archive.
- Metadata: title, original filename, document type, issue date, due date, effective dates, currency, amount (where applicable), counterparty, notes, uploadedBy, createdAt.
- Contract statuses: DRAFT, READY, SENT, SIGNED, EXPIRED, CANCELLED.
- Invoice statuses: RECEIVED, REVIEWED, APPROVED, PARTIALLY_PAID, PAID, CANCELLED, DISPUTED.
- **Document status is not payment truth.** Invoice paid label must be derived from/confirmed against payment allocations or explicitly marked manual.
- Preview via authenticated endpoint / short-lived signed URL, never public bucket ACL.
- Maintain version history and audit access to sensitive documents.
- Link to the same `Document` in Event and Choreographer UI; do not upload copies.

## 5.9 Notes & Tasks
- Notes: internal-only, createdBy, updatedBy, timestamps, pinned flag, optional event/assignment context.
- Tasks: title, owner, dueAt, priority, status, relation to person and optional event; reuse V2 `Task` if present.
- Examples: request updated photos, confirm fee, send contract, follow up on invoice, confirm travel.
- Reminders are staff-facing; no external choreographer notifications by default.

## 5.10 Activity
- Chronological view of profile edits, event assignments, fee changes, uploads, contract statuses, manual email linking, notes/tasks.
- `Activity` is user-friendly; `AuditLog` is immutable compliance/security log.
- No sensitive financial details in activity for unauthorized roles.
- Filters by type and event; paginated.

# 6. Data model — logical design

**Adapt to actual Prisma models. Do not create overlapping models if V1/V2 already provides equivalent concepts.**

## 6.1 `ChoreographerProfile`
- `personId UUID PK/FK Person` (1:1)
- `stageName String?`
- `bioShort String?`, `bioFull String?`
- `countryCode String?`, `city String?`, `timezone String?`
- `relationshipStatus Enum` (NEW, CONTACTED, NEGOTIATING, ACTIVE, RETURNING, INACTIVE, DO_NOT_CONTACT)
- `websiteUrl String?`, `instagramUrl String?`, `tiktokUrl String?`, `youtubeUrl String?`
- `createdAt`, `updatedAt`, `updatedById?`
- styles/languages via existing tag/lookup design, not comma-separated unvalidated strings.

## 6.2 `ChoreographerBioVersion`
- `id UUID PK`, `personId FK`, `locale`, `kind` (SHORT/FULL/PROMO)
- `content Text`, `version Int`, `isCurrent Boolean`
- `createdById`, `createdAt`
- Unique current version per `(personId, locale, kind)` via partial unique index/raw SQL migration if necessary.

## 6.3 `ChoreographerMedia`
- `id UUID PK`, `personId FK`, `documentId? FK` or `storageObjectId FK`
- `position Int`, `isCover Boolean`, `caption?`, `credit?`
- `rightsStatus Enum` (UNKNOWN, PERMITTED, RESTRICTED)
- `rightsNotes?`, `createdById`, `createdAt`, `deletedAt?`
- At most 10 non-deleted rows per person, enforced atomically in application transaction; unique cover via partial index where possible.
- Storage object metadata remains in shared storage module.

## 6.4 `ChoreographerContact`
- `id UUID PK`, `personId FK` (represented choreographer)
- `contactPersonId? FK Person` (optional manager as canonical person)
- `kind Enum` (SELF_SECONDARY, MANAGER, AGENT, ASSISTANT, ACCOUNTING, OTHER)
- `name?`, `organization?`, `email?`, `phone?`, `locale?`
- `isPrimary Boolean`, `isActive Boolean`, `validFrom?`, `validTo?`, `notes?`
- `createdAt`, `updatedAt`
- Index `(personId, kind, isActive)`; normalized email for matching with explicit provenance.

## 6.5 `EventChoreographer`
- **Reuse existing** assignment model.
- Ensure stable assignment ID and FK to `Person` and `Event`.
- Add only missing fields: role, status, negotiation/travel/hotel/contract statuses, timestamps.
- Do not put changing historical fee in a single profile-level field.

## 6.6 `ChoreographerFeeAgreement`
- `id UUID PK`, `assignmentId FK EventChoreographer`
- `status Enum` (PROPOSED, COUNTERED, AGREED, SUPERSEDED, CANCELLED)
- `amount Decimal(12,2)`, `currency Char(3)`, `feeBasis` (EVENT/SESSION/DAY/OTHER)
- `scopeDescription?`, `effectiveAt?`, `agreedAt?`
- `notes?`, `createdById`, `createdAt`, `supersedesAgreementId?`
- Immutable agreement revisions preferred; do not overwrite historical offers.
- At most one current agreed agreement per assignment unless explicitly supporting fee components.

## 6.7 `ChoreographerExpense`
- `id UUID PK`, `assignmentId FK`
- `category Enum`, `description`, `estimatedAmount? Decimal`, `actualAmount? Decimal`
- `currency Char(3)`, `paidBy` (ORGANIZER/CHOREOGRAPHER/OTHER)
- `reimbursable Boolean`, `status`, `expenseDate?`, `documentId?`
- `createdById`, `createdAt`, `updatedAt`

## 6.8 `ChoreographerPaymentRecord`
- `id UUID PK`, `assignmentId FK`, `agreementId? FK`
- `amount Decimal`, `currency`, `type` (ADVANCE/FEE/REIMBURSEMENT/OTHER)
- `status` (PLANNED/PENDING/CONFIRMED/FAILED/CANCELLED)
- `paymentDate?`, `reference?`, `providerPaymentId?`, `invoiceId?`
- `recordedById`, `createdAt`
- If existing `Payment` domain is ready, extend/reuse it and avoid double ledger.
- Payment records are not bank transfers; V2.1 only tracks them.

## 6.9 Shared `Document`, `DocumentVersion`, `Contract`, `Invoice`
Prefer reusing V2 models if implemented.

**Document**
- `id`, `ownerPersonId`, `eventId?`, `assignmentId?`, `type`, `title`
- `storageObjectId` / `storageKey`, `mimeType`, `size`, `checksum`
- `status`, `createdById`, `createdAt`, `updatedAt`, `deletedAt?`

**DocumentVersion**
- `id`, `documentId`, `version`, `storageObjectId`, `checksum`, `uploadedById`, `createdAt`
- Unique `(documentId, version)`.

**Contract**
- `id`, `documentId`, `assignmentId?`, `status`, `sentAt?`, `signedAt?`, `expiresAt?`

**Invoice**
- `id`, `documentId`, `assignmentId?`, `invoiceNumber?`, `issuerName?`
- `issueDate?`, `dueDate?`, `amount? Decimal`, `currency?`, `status`
- If actual payment allocations are needed, model `InvoicePaymentAllocation` rather than guessing `PAID`.

**Important:** If a shared `Document` model already exists, implement relationship/link table where needed instead of adding incompatible ownership columns.

## 6.10 `ChoreographerNote`
- `id`, `personId`, `assignmentId?`, `content`, `isPinned`
- `createdById`, `updatedById?`, `createdAt`, `updatedAt`, `deletedAt?`

## 6.11 `ChoreographerConversationLink`
Only if existing `Conversation.personId` cannot represent multiple explicit relationships:
- `id`, `conversationId`, `personId`, `assignmentId?`
- `linkReason` (DIRECT_EMAIL/MANUAL/PROVIDER_REFERENCE)
- `createdById?`, `createdAt`, `removedAt?`
- Unique active link `(conversationId, personId)`; no implicit shared-agent auto-link.

## 6.12 Storage objects
- Use shared storage abstraction (`StorageProvider`) and metadata, not `bytea` file blobs.
- `StorageObject` fields: `id`, `provider`, `key`, `originalFilename`, `mimeType`, `bytes`, `sha256`, `createdAt`.
- Keep private by default; prevent path traversal and unsafe direct key access.

# 7. Domain ownership and boundaries

```text
people
 ├── Person (existing)
 └── ChoreographerProfile + Contacts + Bio + Media

events
 └── Event + EventChoreographer (existing canonical assignment)

talent-finance
 └── FeeAgreement + Expense + PaymentRecord
     (or reuse existing finance module)

documents
 └── Document + Versions + Contract + Invoice + Storage

communications
 └── Conversation + Message + explicit links

tasks
 └── Task (reuse) / notes

activity
 └── Activity + AuditLog
```

Cross-module access through application services/interfaces, not direct imports of unrelated repositories across boundaries. Do not call external providers inside DB transactions.

# 8. PostgreSQL migration strategy

1. Snapshot current schema/migration state.
2. Prepare **additive migrations**: new tables and nullable columns first.
3. Backfill choreographer profiles for existing `Person` with CHOREOGRAPHER role (idempotent).
4. Link existing `EventChoreographer` assignments; do not regenerate IDs.
5. Reuse/migrate existing document references with checksum/provenance if present.
6. Add constraints and indexes after backfill/validation.
7. Verify old V1 APIs and screens remain functional.
8. Provide rollback guidance; no `prisma db push` on production, no destructive reset.
9. Migration must handle empty database and populated legacy database.
10. For partial unique indexes, checks, `pg_trgm` or other unsupported Prisma constructs, add reviewed SQL migration.

Suggested indexes:
- `ChoreographerProfile(relationshipStatus)`
- `ChoreographerMedia(personId, deletedAt, position)`
- `ChoreographerContact(personId, isActive)`
- `EventChoreographer(personId, eventId)`
- `ChoreographerFeeAgreement(assignmentId, createdAt DESC)`
- `ChoreographerExpense(assignmentId, expenseDate)`
- `ChoreographerPaymentRecord(assignmentId, status, paymentDate)`
- `Document(ownerPersonId, eventId, assignmentId, type)`
- `ChoreographerConversationLink(personId, removedAt)`
- FTS/trigram indexes only where measured/justified.

# 9. API contract (adapt to existing `/api/v1` conventions)

All endpoints require internal authentication and appropriate RBAC. Paginate collections, validate with existing validation library, standardize errors and optimistic concurrency where useful.

```http
GET    /api/v1/choreographers
POST   /api/v1/choreographers
GET    /api/v1/choreographers/:personId
PATCH  /api/v1/choreographers/:personId

GET    /api/v1/choreographers/:personId/biographies
POST   /api/v1/choreographers/:personId/biographies

GET    /api/v1/choreographers/:personId/media
POST   /api/v1/choreographers/:personId/media
PATCH  /api/v1/choreographers/:personId/media/reorder
PATCH  /api/v1/choreographers/:personId/media/:mediaId
DELETE /api/v1/choreographers/:personId/media/:mediaId

GET    /api/v1/choreographers/:personId/contacts
POST   /api/v1/choreographers/:personId/contacts
PATCH  /api/v1/choreographers/:personId/contacts/:contactId
DELETE /api/v1/choreographers/:personId/contacts/:contactId

GET    /api/v1/choreographers/:personId/events
POST   /api/v1/events/:eventId/choreographers
PATCH  /api/v1/events/:eventId/choreographers/:assignmentId

GET    /api/v1/choreographers/:personId/finance
POST   /api/v1/choreographer-assignments/:assignmentId/fee-agreements
POST   /api/v1/choreographer-assignments/:assignmentId/expenses
POST   /api/v1/choreographer-assignments/:assignmentId/payments

GET    /api/v1/choreographers/:personId/documents
POST   /api/v1/choreographers/:personId/documents
GET    /api/v1/documents/:documentId
POST   /api/v1/documents/:documentId/versions
GET    /api/v1/documents/:documentId/download
PATCH  /api/v1/documents/:documentId/metadata

GET    /api/v1/choreographers/:personId/conversations
POST   /api/v1/choreographers/:personId/conversations/:conversationId/link
DELETE /api/v1/choreographers/:personId/conversations/:conversationId/link

GET    /api/v1/choreographers/:personId/notes
POST   /api/v1/choreographers/:personId/notes
GET    /api/v1/choreographers/:personId/tasks
GET    /api/v1/choreographers/:personId/activity
```

**API design rules**
- Validate `personId` exists and has CHOREOGRAPHER role.
- Validate event/assignment ownership and cross-entity consistency on every write.
- File upload: authenticated multipart or presigned private upload, capped size, malware scan where available, asynchronous preview.
- For each create/update/delete return canonical object and create activity/audit where required.
- `GET /finance` must return 403 for unauthorized user, not masked totals.
- Never expose storage keys or provider tokens.
- Use cursor pagination for long conversation/activity lists.
- Ensure event scoping if user access is limited to certain events.

# 10. RBAC permissions

```text
choreographers.read
choreographers.create
choreographers.update
choreographers.contacts.read
choreographers.contacts.manage
choreographers.media.manage
choreographers.events.manage

choreographers.finance.read
choreographers.finance.manage
choreographers.payments.confirm

choreographers.documents.read
choreographers.documents.sensitive.read
choreographers.documents.manage

choreographers.conversations.read
choreographers.conversations.link

choreographers.notes.read
choreographers.notes.manage
choreographers.activity.read
```

Map to actual V1 roles in a permission matrix. Use least privilege. Owner/admin may have broad permissions; support/event staff should not automatically see legal/financial documents.

# 11. Storage and document processing

## 11.1 Upload workflow
```text
Staff selects file
 → client validates size/type
 → server validates auth/RBAC, size, MIME + signature
 → store in private storage
 → insert StorageObject + Document/Version
 → enqueue preview/thumbnail/virus scan if available
 → show status and link on profile + event
 → write Activity/Audit
```

## 11.2 Safety
- Configurable max file size; initial default 20 MB/document.
- Reject executable payloads, path traversal, suspicious archives; avoid public direct bucket URLs.
- Content-Disposition `attachment` for unsafe types.
- PDF preview must be sandboxed/isolated; sanitize filenames.
- Download endpoints re-check permissions every time.
- Use short-lived signed URLs if supported.
- Failed DB transaction after upload triggers compensating cleanup.
- Deleted/archived document references are not silently destroyed when used in finance/audit.

## 11.3 Invoice metadata
- Manual entry first: invoice number, issuer, amount, currency, dates, linked assignment.
- AI/OCR extraction is future enhancement requiring review; never assume invoice content equals actual payment.
- Duplicate warning on `(issuer, invoiceNumber)` where available, not necessarily a global uniqueness rule.

# 12. Finance business rules and examples

**Example: one choreographer, two years**

```text
2025 / High Heels Dance Camp
  Agreed fee: EUR 1,500
  Estimated travel: EUR 300
  Actual travel: EUR 350
  Confirmed fee payment: EUR 1,500

2026 / High Heels Dance Camp
  First offer: EUR 2,000
  Counter-offer: EUR 2,700
  Final agreed fee: EUR 2,500
  Actual hotel: EUR 280
  Actual travel: EUR 400
  Advance paid: EUR 500
  Final payment confirmed: EUR 2,000
```

Derived metrics:
- `agreedFee = current AGREED agreement`, not sum of every offer.
- `actualExpenses = sum(actualAmount of applicable expenses)`.
- `confirmedPayments = sum(confirmed payment records)` with clear allocation.
- `outstandingFee = agreedFee - confirmed payments allocated to fee`, excluding reimbursements.
- `organizerTotalCost = agreedFee + organizer-borne actual expenses`, with clear rules for reimbursements and no double counting.
- Do not combine currencies without FX conversion.
- Historical values remain queryable; revisions are auditable.

# 13. Email linking — strict rules

1. Prefer existing direct `Conversation.personId` / `Message` relationships.
2. Exact verified personal email match may generate **candidate links**.
3. A shared manager email is never proof that the conversation belongs to a particular choreographer.
4. Allow manual link/unlink with staff identity, reason and audit.
5. A conversation may relate to multiple choreographers only through explicit relation records.
6. Keep event context separate from person identity.
7. UI shows linked messages and original source/provider metadata.
8. Do not send emails as part of this module; use existing V1 inbox workflow.
9. Optional AI-generated conversation summary requires authorization and references to actual messages.
10. If mail sync is unavailable, show graceful empty state and link configuration instructions for staff.

# 14. Frontend/FSD implementation

Discover actual FSD conventions first. Conceptual structure:

```text
src/
  entities/
    choreographer/
      model/
      api/
      ui/
    choreographer-assignment/
    choreographer-finance/
    document/
  features/
    edit-choreographer/
    manage-choreographer-media/
    manage-choreographer-contacts/
    link-choreographer-event/
    record-fee-agreement/
    record-expense/
    record-payment/
    upload-choreographer-document/
    link-choreographer-conversation/
    add-choreographer-note/
  widgets/
    choreographer-profile-header/
    choreographer-profile-tabs/
    choreographer-finance-history/
    choreographer-activity-timeline/
  pages/
    choreographers/
    choreographer-detail/
```

UI requirements:
- Responsive staff-only pages.
- Tabs route-addressable (`/people/choreographers/:id/finance`).
- Stable filters and pagination.
- Keyboard accessibility, accessible dialogs, meaningful empty states.
- Optimistic UI only where safe; financial changes confirm server response.
- Loading skeletons, retries, 403/404 handling, upload progress.
- No sensitive data in browser analytics or console logs.
- Localized labels consistent with existing project.

# 15. Phased implementation — execute in order

## Phase 0 — Audit & design approval
**Tasks**
1. Read V1/V2 specs and actual code.
2. Map reusable models/services.
3. Identify conflicts/overlap.
4. Write repository audit and ADRs.
5. Prepare migration map, permissions matrix and API DTOs.

**Exit:** reviewed plan with no unresolved blocking model conflicts.

## Phase 1 — Profile foundation
**Tasks**
1. Add/extend `ChoreographerProfile`.
2. Backfill existing choreographers.
3. Implement list and detail read APIs.
4. Implement create/update with RBAC.
5. Build Choreographers list, profile header and Overview.
6. Test existing Person flows.

**Exit:** staff can open/create/edit choreographer without duplicate Person.

## Phase 2 — Biography, contacts, media
**Tasks**
1. Add biography fields/versions.
2. Add contacts with manager/agent types.
3. Implement secure media storage and thumbnails.
4. Enforce 10 active images transactionally.
5. Implement cover, reorder, replace, remove.
6. Build Biography, Contacts and Media tabs.

**Exit:** profile content persists; media cap/rights/security tested.

## Phase 3 — Event history
**Tasks**
1. Reuse existing EventChoreographer relations.
2. Add assignment metadata only where missing.
3. Build Events & History tab grouped by year.
4. Implement Add to Event, avoid duplicates.
5. Backfill/attach historic collaborations.
6. Show assignment on both event and choreographer pages.

**Exit:** same assignment visible from both sides, no duplication.

## Phase 4 — Finance history
**Tasks**
1. Implement fee agreement revisions and negotiation states.
2. Implement expense tracking and payment records (or reuse finance).
3. Add authorization and audit for financial writes.
4. Build event/year financial breakdown.
5. Handle currency separation and derived totals.
6. Add edit/reversal policy for erroneous entries.

**Exit:** historical fee/expense/payment records correct and auditable.

## Phase 5 — Contracts, invoices and files
**Tasks**
1. Reuse or create shared Document + Version storage layer.
2. Implement secure upload/download/preview.
3. Add Contract and Invoice metadata/status.
4. Link documents to person and event assignment.
5. Build Documents tab and event-side linked view.
6. Add retention/archival and version handling.

**Exit:** contract/invoice uploaded once, visible from both screens, access-controlled.

## Phase 6 — Emails and relationship timeline
**Tasks**
1. Reuse V1 Conversations/Messages.
2. Add explicit link table only if needed.
3. Build Emails tab with pagination/search.
4. Add manual link/unlink with provenance.
5. Build combined Activity timeline.
6. Test shared manager email edge cases.

**Exit:** only correctly linked correspondence appears; no cross-person leakage.

## Phase 7 — Notes, tasks and reminders
**Tasks**
1. Reuse existing Task where possible.
2. Add internal notes and pinning.
3. Add due-date reminders through existing job/notification system if present.
4. Build Notes & Tasks tab and Overview alerts.
5. Audit changes and enforce visibility.

**Exit:** staff can track follow-ups without external portal.

## Phase 8 — Hardening and release
**Tasks**
1. Unit/integration/E2E tests.
2. Permission and privacy audit.
3. Migration test with populated V1 fixture.
4. File upload security tests.
5. Performance checks for large history.
6. Backup/restore and deployment smoke tests.
7. Documentation and release notes.

**Exit:** full DoD passed and rollout plan approved.

# 16. Acceptance tests / scenarios

## Identity
- Existing Person + CHOREOGRAPHER role → same Person ID, new profile.
- Repeated create request → no duplicate profile.
- Person without role → reject or add role only via authorized flow.

## Media
- Upload 10 valid photos → success.
- Upload 11th → validation error, no orphan file.
- Concurrent 10th/11th uploads → at most 10 active photos.
- Replace/delete/reorder cover → valid single cover.
- Invalid executable disguised as JPG → rejected.
- Unauthorized user cannot download private photo original.

## Contacts
- Add manager and accounting contacts → separate entries.
- Shared agency email across two choreographers → no automatic shared conversation visibility.
- Change manager → historical contact remains inactive.

## Events
- Link same choreographer to 2025 and 2026 events → two assignment records.
- Duplicate link to same event → blocked or resolved per canonical business rule.
- Historic event association → appears in timeline and event page.

## Finance
- Record 2025 €1,500 and 2026 €2,500 → history preserves both.
- Two fee offers plus one agreed fee → totals use agreed fee only.
- €500 advance + €2,000 final → €2,500 confirmed fee payment.
- Expense paid by organizer not counted as payment to choreographer.
- Mixed EUR/USD → no silent summation.
- Unauthorized finance API → 403.
- Invoice uploaded → does not automatically mark payment PAID.

## Documents
- Upload signed contract + invoice → linked to person/event assignment.
- Replace contract file → prior version remains accessible to authorized staff.
- Same document in event and choreographer UI → same Document ID.
- Unrelated person cannot retrieve document by guessed ID.
- Invalid MIME/file over size limit → rejected.

## Email
- Direct verified choreographer email → eligible to link.
- Shared manager email → requires explicit link.
- Manual unlink → removed from profile, original conversation remains.
- AI summary includes only authorized linked messages.

## Audit
- Fee changed → old/new and actor recorded.
- Contract downloaded → sensitive access logged per policy.
- Note edited → author/time recorded.
- Choreographer record deleted/archived → related finance preserved per retention policy.

# 17. Security, privacy and GDPR

- Apply least privilege and field-level redaction where needed.
- Encrypt credentials/secrets, HTTPS, private storage.
- Do not store passport/identity data unless a documented business need and retention policy exists.
- Restrict bank details, legal identity, invoices, contracts and personal notes.
- Document lawful basis, retention period, deletion/anonymization workflow.
- Validate URL schemes and rich text.
- Add CSRF protections if cookie auth is used; rate limit upload endpoints.
- Scan uploaded files when feasible; isolate preview processors.
- Audit access to highly sensitive files and finance actions.
- Never expose CRM as a public-facing profile portal.

# 18. Testing strategy

- **Unit:** fee math, status transitions, currency rules, media cap, contact normalization.
- **Integration:** Prisma migrations, transactions, constraints, RBAC, document link integrity.
- **Contract:** storage adapter, existing mail service, Event assignment service.
- **E2E:** profile create → 10 photos → event link → fee history → invoice → email link → task.
- **Regression:** V1 People, Events, Inbox, permissions, ticketing sync unaffected.
- **Security:** IDOR, role escalation, forged upload, path traversal, shared-manager email leakage.
- **Concurrency:** duplicate profile, photo cap, one current agreement, one cover.
- **Data:** historical backfill, non-destructive migration and rollback rehearsal.

# 19. Operational and deployment checklist

- [ ] Migrations reviewed and tested on copy of populated DB.
- [ ] Backups confirmed before deployment.
- [ ] Storage location/credentials configured with least privilege.
- [ ] Upload limits and reverse-proxy settings aligned.
- [ ] Background jobs monitored where thumbnails/previews are asynchronous.
- [ ] No public bucket exposure.
- [ ] Permission matrix approved.
- [ ] New navigation hidden until backend routes ready (feature flag optional).
- [ ] Structured logs without PII or document contents.
- [ ] Metrics for upload errors, storage errors, email linking errors.
- [ ] Rollout smoke test on staging.
- [ ] Production rollback procedure documented.

# 20. Deliverables for the coding agent

Create/update in the repository:

```text
docs/spec/choreographer-v2.1/
├── repository-audit.md
├── architecture.md
├── data-model.md
├── migration-plan.md
├── api-contracts.md
├── permission-matrix.md
├── ui-flows.md
├── test-plan.md
├── rollout-plan.md
└── implementation-progress.md
```

Plus implementation:
- Prisma migrations and generated client.
- Backend modules/services/controllers/DTO validation.
- Storage adapter integration and secure document/media processing.
- Frontend FSD entities/features/widgets/pages.
- RBAC checks and audit/activity integration.
- Automated tests and migration fixtures.
- Short release notes.

**Progress tracking:** after each phase update `implementation-progress.md` with completed files, migrations, tests, known risks and next phase. Never mark a phase complete without running its tests.

# 21. Ready-to-paste coding agent instruction

> You are implementing **Choreographer Management V2.1** for an existing internal Event & Talent CRM (React 19 + TypeScript + FSD; Express 5; Prisma; PostgreSQL). V1 is already being built. Do not rewrite or reset it. First inspect the repository, schema, migrations, API, permissions, mail integration and existing V2 modules. Read this entire specification and the existing V1/V2 docs. Produce `repository-audit.md`, reuse map, migration plan and ordered tasks before editing implementation code. Then implement the module phase-by-phase, with additive migrations, API validation, staff-only RBAC, secure file storage, 10-photo limit, event history, versioned contracts/invoices, historical fees/expenses/payments, explicit email linking and auditable activity. Reuse canonical Person/Event/EventChoreographer/Conversation/Message/Document/Task/Payment models where present. Do not build customer or choreographer login, public portals, autonomous payouts or duplicate financial ledgers. After each phase, run relevant tests, report results, update progress and continue only when safe. If you find a conflict with existing V1 design, document it and choose a backward-compatible approach; ask before destructive changes.

# 22. Final Definition of Done

- [ ] All core profile tabs functional.
- [ ] Internal-only User/Person boundary enforced.
- [ ] One Person → one ChoreographerProfile.
- [ ] Biography, contacts/managers and up to 10 photos supported.
- [ ] Historical events linked without duplicate Event records.
- [ ] Historical fees, negotiations, expenses and payments separated.
- [ ] Contracts/invoices uploaded, versioned, previewable and linked to assignments.
- [ ] Documents appear in both event and choreographer views via same ID.
- [ ] Email history links safely, including shared-manager edge cases.
- [ ] Notes, tasks and activity visible with RBAC.
- [ ] Sensitive financial/document access protected and audited.
- [ ] Non-destructive migrations and V1 regression tests pass.
- [ ] Staging deployment and backup/restore procedures verified.
- [ ] Coding agent documents final implementation and remaining limitations.

---

**Implementation priority:** build the stable 360° profile and historical event/finance/document data first; keep advanced AI extraction and broader automations as optional later increments.
