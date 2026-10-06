# Event & Talent CRM V2 - Migration Plan

## 1. Overview
This document outlines the migration plan for Event & Talent CRM V2, an internal backoffice platform designed to manage the complete event operations lifecycle. 

## 2. Key Data Decisions & Architectural Rules
- **Non-Negotiable Boundary:** This is an internal backoffice system for staff only. No self-service CRM surface for customers, participants, or choreographers.
- **Identity Model:** The `Person` entity remains the canonical identity. Never automatically create a `User` (staff) from a `Person`.
- **Duplicate Resolution:** No automatic merging of contacts. Deterministic rules or human approval required. 
- **Finance Integration:** Normalize finance layer (Payment, Refund, FinancialTransaction). Do not make Mollie objects the domain.
- **Check-In System:** Event-level QR check-in must use opaque tokens. QR must NOT contain personal information.
- **Storage/Documents:** Store provider-independent document metadata in the domain, using an adapter for Google Drive or other storage.
- **AI Integration:** AI is an assistant that operates strictly within RBAC constraints. AI can *propose* actions, but cannot execute sensitive actions silently.
- **Background Jobs:** Introduce Redis + BullMQ for asynchronous workloads and use a transactional outbox pattern to guarantee domain event dispatch.
- **Database:** Continue with PostgreSQL, Prisma ORM, and `pgvector` for AI context. Enable `pg_trgm` and `pgcrypto`.

## 3. Risks & Mitigations
- **Data Integrity during Merges:** 
  - *Risk:* Merging `Person` records incorrectly could corrupt historical event/order/finance data.
  - *Mitigation:* Implement strict `PersonMerge` tracking and human-in-the-loop approval. Never hard-delete source identities immediately.
- **Schedule Conflicts:** 
  - *Risk:* Overbooking rooms or assigning choreographers to overlapping sessions.
  - *Mitigation:* The Schedule Engine must actively detect conflicts and surface warnings rather than silently saving invalid states.
- **Automated Campaign Mis-fires:** 
  - *Risk:* Accidental schedule changes triggering massive emails to thousands of people.
  - *Mitigation:* Automations must have preview/dry-run capabilities. Bulk campaigns must require explicit confirmation.
- **Financial State Desync:** 
  - *Risk:* Discrepancies between CRM refund state and Mollie.
  - *Mitigation:* Webhooks must be idempotent, authenticated, and refetch authoritative state. Refunds must require explicit internal permission before API dispatch.
- **AI Hallucinations / RBAC Bypass:** 
  - *Risk:* AI exposing sensitive financial/document data to unauthorized staff.
  - *Mitigation:* AI retrieval tools must apply permission filters *before* vector similarity search. Actions are proposed, never executed autonomously.
- **Job Infrastructure Failure:** 
  - *Risk:* Database commit succeeds but event fails to queue (or vice versa).
  - *Mitigation:* Adopt the Transactional Outbox pattern. 

## 4. Implementation Phases (Section 114)

### Phase 1 — Operations Foundation
- Redis
- BullMQ
- Outbox
- Tasks
- Notifications
- Job Monitor
- Integration Health

### Phase 2 — Event Operations
- Venues
- Rooms
- Sessions
- Schedule
- Conflict detection
- Check-in
- Attendance
- Event Command Center

### Phase 3 — Talent Management
- ChoreographerProfile
- Extended EventChoreographer
- Costs
- Travel/hotel statuses
- Documents
- Contracts

### Phase 4 — Communication Platform
- Templates
- Segments
- Saved Views
- Campaigns
- Delivery Log
- Communication provider abstraction

### Phase 5 — Automation
- Triggers
- Conditions
- Actions
- Runs
- Dry-run
- Automation UI

### Phase 6 — Finance
- Payments
- Mollie
- Refund workflow
- Choreographer costs
- Event financial overview

### Phase 7 — AI Platform
- AI Assistant
- Read-only tools
- AI Review Queue
- Action proposals
- Prompt Registry
- Evaluation
- Feedback
- Knowledge versioning

### Phase 8 — Data & Platform
- Duplicates
- Merge
- Custom fields
- Import/export
- GDPR
- API keys
- Webhooks
- Analytics
- Feature flags
- Multi-brand preparation

### Phase 9 — Hardening
- RBAC review
- Event scoping
- Performance
- Security
- Backups
- DR test
- Load tests
- E2E
- Observability
