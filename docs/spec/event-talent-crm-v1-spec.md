# Event & Talent CRM — V1 End-to-End Technical Specification

**Version:** 1.0  
**Status:** Implementation-ready  
**Architecture:** Modular Monolith  
**Primary database:** PostgreSQL  
**ORM:** Prisma  
**Frontend:** React 19 + TypeScript  
**Backend:** Node.js + Express 5 + TypeScript  
**Purpose:** CRM for managing events, choreographers, participants, ticket buyers, Weeztix ticketing data, email communication, AI-assisted replies, and event-specific knowledge.

---

## 1. Product Vision

Build a central CRM in which a person exists once and can participate in multiple business contexts:

- participant;
- choreographer;
- ticket buyer/customer;
- staff member.

The CRM must combine:

1. People and roles.
2. Events.
3. Registrations.
4. Choreographers and event assignments.
5. Ticketing/orders/tickets imported from Weeztix.
6. Email inbox and conversations.
7. AI classification and draft generation.
8. Knowledge Base / RAG.
9. Activity timeline.
10. Providers/integrations.
11. RBAC.
12. Audit logging.

V1 should be production-ready but remain a modular monolith. Do **not** introduce microservices unless a later scaling requirement proves they are needed.

---

# 2. V1 Goals

V1 must allow an administrator to:

- create and manage events;
- maintain a unified people database;
- assign roles to people;
- manage choreographers;
- associate participants/choreographers with events;
- connect Weeztix;
- import/synchronize orders and tickets;
- resolve ticket buyers to CRM people;
- connect Gmail;
- receive and display email conversations;
- match email senders to CRM people;
- classify incoming email using AI;
- retrieve relevant CRM/event knowledge;
- generate an AI reply draft;
- approve/edit/send a draft manually;
- inspect a person's full activity timeline;
- configure AI/email/ticketing providers;
- control staff access through roles and permissions;
- inspect an audit log.

---

# 3. Explicitly Out of Scope for V1

Do not implement yet:

- full marketing campaign builder;
- WhatsApp integration;
- Telegram communication;
- Facebook/Instagram messaging;
- fully autonomous AI sending;
- complex workflow visual editor;
- accounting;
- payroll;
- choreographer contracts/e-signatures;
- native mobile apps;
- multi-tenant SaaS billing;
- microservices;
- event seat maps;
- advanced BI/data warehouse.

Architecture should make these possible later.

---

# 4. Core Architectural Principles

## 4.1 Person is the central entity

Never create isolated customer, participant and choreographer identity systems.

One `Person` can have many roles.

Example:

```text
Person: Anna Smith
├── CUSTOMER
├── PARTICIPANT
└── CHOREOGRAPHER
```

Roles describe what a person is allowed/expected to do. Event-specific relationships belong to event assignment/registration tables.

## 4.2 External providers do not own the domain

Weeztix, Gmail and AI providers are integrations.

Internal domain:

```text
Person
Event
Registration
Order
OrderItem
Ticket
Payment
Conversation
Message
```

External provider identifiers are mappings to these internal entities.

Do not spread Weeztix-specific fields throughout the domain.

## 4.3 Modular monolith

Modules communicate through explicit application services and domain events.

Avoid imports directly into another module's repository layer.

## 4.4 Human-in-the-loop AI

V1 AI creates drafts.

It does **not** automatically send customer replies.

Flow:

```text
Incoming email
    ↓
Normalize
    ↓
Match person
    ↓
Classify
    ↓
Retrieve context
    ↓
Generate draft
    ↓
Human review
    ↓
Send
```

## 4.5 Idempotency

Every external synchronization operation must be safe to execute repeatedly.

Unique provider/external ID constraints are mandatory.

---

# 5. High-Level System Architecture

```text
┌──────────────────────────────────────────────────────┐
│                     React CRM                         │
│ Dashboard / People / Events / Ticketing / Inbox / AI│
└──────────────────────────┬───────────────────────────┘
                           │ REST API
┌──────────────────────────▼───────────────────────────┐
│               Express Modular Monolith              │
│                                                      │
│ People      Events        Registrations              │
│ Ticketing   Communications AI / Knowledge            │
│ Activity    Providers     Auth / RBAC / Audit        │
└───────────────┬─────────────────────┬────────────────┘
                │                     │
       ┌────────▼────────┐   ┌────────▼───────────────┐
       │ PostgreSQL      │   │ External Providers     │
       │ Prisma          │   │ Weeztix / Gmail / LLM │
       └─────────────────┘   └────────────────────────┘
```

Optional infrastructure:

```text
Redis
```

Use Redis for jobs/queues only when needed. PostgreSQL remains the system of record.

---

# 6. Recommended Repository Structure

```text
crm/
├── client/
├── server/
├── packages/
│   ├── shared-types/
│   └── eslint-config/
├── docs/
│   ├── domain/
│   ├── api/
│   ├── adr/
│   └── integrations/
├── docker/
├── docker-compose.yml
├── package.json
└── README.md
```

Backend:

