# Choreographer Management V2.1 — Repository Audit (Phase 0)

Date: 2026-10-08. Source of requirements: [choreographer-management-v2.1-agent-spec.md](../choreographer-management-v2.1-agent-spec.md).
Everything below was read from the code and the Prisma schema, not assumed.

## 1. What exists today

| Area | Code | State |
|---|---|---|
| Person, roles | `Person`, `PersonRole` (role `CHOREOGRAPHER`) | Canonical; a person can already hold the role |
| Profile | `ChoreographerProfile` (`id`, unique `personId`, `bio`, `socialLinks` JSON, `agencyName`) | Minimal; no stage name, status, location, links, styles |
| Profile API | `GET/PUT /choreographers/profile/:personId` | Guarded by `people.read` / `people.write`; service takes `any`, no role check, no audit, no list |
| Assignment | `EventChoreographer` (unique `(eventId, personId)`, `roleTitle`, `status`, `travelStatus`, `hotelStatus`, `notes`) | Canonical; stable id; created through `POST /events/:id/choreographers` |
| Costs | `ChoreographerCost` (one row per cost: `type` free text, `amount`, `currency`, `status` free text, `documentId`) | No offers/agreements, no payments, no paid-by, no revisions |
| Documents | `Document` (`entityType`/`entityId`, `type` CONTRACT/INVOICE/OTHER, `status` DRAFT/SENT/SIGNED/CANCELLED, `content`, `fileUrl`) | Metadata only; **no file upload, no storage, no versions** |
| Tasks | `Task` (`personId`, `eventId`, `assigneeId`, `dueDate`, `priority`, `status`) | Reusable as is |
| Mail | `Conversation.personId` (single person), `Message`, IMAP/Gmail sync | Reusable; one conversation → one person only |
| Activity / audit | `Activity` (`personId`, `eventId`, `type`, `metadata`), `AuditLog` | Reusable |
| Uploads | `multer` in memory for email attachments only | Nothing is written to disk or object storage; `GOOGLE_DRIVE` exists only as an enum value |
| RBAC | `choreographers.finance.read/write`, `documents.read/sensitive.read/write` are seeded | None of the other `choreographers.*` permissions exist |
| Client | Only `assignChoreographer` on the event page | No choreographer list, profile page or any tab |

## 2. Reuse map

| Spec concept | Decision |
|---|---|
| `ChoreographerProfile` | **Extend** the existing table with nullable columns; keep `id` and unique `personId` |
| `EventChoreographer` | **Reuse** unchanged; it already has a stable id and the unique pair |
| `Task`, `Activity`, `AuditLog`, `Conversation`, `Message` | **Reuse** |
| `ChoreographerContact`, `ChoreographerBioVersion`, `ChoreographerMedia`, `ChoreographerNote` | **New** tables |
| `ChoreographerFeeAgreement`, `ChoreographerPaymentRecord` | **New** tables; the customer `Payment` model is ticket revenue and must not be mixed with payouts |
| `ChoreographerExpense` | **Extend `ChoreographerCost`** (add estimated/actual, paid-by, reimbursable, date) rather than a second expense table |
| `Document` + versions, `Contract`, `Invoice`, `StorageObject` | **Extend `Document`**, add `DocumentVersion` and `StorageObject`; contract/invoice fields as 1:1 tables |
| `ChoreographerConversationLink` | **New** table: `Conversation.personId` cannot express a manager thread that concerns two choreographers |

## 3. Missing capabilities

1. File storage: no `StorageProvider`, no private storage, no thumbnails. This blocks Media (Phase 2) and Documents (Phase 5).
2. Fee negotiation history and payment records (Phase 4).
3. Document versions, contract and invoice metadata (Phase 5).
4. Explicit conversation links (Phase 6).
5. Notes (Phase 7).
6. Granular `choreographers.*` permissions and their checks.
7. The whole client: list, profile header, ten tabs.

## 4. Migration plan

All migrations are additive: new tables and nullable columns, no renames, no drops.

1. `choreographer_profile_v2_1` — new profile columns, enum `ChoreographerRelationshipStatus`, index on status; backfill a profile for every person with the `CHOREOGRAPHER` role (idempotent `INSERT … WHERE NOT EXISTS`); copy legacy `bio` into `bioFull` where empty. *(Phase 1)*
2. Contacts, bio versions, media + `StorageObject`. *(Phase 2)*
3. Fee agreements, payment records, extra columns on `ChoreographerCost`. *(Phase 4)*
4. `DocumentVersion`, contract and invoice tables, document links. *(Phase 5)*
5. Conversation links, notes. *(Phases 6–7)*

Legacy columns `bio`, `socialLinks`, `agencyName` stay until the old `PUT /choreographers/profile/:personId` endpoint is retired.

## 5. Implementation order

As in the specification, Phases 1 → 8. Phase 1 needs no decision from section 6 and can start immediately.

## 6. Risks and open decisions

| # | Question | Recommendation | Needed before |
|---|---|---|---|
| 1 | Where are photos and documents stored? | Private local volume behind a `StorageProvider` interface (a `uploads` volume in Docker), S3/Drive later through the same interface | Phase 2 |
| 2 | Thumbnails need an image library (`sharp`) — a new native dependency | Add `sharp`; it also strips EXIF | Phase 2 |
| 3 | Styles and languages: tags or plain lists? | Validated string lists on the profile now; a lookup table only if filtering by style becomes slow or inconsistent | Phase 1 (applied) |
| 4 | Keep `ChoreographerCost` as the expense table? | Yes, extend it; finance overview already reads it | Phase 4 |
| 5 | Event scoping (`UserEventAccess`) is not enforced anywhere in the CRM | Out of scope here; list as a known limitation | Phase 8 |
| 6 | No backups or staging exist yet | Required by the spec's Definition of Done; cannot be closed inside this module | Phase 8 |

No blocking model conflict was found: every spec concept either maps onto an existing model or is a new additive table.