```text
server/src/
├── app/
│   ├── app.ts
│   ├── router.ts
│   └── container.ts
│
├── modules/
│   ├── auth/
│   ├── users/
│   ├── people/
│   ├── events/
│   ├── registrations/
│   ├── choreographers/
│   ├── ticketing/
│   ├── communications/
│   ├── knowledge/
│   ├── ai/
│   ├── activity/
│   ├── providers/
│   ├── jobs/
│   ├── audit/
│   └── dashboard/
│
├── integrations/
│   ├── ticketing/
│   │   └── weeztix/
│   ├── email/
│   │   └── gmail/
│   └── ai/
│       ├── openai/
│       └── ollama/
│
├── infrastructure/
│   ├── database/
│   ├── queue/
│   ├── logger/
│   ├── crypto/
│   └── http/
│
├── shared/
│   ├── errors/
│   ├── validation/
│   ├── pagination/
│   └── domain-events/
│
└── index.ts
```

Each domain module:

```text
people/
├── domain/
├── application/
├── infrastructure/
├── http/
└── index.ts
```

---

# 7. Frontend Information Architecture

Sidebar:

```text
Dashboard

People
├── All contacts
├── Participants
├── Choreographers
└── Tags

Events
├── All events
├── Registrations
└── Schedule

Ticketing
├── Orders
├── Tickets
└── Sync

Communications
├── Inbox
├── Drafts
└── Templates

AI
├── Knowledge Base
├── Prompts
└── Activity

Settings
├── Organization
├── Users & Roles
├── Providers
├── Tags
└── Audit Log
```

---

# 8. Frontend Structure — FSD

```text
client/src/
├── app/
├── pages/
├── widgets/
├── features/
├── entities/
└── shared/
```

Examples:

```text
entities/
├── person/
├── event/
├── order/
├── ticket/
├── conversation/
└── message/

features/
├── create-person/
├── edit-person/
├── assign-person-role/
├── create-event/
├── register-participant/
├── assign-choreographer/
├── sync-weeztix/
├── reply-to-message/
├── approve-ai-draft/
└── manage-provider/
```

Do not put API calls directly inside page components.

---

# 9. PostgreSQL Data Model

Use UUID primary keys.

Recommended PostgreSQL extension:

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

Use:

```text
UUID
TIMESTAMPTZ
JSONB
```

where appropriate.

All important tables should have:

```text
id
createdAt
updatedAt
```

Use soft deletion only where business recovery/audit requires it.

---

# 10. Core Entities

## 10.1 Person

```text
Person
-----
id UUID
firstName
lastName
displayName
email nullable
phone nullable
birthDate nullable
language nullable
country nullable
notes nullable
source
status
createdAt
updatedAt
```

`source`:

```text
MANUAL
WEEZTIX
EMAIL
IMPORT
SYSTEM
```

`status`:

```text
ACTIVE
ARCHIVED
```

Email should be normalized to lowercase.

Do not blindly enforce unique email because family/shared addresses can exist.

---

# 11. Person Roles

```text
PersonRole
----------
id
personId
role
createdAt
```

Roles:

```text
CUSTOMER
PARTICIPANT
CHOREOGRAPHER
STAFF
```

Unique:

```text
(personId, role)
```

---

# 12. Tags

```text
Tag
---
id
name
slug
description
createdAt
```

```text
PersonTag
---------
personId
tagId
createdAt
```

Unique:

```text
(personId, tagId)
```

---

# 13. Events

```text
Event
-----
id
name
slug
description
status
startAt
endAt
timezone
venueName
address
city
country
capacity nullable
createdAt
updatedAt
```

Statuses:

```text
DRAFT
PUBLISHED
ACTIVE
COMPLETED
CANCELLED
ARCHIVED
```

Always store event timezone explicitly.

---

# 14. Event Choreographers

```text
EventChoreographer
------------------
id
eventId
personId
roleTitle
bioOverride nullable
status
notes nullable
createdAt
updatedAt
```

Status:

```text
INVITED
CONFIRMED
CANCELLED
COMPLETED
```

Unique:

```text
(eventId, personId)
```

---

# 15. Registrations

A registration represents participation in an event.

```text
Registration
------------
id
eventId
personId
ticketId nullable
status
registrationSource
notes nullable
createdAt
updatedAt
```

Statuses:

```text
PENDING
CONFIRMED
CHECKED_IN
CANCELLED
NO_SHOW
```

Sources:

```text
MANUAL
WEEZTIX
IMPORT
```

A ticket and participant are not necessarily the same person as the buyer.

---

# 16. Ticketing Domain

## Order

```text
Order
-----
id
eventId nullable
buyerPersonId nullable
providerConnectionId nullable
externalId nullable
status
currency
subtotal
fees
total
orderedAt
rawData JSONB nullable
createdAt
updatedAt
```

Statuses:

```text
PENDING
PAID
CANCELLED
REFUNDED
PARTIALLY_REFUNDED
```

Money must use decimal/numeric values, never float.

---

# 17. Order Items

```text
OrderItem
---------
id
orderId
name
quantity
unitPrice
totalPrice
externalId nullable
rawData JSONB nullable
createdAt
```

---

# 18. Tickets

```text
Ticket
------
id
orderId
orderItemId nullable
eventId nullable
holderPersonId nullable
externalId nullable
ticketType
barcode nullable
status
rawData JSONB nullable
createdAt
updatedAt
```

Statuses:

```text
VALID
USED
CANCELLED
REFUNDED
TRANSFERRED
```

---

# 19. External Identity Mapping

Do not add `weeztixId`, `gmailId`, etc. to every domain table.

Create a generic mapping:

```text
ExternalIdentity
----------------
id
providerConnectionId
entityType
entityId
externalId
metadata JSONB nullable
createdAt
updatedAt
```

Example:

```text
provider = WEEZTIX
entityType = ORDER
entityId = internal order UUID
externalId = Weeztix order ID
```

Unique:

```text
(providerConnectionId, entityType, externalId)
```

---

# 20. Provider Connections

```text
ProviderConnection
------------------
id
type
provider
name
status
credentialsEncrypted
settings JSONB
lastSyncAt nullable
lastError nullable
createdAt
updatedAt
```

Types:

```text
TICKETING
EMAIL
AI
STORAGE
PAYMENT
```

Providers initially:

```text
WEEZTIX
GMAIL
OPENAI
OLLAMA
```

Never return credentials through normal API responses.

Encrypt secrets at application level.

---

# 21. Communications Domain

## Conversation

```text
Conversation
------------
id
personId nullable
eventId nullable
subject
status
priority
assignedUserId nullable
lastMessageAt
createdAt
updatedAt
```

Statuses:

```text
OPEN
WAITING
RESOLVED
SPAM
ARCHIVED
```

---

# 22. Messages

```text
Message
-------
id
conversationId
direction
channel
sender
recipient
subject nullable
bodyText
bodyHtml nullable
externalId nullable
providerConnectionId nullable
receivedAt nullable
sentAt nullable
rawData JSONB nullable
createdAt
```

Direction:

```text
INBOUND
OUTBOUND
```

Channel V1:

```text
EMAIL
```

Design the enum so more channels can be added later.

---

# 23. AI Draft

```text
AiDraft
-------
id
conversationId
sourceMessageId
status
language
intent
confidence nullable
model
promptVersion
content
contextSnapshot JSONB
createdBy
approvedBy nullable
approvedAt nullable
createdAt
updatedAt
```

Statuses:

```text
GENERATED
EDITED
APPROVED
REJECTED
SENT
FAILED
```

Store the context snapshot so AI output remains auditable even when knowledge later changes.

---

# 24. Knowledge Base

```text
KnowledgeDocument
-----------------
id
title
scope
eventId nullable
content
status
sourceType
sourceUrl nullable
createdAt
updatedAt
```

Scopes:

```text
GLOBAL
EVENT
```

Statuses:

```text
DRAFT
ACTIVE
ARCHIVED
```

V1 can start with PostgreSQL full-text search.

For semantic RAG, use PostgreSQL + `pgvector`.

Recommended:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

---

# 25. Knowledge Chunks

```text
KnowledgeChunk
--------------
id
documentId
content
position
embedding VECTOR
metadata JSONB
createdAt
```

Do not make vector storage the source of truth. `KnowledgeDocument` remains canonical.

---

# 26. Activity Timeline

```text
Activity
--------
id
personId nullable
eventId nullable
actorUserId nullable
type
entityType
entityId nullable
metadata JSONB
createdAt
```

Examples:

```text
PERSON_CREATED
ROLE_ADDED
ORDER_IMPORTED
TICKET_IMPORTED
REGISTRATION_CREATED
EMAIL_RECEIVED
AI_DRAFT_CREATED
EMAIL_SENT
CHECK_IN
TAG_ADDED
```

Activity is product history.

AuditLog is security/administrative history.

Keep them separate.

---

# 27. Audit Log

```text
AuditLog
--------
id
actorUserId nullable
action
entityType
entityId nullable
before JSONB nullable
after JSONB nullable
ipAddress nullable
userAgent nullable
createdAt
```

Audit:

- provider changes;
- user/role changes;
- deletions;
- manual order modifications;
- AI draft approvals;
- communication sending;
- sensitive setting changes.

Audit entries should be immutable.

---

# 28. Authentication

V1:

```text
email + password
```

Password:

```text
Argon2id
```

Session preferred over custom JWT complexity for an internal web CRM.

Recommended:

```text
secure HTTP-only cookie
SameSite=Lax
Secure=true in production
```

Add:

- login rate limiting;
- CSRF protection where appropriate;
- session expiration;
- password reset;
- disabled-user handling.

---

# 29. RBAC

Tables:

```text
User
Role
Permission
UserRole
RolePermission
```

Initial roles:

```text
OWNER
ADMIN
EVENT_MANAGER
SUPPORT
VIEWER
```

Example permissions:

```text
people.read
people.write

events.read
events.write

ticketing.read
ticketing.sync

communications.read
communications.reply

ai.use
ai.manage

providers.read
providers.manage

users.manage

audit.read
```

Backend is authoritative.

Frontend permission checks are only UX.

---

# 30. Weeztix Integration Architecture

Implement an interface:

```ts
interface TicketingProvider {
  testConnection(): Promise<ConnectionResult>;
  listEvents(): Promise<ExternalEvent[]>;
  syncEvent(externalEventId: string): Promise<SyncResult>;
  syncOrders(externalEventId: string): Promise<SyncResult>;
}
```

Implementation:

```text
WeeztixTicketingProvider
```

Do not expose Weeztix API response objects outside the integration adapter.

Adapter converts them into normalized DTOs.

---

# 31. Weeztix Sync Pipeline

```text
Weeztix
   ↓
Fetch external records
   ↓
Normalize
   ↓
Resolve provider identity
   ↓
Upsert internal domain
   ↓
Resolve buyer Person
   ↓
Create/update Order
   ↓
Create/update Tickets
   ↓
Resolve ticket holder
   ↓
Create/update Registration where applicable
   ↓
Activity records
   ↓
Sync summary
```

---

# 32. Person Matching

Never automatically merge people using fuzzy name matching.

Safe matching order:

```text
1. Existing ExternalIdentity
2. Exact normalized email + supporting context
3. Exact phone + supporting context
4. Create new Person
```

Potential duplicates go into a future/manual duplicate-resolution process.

Do not silently merge uncertain contacts.

---

# 33. Sync Jobs

Create:

```text
Job
---
id
type
status
providerConnectionId nullable
payload JSONB
attempts
startedAt nullable
finishedAt nullable
error nullable
createdAt
```

Statuses:

```text
PENDING
RUNNING
SUCCEEDED
FAILED
```

Job types:

```text
WEEZTIX_SYNC
EMAIL_SYNC
AI_DRAFT
KNOWLEDGE_EMBED
```

V1 can begin with DB-backed workers.

If volume grows, move execution to BullMQ + Redis without changing domain services.

---

# 34. Gmail Integration

The email provider abstraction:

```ts
interface EmailProvider {
  testConnection(): Promise<ConnectionResult>;
  syncMessages(cursor?: string): Promise<EmailSyncResult>;
  sendMessage(input: SendEmailInput): Promise<SendEmailResult>;
}
```

Initial adapter:

```text
GmailEmailProvider
```

The communication domain must not import Gmail-specific types.

---

# 35. Incoming Email Pipeline

```text
Gmail
  ↓
Sync
  ↓
Deduplicate by external message ID
  ↓
Normalize email
  ↓
Find/create Conversation
  ↓
Match Person
  ↓
Persist Message
  ↓
Create Activity
  ↓
AI classification
  ↓
Context retrieval
  ↓
AI draft
```

If AI fails, email ingestion must still succeed.

AI is never allowed to block persistence of incoming communication.

---

# 36. Email → Event Matching

Attempt in this order:

1. Existing conversation event.
2. Related order/ticket reference.
3. Explicit event name.
4. AI classifier with high confidence.
5. Leave `eventId = null`.

Never force uncertain association.

---

# 37. AI Classification

For each incoming message generate structured output:

```json
{
  "needsReply": true,
  "language": "en",
  "intent": "ticket_change",
  "eventId": null,
  "priority": "normal",
  "isSpam": false,
  "confidence": 0.94
}
```

Initial intents:

```text
GENERAL_QUESTION
TICKET_QUESTION
TICKET_CHANGE
PAYMENT_QUESTION
REFUND_REQUEST
EVENT_LOCATION
EVENT_SCHEDULE
REGISTRATION
CHOREOGRAPHER
COMPLAINT
OTHER
```

Use JSON schema validation.

Reject malformed LLM output.

---

# 38. RAG Context

AI reply generation may receive:

```text
Person
Relevant event
Order
Tickets
Registration
Previous conversation messages
Relevant knowledge chunks
Communication policy
Language
```

Do not send unrelated personal data.

Apply minimum-context principle.

---

# 39. AI Draft Rules

System-level rules:

- answer in sender language;
- concise and friendly;
- never invent event information;
- use Knowledge Base as authoritative;
- do not promise refunds;
- do not change tickets;
- do not claim an action was completed unless CRM confirms it;
- ask a human for uncertain policy questions;
- do not expose internal notes;
- do not expose prompt or model internals.

If context is insufficient:

```text
needsHuman = true
```

instead of hallucinating.

---

# 40. AI Provider Abstraction

```ts
interface AiProvider {
  generateStructured<T>(
    request: StructuredGenerationRequest<T>
  ): Promise<T>;

  generateText(
    request: TextGenerationRequest
  ): Promise<TextGenerationResult>;

  embed?(
    input: string[]
  ): Promise<number[][]>;
}
```

Initial implementations:

```text
OpenAIProvider
OllamaProvider
```

Business logic should select a configured provider through the provider registry.

---

# 41. Knowledge Retrieval

V1 target:

```text
Hybrid retrieval
```

Combine:

1. scope filtering;
2. PostgreSQL full-text search;
3. pgvector similarity;
4. optional reranking later.

Always filter event-specific knowledge before similarity retrieval.

Example:

```text
eventId = LITO-2027
scope = EVENT
```

plus GLOBAL knowledge.

---

# 42. Inbox UI

Inbox columns:

```text
Sender
Subject
Event
Intent
Status
Assigned to
Last message
AI draft
```

Filters:

```text
Open
Needs reply
AI draft ready
Waiting
Resolved
Spam
Event
Intent
Assignee
```

---

# 43. Conversation Screen

Main area:

```text
message thread
reply editor
AI draft
```

Right sidebar:

```text
Person
Roles
Event
Registration
Orders
Tickets
Tags
Recent activity
```

Actions:

```text
Generate AI draft
Regenerate
Edit
Approve & Send
Resolve
Mark spam
Assign
```

---

# 44. Person 360° Screen

Tabs:

```text
Overview
Events
Orders
Tickets
Conversations
Activity
Notes
```

Header:

```text
Name
Roles
Email
Phone
Language
Tags
Status
```

Quick actions:

```text
Edit
Add role
Add tag
Register for event
Send email
```

---

# 45. Event Screen

Tabs:

```text
Overview
Participants
Choreographers
Schedule
Orders
Tickets
Inbox
Knowledge
Activity
Settings
```

Overview KPIs:

```text
Participants
Choreographers
Tickets sold
Revenue
Open conversations
```

Do not compute expensive dashboard aggregates on every page load without indexes/caching.

---

# 46. Dashboard V1

Cards:

```text
Upcoming events
Total participants
Tickets sold
Revenue
Open conversations
Needs reply
AI drafts awaiting approval
Last sync status
```

Sections:

```text
Upcoming events
Recent activity
Inbox requiring attention
Integration health
```

---

# 47. Providers UI

Settings → Providers:

```text
Ticketing
  Weeztix

Email
  Gmail

AI
  OpenAI
  Ollama
```

Provider card:

```text
Name
Status
Last successful sync
Last error
Test connection
Configure
Enable/Disable
Sync now
```

Credentials must never be displayed after save.

---

# 48. REST API

Base:

```text
/api/v1
```

People:

```text
GET    /people
POST   /people
GET    /people/:id
PATCH  /people/:id
POST   /people/:id/roles
DELETE /people/:id/roles/:role
GET    /people/:id/activity
```

Events:

```text
GET    /events
POST   /events
GET    /events/:id
PATCH  /events/:id

GET    /events/:id/registrations
POST   /events/:id/registrations

GET    /events/:id/choreographers
POST   /events/:id/choreographers
```

Ticketing:

```text
GET  /orders
GET  /orders/:id

GET  /tickets
GET  /tickets/:id

POST /ticketing/sync
GET  /ticketing/sync/:jobId
```

Communications:

```text
GET  /conversations
GET  /conversations/:id
PATCH /conversations/:id

POST /conversations/:id/reply
POST /conversations/:id/ai-draft
POST /ai-drafts/:id/approve
POST /ai-drafts/:id/reject
```

Knowledge:

```text
GET    /knowledge
POST   /knowledge
GET    /knowledge/:id
PATCH  /knowledge/:id
DELETE /knowledge/:id
POST   /knowledge/:id/reindex
```

Providers:

```text
GET  /providers
POST /providers
PATCH /providers/:id
POST /providers/:id/test
POST /providers/:id/sync
```

---

# 49. API Standards

Success:

```json
{
  "data": {}
}
```

Collection:

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "pageSize": 25,
    "total": 200
  }
}
```

Error:

```json
{
  "error": {
    "code": "PERSON_NOT_FOUND",
    "message": "Person not found",
    "requestId": "..."
  }
}
```

Never expose stack traces in production.

---

# 50. Validation

Use shared request schemas.

Recommended:

```text
Zod
```

Validate:

- route params;
- query parameters;
- request bodies;
- external provider payloads;
- AI structured output;
- environment configuration.

Types alone are not runtime validation.

---

# 51. Domain Events

Use in-process domain/application events initially.

Examples:

```text
person.created
order.imported
ticket.imported
registration.created
email.received
ai.draft.created
email.sent
provider.sync.failed
```

Handlers:

```text
email.received
 ├── create activity
 ├── classify
 └── schedule AI draft
```

Keep events internal and typed.

Later they can be moved to a broker if necessary.

---

# 52. Transactions

Use Prisma transactions when operations must remain atomic.

Example:

```text
Import Order
├── Order
├── OrderItems
├── Tickets
├── ExternalIdentities
└── Activity
```

Either all required records succeed or the operation rolls back.

External network calls must not be executed inside long-running DB transactions.

---

# 53. PostgreSQL Index Strategy

Minimum indexes:

```text
Person.email
Person.phone

Event.startAt
Event.status

Registration.eventId
Registration.personId
Registration.status

Order.eventId
Order.buyerPersonId
Order.orderedAt

Ticket.eventId
Ticket.holderPersonId
Ticket.status

Conversation.personId
Conversation.eventId
Conversation.status
Conversation.lastMessageAt

Message.conversationId
Message.externalId

Activity.personId + createdAt
Activity.eventId + createdAt

ExternalIdentity.providerConnectionId + entityType + externalId
```

Use partial/GIN indexes where profiling shows value.

JSONB should not become an excuse to avoid relational modelling.

---

# 54. Search

V1 global search should support:

```text
person name
email
phone
order external ID
ticket external ID/barcode
event
```

Endpoint:

```text
GET /api/v1/search?q=
```

Return grouped results.

---

# 55. Observability

Implement structured logs.

Each request:

```text
requestId
userId
method
route
status
duration
```

Integration calls:

```text
provider
operation
duration
success
externalRequestId where available
```

Never log:

```text
passwords
API keys
OAuth tokens
complete sensitive email bodies by default
```

Add error monitoring in production.

---

# 56. Integration Health

Store and display:

```text
lastAttemptAt
lastSuccessAt
lastFailureAt
lastError
```

Dashboard statuses:

```text
Healthy
Warning
Error
Disabled
```

Provider failure must not crash the CRM.

---

# 57. Security Requirements

Mandatory:

- HTTPS;
- secure cookies;
- Argon2id;
- encrypted provider credentials;
- server-side RBAC;
- input validation;
- output encoding;
- rate limiting;
- CSRF protection where applicable;
- SQL only through Prisma or safe parameterized queries;
- audit logs;
- dependency scanning;
- backups;
- restore testing.

AI prompts must treat external email and knowledge content as untrusted data.

Never allow email content to override system instructions or tool permissions.

---

# 58. GDPR / Privacy

Because the system processes EU customer information:

- collect only required data;
- document purpose of processing;
- support data export;
- support deletion/anonymization where legally permitted;
- define retention policies;
- record consent where needed;
- protect provider credentials;
- restrict staff access;
- audit sensitive actions.

Raw provider payload retention should be configurable.

---

# 59. PostgreSQL Backup

Production minimum:

```text
daily pg_dump
gzip
7–14 day local retention
off-server/cloud copy
restore test
```

Backup:

```text
database
knowledge
configuration metadata
uploaded files if introduced
```

Provider secrets require secure backup handling.

---

# 60. Docker Development Environment

Recommended:

```text
postgres
redis (optional initially)
server
client
ollama (optional)
```

Example conceptual compose:

```text
crm-postgres
crm-redis
crm-server
crm-client
crm-ollama
```

Do not expose PostgreSQL publicly in production.

---

# 61. Environment Variables

Example:

```text
DATABASE_URL=

SESSION_SECRET=
APP_ENCRYPTION_KEY=

CLIENT_URL=

GMAIL_CLIENT_ID=
GMAIL_CLIENT_SECRET=

OPENAI_API_KEY=

OLLAMA_BASE_URL=
```

Weeztix secrets should preferably be stored through encrypted ProviderConnection configuration rather than hard-coded environment variables once provider management exists.

Never commit `.env`.

---

# 62. Database Migrations

Production:

```text
prisma migrate deploy
```

Never use:

```text
prisma db push
```

as the production schema deployment strategy.

Migration files belong in Git.

---

# 63. Seed

Development seed:

```text
Owner user

2 events
10 people
2 choreographers
5 participants
3 orders
5 tickets
3 conversations
knowledge documents
```

Never seed production with demo customer data.

---

# 64. Testing Strategy

Unit:

```text
person matching
role rules
order normalization
ticket mapping
AI response validation
RAG context builder
permission checks
```

Integration:

```text
PostgreSQL repositories
Prisma transactions
API routes
Weeztix adapter with mocked HTTP
Gmail adapter
AI adapter
```

E2E:

```text
login
create event
create person
assign choreographer
sync ticket order
receive email
generate AI draft
approve/send reply
```

Critical flows require E2E coverage.

---

# 65. V1 End-to-End Flow A — Ticket Purchase

```text
Customer purchases through Weeztix
        ↓
Scheduled/manual sync
        ↓
Weeztix adapter retrieves order
        ↓
Normalize data
        ↓
Resolve/create buyer Person
        ↓
Create/update Order
        ↓
Create OrderItems
        ↓
Create Tickets
        ↓
Resolve/create ticket holder Person
        ↓
Create Registration
        ↓
Create Activity entries
        ↓
Visible in Event + Person 360°
```

---

# 66. V1 End-to-End Flow B — Incoming Email

```text
Customer sends email
        ↓
Gmail sync
        ↓
Message deduplication
        ↓
Find/create Conversation
        ↓
Match Person
        ↓
Associate Event where safe
        ↓
Persist Message
        ↓
AI classification
        ↓
Retrieve CRM context
        ↓
Retrieve Knowledge Base context
        ↓
Generate draft
        ↓
Draft appears in Inbox
        ↓
Staff edits/approves
        ↓
Gmail provider sends
        ↓
Outbound Message stored
        ↓
Conversation updated
        ↓
Activity + Audit recorded
```

---

# 67. V1 End-to-End Flow C — Choreographer

```text
Create/find Person
       ↓
Assign CHOREOGRAPHER role
       ↓
Assign to Event
       ↓
Store event-specific role/status
       ↓
Show under Event → Choreographers
       ↓
Related email automatically appears
       ↓
Person 360° shows event relationship
```

---

# 68. Background Scheduling

Initial jobs:

```text
email sync: every 2–5 minutes
Weeztix incremental sync: every 5–15 minutes
knowledge embedding: async after content change
failed job retry: exponential backoff
```

Exact provider rate limits must be respected.

Manual `Sync now` remains available.

Use locking so two workers cannot run the same provider sync concurrently.

---

# 69. Idempotency Rules

External messages:

```text
(providerConnectionId, externalId)
```

must be unique.

External ticket/order identities:

```text
(providerConnectionId, entityType, externalId)
```

must be unique.

Sync retries may update existing records but may not duplicate them.

---

# 70. Failure Handling

Examples:

### Weeztix unavailable

```text
Job FAILED
Provider health ERROR
Existing CRM remains usable
Retry later
```

### Gmail unavailable

```text
Existing conversations remain available
Send operation reports failure
No fake SENT status
```

### AI unavailable

```text
Email still enters Inbox
AI draft status FAILED
User can reply manually
Retry available
```

### Embedding unavailable

```text
Knowledge remains saved
Indexing status FAILED
Retry indexing
```

---

# 71. AI Safety Boundary

LLM may:

```text
classify
summarize
suggest
draft
extract structured information
```

LLM may not in V1:

```text
refund payment
delete customer
modify ticket
send email without human approval
change permissions
change provider configuration
execute arbitrary database queries
```

All state-changing business operations remain deterministic application services.

---

# 72. Recommended Prisma Domain Boundaries

Do not build a single giant `service.ts`.

Example:

```text
people/application/
├── create-person.use-case.ts
├── update-person.use-case.ts
├── assign-role.use-case.ts
├── find-person.use-case.ts
└── match-person.use-case.ts
```

Ticketing:

```text
ticketing/application/
├── sync-ticketing.use-case.ts
├── import-order.use-case.ts
├── import-ticket.use-case.ts
└── resolve-ticket-holder.use-case.ts
```

Communications:

```text
communications/application/
├── ingest-email.use-case.ts
├── create-conversation.use-case.ts
├── send-reply.use-case.ts
└── resolve-conversation.use-case.ts
```

---

# 73. Repository Interfaces

Domain/application layers depend on interfaces:

```ts
interface PersonRepository {}
interface EventRepository {}
interface OrderRepository {}
interface ConversationRepository {}
```

Prisma implementations live in infrastructure.

This makes business logic testable without Prisma.

Do not create abstraction for every trivial database call; use repositories around meaningful aggregate boundaries.

---

# 74. API Authorization Example

Request:

```text
POST /api/v1/providers/:id/sync
```

Requires:

```text
ticketing.sync
```

Request:

```text
POST /api/v1/conversations/:id/reply
```

Requires:

```text
communications.reply
```

Every protected endpoint declares its permission explicitly.

---

# 75. UI State

Recommended:

```text
TanStack Query
```

for server state.

Use local component state or a small client store for UI-only state.

Do not duplicate API server state globally.

---

# 76. Pagination

All potentially large collections use server pagination:

```text
?page=1&pageSize=25
```

and filters.

Never load all people/orders/messages into the browser.

---

# 77. Import History

Add:

```text
SyncRun
-------
id
providerConnectionId
type
status
startedAt
finishedAt
createdCount
updatedCount
skippedCount
failedCount
errorSummary
metadata JSONB
```

UI:

```text
Settings → Providers → Weeztix → Sync History
```

This is important for diagnosing missing orders.

---

# 78. Data Ownership

Canonical ownership:

```text
Person → CRM
Event → CRM unless explicitly imported
Registration → CRM
Conversation → CRM
Knowledge → CRM

External ticket order facts → provider-originated but normalized in CRM
```

Track provider origin but avoid making the entire CRM dependent on external availability.

---

# 79. V1 Implementation Phases

## Phase 1 — Foundation

Implement:

```text
PostgreSQL
Prisma
Auth
Users
RBAC
Audit
App shell
Providers foundation
```

Exit criteria:

- owner can login;
- permissions work;
- migrations work;
- audit works.

## Phase 2 — CRM Core

Implement:

```text
People
Roles
Tags
Events
Choreographers
Registrations
Activity
```

Exit criteria:

- complete Person 360°;
- event management works.

## Phase 3 — Ticketing

Implement:

```text
Provider abstraction
Weeztix adapter
Orders
OrderItems
Tickets
ExternalIdentity
Sync jobs
Sync history
```

Exit criteria:

- Weeztix purchase appears correctly in CRM without duplicates.

## Phase 4 — Communications

Implement:

```text
Gmail provider
Conversation
Message
Inbox
Person matching
Event matching
Reply sending
```

Exit criteria:

- incoming and outgoing email works end-to-end.

## Phase 5 — AI + Knowledge

Implement:

```text
AI provider abstraction
OpenAI/Ollama adapters
Classification
Knowledge documents
Chunking
pgvector
Retrieval
AI drafts
Human approval
```

Exit criteria:

- incoming email produces a grounded draft.

## Phase 6 — Hardening

Implement:

```text
Dashboard
Search
Integration health
Retries
Security review
Performance indexes
E2E tests
Backups
Production deployment
```

---

# 80. Definition of Done — V1

V1 is complete when the following scenario works:

1. Admin logs into CRM.
2. Admin creates an event.
3. Admin adds a choreographer.
4. Weeztix is connected.
5. Ticket data is synchronized.
6. Buyer appears as a Person.
7. Participant/ticket holder is associated correctly.
8. Order and ticket appear on both Event and Person screens.
9. Gmail is connected.
10. Incoming participant email appears in Inbox.
11. Sender is linked to Person.
12. Event/order/ticket context is available beside conversation.
13. AI classifies the request.
14. RAG retrieves relevant event knowledge.
15. AI creates a reply draft.
16. Staff edits or approves it.
17. Reply is sent through Gmail.
18. Outgoing message is stored.
19. Activity timeline records relevant events.
20. Audit log records sensitive staff actions.
21. Re-running Weeztix/Gmail sync does not create duplicates.
22. Provider/AI failure does not make core CRM unavailable.

---

# 81. Architectural Decisions for V1

Use:

```text
React 19
TypeScript
FSD
TanStack Query

Node.js
Express 5
TypeScript

PostgreSQL
Prisma

pgvector

Redis/BullMQ only when job volume requires it

Docker
```

Architecture:

```text
Modular Monolith
Provider Adapters
Application Use Cases
Repository Boundaries
Human-in-the-loop AI
Hybrid RAG
```

Do **not** use:

```text
microservices
Kafka
multiple operational databases
event sourcing
CQRS infrastructure
autonomous AI actions
```

for V1.

They add complexity without solving a current requirement.

---

# 82. Future V2 Extension Points

The V1 architecture must permit:

```text
WhatsApp
Telegram
Instagram/Facebook
Mollie
Google Drive
contracts
choreographer payments
campaigns
workflow automation
QR check-in
mobile scanning
multiple organizations
advanced analytics
AI auto-reply policies
additional ticketing providers
```

without replacing the core `Person`, `Event`, `Communication`, or provider architecture.

---

# 83. Coding Agent Rules

The implementation agent MUST:

1. Read this specification before making architectural changes.
2. Preserve modular boundaries.
3. Never add provider-specific fields to core domain entities without an ADR.
4. Never let AI directly perform sensitive state changes.
5. Use PostgreSQL migrations for schema changes.
6. Add indexes for new query patterns.
7. Validate every external payload.
8. Make provider sync idempotent.
9. Add tests for critical domain rules.
10. Update API/domain documentation with implementation changes.
11. Create an ADR when deviating materially from this specification.
12. Prefer the simplest production-safe implementation.
13. Never silently merge uncertain people.
14. Never log credentials or authentication tokens.
15. Keep raw external payloads supplemental, not canonical.
16. Ensure all timestamps are timezone-aware.
17. Store money using exact decimal types.
18. Keep domain logic outside controllers and React components.

---

# 84. Initial ADRs

Create:

```text
docs/adr/
├── 0001-modular-monolith.md
├── 0002-postgresql-prisma.md
├── 0003-person-as-central-identity.md
├── 0004-provider-adapter-pattern.md
├── 0005-human-in-the-loop-ai.md
├── 0006-pgvector-rag.md
└── 0007-domain-activity-vs-audit-log.md
```

---

# 85. First Implementation Milestone

Before implementing Weeztix or AI, the application must successfully support:

```text
Login
  ↓
Dashboard shell
  ↓
Create Person
  ↓
Assign role
  ↓
Create Event
  ↓
Assign Choreographer
  ↓
Register Participant
  ↓
Activity timeline
  ↓
Audit log
```

Only after this foundation is stable should external providers be connected.

This prevents external APIs from defining the internal CRM architecture.

---

# Final Architecture Summary

```text
                        ┌─────────────┐
                        │   Person    │
                        └──────┬──────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
     Participant         Choreographer          Customer
          │                    │                    │
          └──────────────┬─────┴──────────────┬─────┘
                         │                    │
                       Event                Order
                         │                    │
                  Registration           Tickets
                         │                    │
                         └──────────┬─────────┘
                                    │
                              Conversation
                                    │
                                 Messages
                                    │
                         Classification / RAG
                                    │
                                AI Draft
                                    │
                             Human Approval
                                    │
                                  Email

External systems:
Weeztix ─┐
Gmail ───┼── Provider / Adapter Layer ── Domain
OpenAI ──┤
Ollama ──┘

Storage:
PostgreSQL + Prisma + pgvector
```

The key rule for the entire project is:

> **The CRM owns the business domain. External providers supply capabilities and data, but they never define the internal architecture.**
