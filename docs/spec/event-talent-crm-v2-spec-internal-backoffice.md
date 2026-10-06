# Event & Talent CRM — V2 End-to-End Technical Specification

**Version:** 2.0  
**Depends on:** Event & Talent CRM V1  
**Status:** Architecture / implementation specification — revised for internal-backoffice-only boundary  
**Architecture:** Modular Monolith + asynchronous workers  
**Database:** PostgreSQL  
**ORM:** Prisma  
**Vector search:** pgvector  
**Frontend:** React 19 + TypeScript + FSD  
**Backend:** Node.js + Express 5 + TypeScript  

---

# 0. Non-Negotiable Product Boundary — INTERNAL BACKOFFICE ONLY

This CRM is an **internal backoffice system for the organization and its staff**.

It is NOT a customer portal, participant portal, choreographer portal, self-service application, ticket shop, or public community platform. This rule overrides any ambiguous wording elsewhere in this specification.

## 0.1 User vs Person

```text
User
= internal CRM operator
= OWNER / ADMIN / EVENT_MANAGER / SUPPORT / staff
= authenticates into CRM
= receives RBAC permissions

Person
= customer / participant / choreographer / ticket buyer / contact
= record managed by staff
= does NOT authenticate into CRM
= does NOT receive CRM permissions
```

Never automatically create a `User` from a `Person`.

Never add CRM passwords, sessions, account activation, or CRM access roles to `Person`.

## 0.2 No self-service CRM surface

V2 MUST NOT implement:

```text
customer login
participant login
choreographer login
customer dashboard
participant dashboard
choreographer dashboard
self-service profile editing
self-service ticket management
self-service registration management
self-service refund management
self-service document management
public CRM account creation
```

Customers, participants and choreographers interact with the organization through external channels such as Weeztix, email and future messaging/signing providers. Internal staff manage the resulting records in CRM.

## 0.3 System boundary

```text
Customer / Participant / Choreographer
             │
             ├── Weeztix
             ├── Email
             ├── external signing/payment links
             └── future external channels
                         │
                         ▼
                    Integrations
                         │
                         ▼
                INTERNAL CRM ONLY
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
        Owner          Admin          Staff
```

## 0.4 Internal operations rule

Check-in, attendance, registration management, refund workflow, campaigns, contract tracking, tasks, AI review, analytics and GDPR operations are **staff-facing tools**.

If an external interaction is required, it is performed through the relevant external provider/channel. It does not create a CRM portal.

---

# 1. V2 Mission

V1 establishes the CRM system of record:

```text
Person
Event
Registration
Choreographer
Order
Ticket
Conversation
Knowledge
AI Draft
Activity
Audit
Providers
```

V2 turns that CRM into an **event operations platform**.

The platform should manage the complete operational lifecycle:

```text
Audience acquisition
        ↓
Ticket purchase
        ↓
Participant registration
        ↓
Communication
        ↓
Event preparation
        ↓
Choreographer operations
        ↓
Schedule
        ↓
Check-in
        ↓
On-site operations
        ↓
Finance
        ↓
Post-event communication
        ↓
Analytics / retention
```

V2 must extend V1 without replacing its core domain.

---

# 2. Architectural Position

Continue using a modular monolith.

Do NOT migrate to microservices simply because V2 is larger.

Target architecture:

```text
                       React CRM
                           │
                      REST API
                           │
              ┌────────────▼────────────┐
              │    Modular Monolith     │
              │                         │
              │ CRM Core                │
              │ Event Operations        │
              │ Communications          │
              │ Automation              │
              │ Finance                 │
              │ Documents               │
              │ AI                      │
              │ Analytics               │
              └────────────┬────────────┘
                           │
                    Domain Events
                           │
              ┌────────────▼────────────┐
              │ Background Workers      │
              │ BullMQ / Redis          │
              └────────────┬────────────┘
                           │
              ┌────────────▼────────────┐
              │ PostgreSQL + pgvector   │
              └─────────────────────────┘
```

V2 should introduce Redis + BullMQ as standard infrastructure.

---

# 3. V2 Primary Capabilities

V2 adds:

1. Advanced choreographer management.
2. Teams/groups.
3. Event sessions/classes/workshops.
4. Schedule management.
5. QR check-in.
6. Attendance.
7. Communication templates.
8. Omnichannel-ready communication architecture.
9. Automation engine.
10. Campaigns and transactional messaging.
11. Finance/payment layer.
12. Mollie integration.
13. Refund workflow.
14. Documents/contracts.
15. File storage provider architecture.
16. Google Drive integration.
17. Advanced AI assistant.
18. Controlled AI actions.
19. Duplicate/contact merge workflow.
20. Custom fields.
21. Saved views/segments.
22. Advanced search.
23. Notifications.
24. Event tasks/operations.
25. Analytics.
26. Data export/import.
27. GDPR workflows.
28. Webhooks.
29. API keys.
30. Integration/event observability.

---

# 4. Updated Main Menu

```text
Dashboard

People
├── All contacts
├── Participants
├── Choreographers
├── Customers
├── Teams & Groups
├── Segments
├── Duplicates
└── Tags

Events
├── All events
├── Calendar
├── Sessions & Workshops
├── Schedule
├── Registrations
├── Check-in
├── Attendance
├── Tasks
└── Venues

Ticketing
├── Orders
├── Tickets
├── Ticket Types
├── Sync
└── Refunds

Communications
├── Inbox
├── Drafts
├── Templates
├── Campaigns
├── Automations
└── Delivery Log

Finance
├── Overview
├── Payments
├── Refunds
├── Choreographer Costs
└── Transactions

AI
├── Assistant
├── Knowledge Base
├── Prompts
├── AI Rules
├── Review Queue
└── AI Activity

Documents
├── All Documents
├── Contracts
├── Templates
└── Files

Analytics
├── Overview
├── Events
├── Ticket Sales
├── Participants
├── Choreographers
├── Communications
└── Retention

Operations
├── Tasks
├── Notifications
├── Job Monitor
└── Integration Health

Settings
├── Organization
├── Users & Roles
├── Providers
├── Custom Fields
├── Tags
├── Automations
├── API Keys
├── Webhooks
├── GDPR
└── Audit Log
```

---

# 5. Person Domain V2

V1 `Person` remains the canonical identity.

Add:

```text
preferredName
preferredChannel
marketingStatus
timezone
avatarUrl
lastInteractionAt
```

Do not add arbitrary business-specific columns endlessly.

Introduce Custom Fields.

---

# 6. Custom Fields

Entities supported initially:

```text
PERSON
EVENT
REGISTRATION
CHOREOGRAPHER_ASSIGNMENT
```

Model:

```text
CustomFieldDefinition
---------------------
id
entityType
key
label
type
required
options JSONB
active
sortOrder
createdAt
updatedAt
```

Types:

```text
TEXT
TEXTAREA
NUMBER
BOOLEAN
DATE
DATETIME
SELECT
MULTISELECT
URL
EMAIL
PHONE
```

Values:

```text
CustomFieldValue
----------------
id
definitionId
entityType
entityId
value JSONB
createdAt
updatedAt
```

Validate values against field definition.

---

# 7. Contact Duplicate Resolution

V1 intentionally avoids unsafe automatic merging.

V2 introduces:

```text
DuplicateCandidate
------------------
id
personAId
personBId
score
reasons JSONB
status
createdAt
resolvedAt
resolvedBy
```

Statuses:

```text
PENDING
MERGED
NOT_DUPLICATE
IGNORED
```

Possible signals:

```text
same normalized email
same phone
similar name + same order
same external identity anomaly
```

AI/fuzzy logic may suggest duplicates.

Only deterministic rules or human approval can merge them.

---

# 8. Person Merge

Merge operation must be transactional.

```text
Person A
Person B
   ↓
Human selects canonical values
   ↓
Move relationships
   ↓
Move roles
   ↓
Move tags
   ↓
Move registrations
   ↓
Move tickets/orders where valid
   ↓
Move conversations
   ↓
Move external identities
   ↓
Archive merged record
   ↓
Audit
```

Create:

```text
PersonMerge
-----------
id
sourcePersonId
targetPersonId
fieldDecisions JSONB
performedBy
createdAt
```

Never hard-delete source identity immediately.

---

# 9. Teams & Groups

Introduce reusable groups:

```text
Group
-----
id
name
type
description
leaderPersonId nullable
status
createdAt
updatedAt
```

Types:

```text
DANCE_TEAM
COMPANY
SCHOOL
OTHER
```

Members:

```text
GroupMember
-----------
id
groupId
personId
role
joinedAt
leftAt nullable
```

This supports dance teams registering multiple people.

---

# 10. Event Sessions

V1 Event represents the whole event.

V2 introduces:

```text
EventSession
------------
id
eventId
type
title
description
startAt
endAt
venueId nullable
roomId nullable
capacity nullable
status
createdAt
updatedAt
```

Types:

```text
WORKSHOP
CLASS
COMPETITION
REGISTRATION
CHECK_IN
MEETING
REHEARSAL
PERFORMANCE
OTHER
```

Example:

```text
LITO Dance Camp 2027
├── Workshop — Choreographer A
├── Workshop — Choreographer B
├── Rehearsal
├── Competition
└── Closing Party
```

---

# 11. Session Choreographers

```text
SessionChoreographer
--------------------
id
sessionId
personId
role
notes
createdAt
```

One session may have multiple choreographers.

---

# 12. Session Registration

```text
SessionRegistration
-------------------
id
sessionId
registrationId
status
source
createdAt
updatedAt
```

Statuses:

```text
REGISTERED
WAITLIST
CHECKED_IN
CANCELLED
NO_SHOW
```

This allows participant-level workshop registration **as an internal CRM record**. Staff or trusted integrations create/update it; participants do not log into CRM to manage sessions.

---

# 13. Venues & Rooms

```text
Venue
-----
id
name
address
city
country
timezone
notes
```

```text
VenueRoom
---------
id
venueId
name
capacity
notes
```

Sessions reference rooms.

---

# 14. Schedule Engine

Calendar views:

```text
Day
Week
Event
Room
Choreographer
```

Conflict detection:

```text
same choreographer in overlapping sessions
same room in overlapping sessions
session exceeds room capacity
session outside event period
```

Conflicts should produce warnings, not silently save invalid schedules.

Critical conflicts may require explicit override permission.

---

# 15. Choreographer Profile V2

Person with `CHOREOGRAPHER` role receives additional profile:

```text
ChoreographerProfile
--------------------
personId
stageName
bio
instagram
website
country
travelNotes
dietaryNotes
technicalNotes
defaultCurrency
defaultFee nullable
createdAt
updatedAt
```

Sensitive fields require restricted permissions.

---

# 16. Choreographer Event Assignment

Extend V1 assignment:

```text
EventChoreographer
------------------
eventId
personId
status
roleTitle

feeType
feeAmount
currency

travelStatus
hotelStatus
contractStatus
paymentStatus

arrivalAt
departureAt

notes
```

Statuses should use controlled enums.

This becomes the operational hub for talent management.

---

# 17. Choreographer Operations View

Example:

```text
Beau Example

Event
LITO 2027

Status
Confirmed

Contract
Signed

Fee
€1,500

Travel
Flight confirmed

Hotel
Booked

Sessions
2

Payment
Pending
```

Tabs:

```text
Overview
Events
Sessions
Travel
Finance
Documents
Communication
Activity
```

---

# 18. Check-in System

Event-level QR check-in.

Every registration receives:

```text
checkInToken
```

Use random cryptographically secure token.

QR must NOT contain personal information.

The QR contains only an opaque identifier/token. It must not expose personal data.

The participant does **not** open a CRM check-in page. An authenticated staff member opens the internal CRM check-in screen and scans the participant's Weeztix/external ticket QR or CRM-mapped token.

```text
Participant presents ticket QR
        ↓
Staff uses authenticated CRM Check-in
        ↓
CRM resolves Ticket / Registration
        ↓
Staff records check-in
```

Prefer reusing the Weeztix ticket identifier when available instead of creating a second customer-facing QR flow.

---

# 19. Check-in Record

```text
CheckIn
-------
id
eventId
registrationId
sessionId nullable
checkedInAt
checkedInByUserId nullable
method
deviceId nullable
metadata JSONB
```

Methods:

```text
QR
MANUAL
IMPORT
```

Prevent accidental duplicate check-in while preserving history.

---

# 20. Check-in UI

Desktop/tablet:

```text
Scan QR

✓ Anna Smith

LITO 2027
Weekend Pass

Checked in
09:31
```

Exception:

```text
⚠ Ticket cancelled

Do not admit
```

Manual search:

```text
name
email
ticket ID
barcode
```

---

# 21. Attendance

Separate attendance from event entry.

```text
Attendance
----------
id
sessionId
registrationId
status
recordedAt
recordedBy
```

Statuses:

```text
PRESENT
ABSENT
LATE
EXCUSED
```

Useful for workshops/classes.

---

# 22. Communication Templates

```text
CommunicationTemplate
---------------------
id
name
channel
category
language
subject nullable
content
variables JSONB
status
createdAt
updatedAt
```

Examples:

```text
ticket_confirmation
event_reminder
schedule_change
choreographer_invitation
payment_reminder
post_event_thank_you
```

Variables:

```text
{{person.firstName}}
{{event.name}}
{{event.startAt}}
{{ticket.type}}
```

Template rendering must fail safely for required missing variables.

---

# 23. Communication Channel Architecture

V1:

```text
EMAIL
```

V2 domain supports:

```text
EMAIL
SMS
WHATSAPP
TELEGRAM
PUSH
```

Not every provider needs implementation in V2.

Create:

```ts
interface CommunicationProvider {
  channel: CommunicationChannel;

  send(input: SendMessageInput): Promise<SendMessageResult>;
}
```

Keep `Conversation` and `Message` channel-neutral.

---

# 24. Campaigns

Campaigns are controlled bulk communication.

```text
Campaign
--------
id
name
channel
eventId nullable
segmentId nullable
templateId nullable
status
scheduledAt nullable
startedAt nullable
finishedAt nullable
createdBy
createdAt
updatedAt
```

Statuses:

```text
DRAFT
SCHEDULED
RUNNING
PAUSED
COMPLETED
CANCELLED
FAILED
```

---

# 25. Campaign Recipients

Snapshot recipients when campaign begins.

```text
CampaignRecipient
-----------------
id
campaignId
personId
destination
status
sentAt
deliveredAt nullable
failedAt nullable
error nullable
```

This ensures campaign history does not change when a segment later changes.

---

# 26. Segments

Dynamic segments:

```text
Segment
-------
id
name
entityType
definition JSONB
createdBy
createdAt
updatedAt
```

Example:

```text
Event = LITO 2027
AND Registration = CONFIRMED
AND Language = EN
```

Another:

```text
Has role = CHOREOGRAPHER
AND Country = Netherlands
```

Do not execute arbitrary SQL stored in segments.

Create a safe filter DSL.

---

# 27. Saved Views

Users can save table filters:

```text
SavedView
---------
id
userId
entityType
name
filters JSONB
columns JSONB
sort JSONB
isDefault
```

Examples:

```text
LITO unpaid participants
Confirmed choreographers
Open refund requests
```

---

# 28. Automation Engine

V2 introduces a real automation system.

Core model:

```text
Trigger
    ↓
Conditions
    ↓
Actions
```

Examples:

```text
WHEN registration.created

IF event = LITO 2027

THEN
add tag
send welcome email
create task
```

---

# 29. Automation Model

```text
Automation
----------
id
name
status
triggerType
triggerConfig JSONB
conditions JSONB
createdBy
createdAt
updatedAt
```

```text
AutomationAction
----------------
id
automationId
position
type
config JSONB
```

Statuses:

```text
DRAFT
ACTIVE
PAUSED
ARCHIVED
```

---

# 30. V2 Automation Triggers

Initial triggers:

```text
PERSON_CREATED
ROLE_ADDED

REGISTRATION_CREATED
REGISTRATION_CANCELLED
CHECK_IN_COMPLETED

ORDER_CREATED
ORDER_PAID
TICKET_CREATED

EMAIL_RECEIVED
CONVERSATION_RESOLVED

EVENT_STARTING
SESSION_STARTING

PAYMENT_FAILED

CHOREOGRAPHER_CONFIRMED
CONTRACT_SIGNED

SCHEDULE
```

---

# 31. Automation Conditions

Examples:

```text
eventId equals ...
person.language equals ...
registration.status equals ...
ticket.type equals ...
person has tag ...
order.total greaterThan ...
email.intent equals ...
```

Use a typed condition DSL.

Example:

```json
{
  "all": [
    {
      "field": "registration.status",
      "operator": "eq",
      "value": "CONFIRMED"
    },
    {
      "field": "person.language",
      "operator": "eq",
      "value": "en"
    }
  ]
}
```

---

# 32. Automation Actions

V2 actions:

```text
ADD_TAG
REMOVE_TAG

CREATE_TASK

SEND_EMAIL
CREATE_EMAIL_DRAFT

UPDATE_REGISTRATION

CREATE_NOTIFICATION

RUN_AI_CLASSIFICATION
GENERATE_AI_DRAFT

WEBHOOK
```

Dangerous actions should not initially include:

```text
refund payment
delete person
change permissions
```

---

# 33. Automation Runs

Every execution must be inspectable.

```text
AutomationRun
-------------
id
automationId
triggerType
triggerEntityType
triggerEntityId
status
startedAt
finishedAt
error
context JSONB
```

```text
AutomationActionRun
-------------------
id
automationRunId
actionId
status
input JSONB
output JSONB
error
startedAt
finishedAt
```

This is critical for debugging.

---

# 34. Event Tasks

```text
Task
----
id
title
description
eventId nullable
personId nullable
assignedUserId nullable
type
status
priority
dueAt nullable
createdBy
createdAt
updatedAt
```

Statuses:

```text
TODO
IN_PROGRESS
BLOCKED
DONE
CANCELLED
```

Priorities:

```text
LOW
NORMAL
HIGH
URGENT
```

Examples:

```text
Book hotel for choreographer
Confirm music
Send venue details
Review refund
Check visa
```

---

# 35. Task Automation

Automation can create tasks.

Example:

```text
WHEN choreographer confirmed

THEN
Create task: Send contract
Create task: Arrange hotel
Create task: Confirm travel
```

Tasks remain human-owned deterministic actions.

---

# 36. Finance Domain

V2 introduces a normalized finance layer.

Do not make Mollie objects the domain.

Core:

```text
Payment
Refund
FinancialTransaction
```

---

# 37. Payment

```text
Payment
-------
id
personId nullable
orderId nullable
providerConnectionId nullable
externalId nullable
amount
currency
status
method nullable
paidAt nullable
failedAt nullable
metadata JSONB
createdAt
updatedAt
```

Statuses:

```text
PENDING
AUTHORIZED
PAID
FAILED
CANCELLED
REFUNDED
PARTIALLY_REFUNDED
```

---

# 38. Refund

```text
Refund
------
id
paymentId
orderId nullable
personId nullable
amount
currency
reason
status
requestedBy
approvedBy nullable
providerExternalId nullable
createdAt
processedAt nullable
```

Statuses:

```text
REQUESTED
APPROVED
PROCESSING
COMPLETED
REJECTED
FAILED
```

Refund execution requires permission.

AI can classify/refine request but cannot approve or execute it.

---

# 39. Mollie Adapter

Introduce:

```ts
interface PaymentProvider {
  testConnection(): Promise<ConnectionResult>;
  getPayment(id: string): Promise<ExternalPayment>;
  createRefund(input: RefundInput): Promise<ExternalRefund>;
}
```

Implementation:

```text
MolliePaymentProvider
```

All Mollie webhooks must be:

- authenticated/validated as appropriate;
- idempotent;
- logged;
- re-fetch authoritative payment state when recommended.

---

# 40. Choreographer Costs

```text
ChoreographerCost
-----------------
id
eventChoreographerId
type
description
amount
currency
status
documentId nullable
createdAt
updatedAt
```

Types:

```text
FEE
TRAVEL
HOTEL
PER_DIEM
OTHER
```

Status:

```text
PLANNED
APPROVED
PAID
CANCELLED
```

---

# 41. Event Financial Overview

For each event show:

```text
Ticket revenue
Refunds
Net ticket revenue

Choreographer fees
Travel costs
Hotel costs
Other costs

Estimated margin
```

Clearly label:

```text
actual
estimated
pending
```

Do not mix them invisibly.

---

# 42. Documents

```text
Document
--------
id
type
title
personId nullable
eventId nullable
eventChoreographerId nullable
status
storageProviderConnectionId nullable
storageExternalId nullable
mimeType
size
metadata JSONB
createdAt
updatedAt
```

Types:

```text
CONTRACT
INVOICE
TRAVEL
IDENTITY
EVENT_FILE
OTHER
```

Sensitive document permissions must be stricter than general person read permission.

---

# 43. Contract Domain

```text
Contract
--------
id
documentId
personId
eventId nullable
status
sentAt nullable
signedAt nullable
expiresAt nullable
createdAt
updatedAt
```

Statuses:

```text
DRAFT
READY
SENT
SIGNED
DECLINED
EXPIRED
CANCELLED
```

V2 may track external signing state without building a full e-signature engine.

A choreographer does not receive a CRM account. Signing occurs through an external provider/link; CRM stores and synchronizes the resulting status.

---

# 44. Document Templates

```text
DocumentTemplate
----------------
id
name
type
content
variables JSONB
status
createdAt
updatedAt
```

Generate contracts from structured CRM data.

Human must review legal documents before external use unless explicitly approved workflow exists.

---

# 45. Storage Provider

```ts
interface StorageProvider {
  upload(file: UploadInput): Promise<StoredFile>;
  getDownloadUrl(id: string): Promise<string>;
  delete(id: string): Promise<void>;
}
```

Implement:

```text
GoogleDriveStorageProvider
```

Optionally local/S3-compatible storage later.

Domain stores provider-independent document metadata.

---

# 46. Notifications

Internal CRM notifications for authenticated staff only:

```text
Notification
------------
id
userId
type
title
body
entityType nullable
entityId nullable
readAt nullable
createdAt
```

Examples:

```text
AI draft needs review
Weeztix sync failed
Refund needs approval
Choreographer contract signed
Event starts tomorrow
Automation failed
```

---

# 47. Notification Center

Header icon:

```text
Notifications (7)
```

Filters:

```text
All
Unread
Operations
Finance
AI
Integrations
```

Do not use email for every internal notification.

---

# 48. Advanced AI Assistant

V1 AI:

```text
classify → retrieve → draft
```

V2 AI Assistant can answer internal operational questions.

Examples:

```text
"How many confirmed participants does LITO have?"

"Which choreographers still have no signed contract?"

"Show open emails about refunds."

"Summarize today's participant issues."

"Which workshops are almost full?"
```

---

# 49. AI Architecture V2

```text
User question
     ↓
Intent Router
     ↓
Permission Context
     ↓
Tool Selection
     ↓
Read-only CRM Tools
     ↓
Knowledge Retrieval
     ↓
LLM Synthesis
     ↓
Answer + references
```

AI must never bypass RBAC.

If user cannot view finance, AI cannot retrieve finance.

---

# 50. AI Tools

Initial read-only tools:

```text
search_people
get_person
search_events
get_event
search_registrations
search_orders
search_tickets
search_conversations
search_tasks
search_choreographers
get_event_financial_summary
search_knowledge
```

Tools call application/query services.

Never expose arbitrary SQL.

---

# 51. Controlled AI Actions

V2 may support **proposed actions**:

```text
"Create a task to call Anna tomorrow."
```

AI produces:

```text
Proposed Action
CREATE_TASK
```

UI displays:

```text
Create task?
Call Anna
Due tomorrow
Assigned to Denys

[Cancel] [Confirm]
```

Only confirmation executes state change.

---

# 52. AI Action Proposal

```text
AiActionProposal
----------------
id
userId
type
payload JSONB
status
expiresAt
executedAt nullable
createdAt
```

Statuses:

```text
PENDING
CONFIRMED
REJECTED
EXPIRED
EXECUTED
FAILED
```

Never execute a stale proposal after context changes without validation.

---

# 53. AI Review Queue

Central screen:

```text
AI Review Queue

Draft replies
Extracted data
Duplicate suggestions
Action proposals
Low-confidence classifications
```

This creates a single human-in-the-loop workspace.

---

# 54. Prompt Registry

```text
PromptDefinition
----------------
id
key
version
purpose
systemPrompt
schema JSONB nullable
status
createdAt
```

Never silently overwrite production prompts.

New prompt:

```text
email_reply v3
```

instead of editing historical v2.

AI records reference prompt version.

---

# 55. AI Evaluation Dataset

Create:

```text
AiEvaluationCase
----------------
id
type
input JSONB
expected JSONB
tags
active
createdAt
```

Run regression evaluations when:

```text
model changes
prompt changes
retrieval changes
```

Track:

```text
classification accuracy
language accuracy
groundedness
human acceptance
edit distance
failure rate
```

---

# 56. AI Feedback

On draft:

```text
Useful
Not useful
Incorrect information
Wrong tone
Missing context
```

Model:

```text
AiFeedback
----------
id
aiDraftId nullable
aiInteractionId nullable
userId
rating
reason
comment nullable
createdAt
```

Use feedback for evaluation, not automatic self-training.

---

# 57. Knowledge V2

Knowledge sources:

```text
manual text
website
uploaded document
Google Drive document
event data
FAQ
policy
```

Introduce:

```text
KnowledgeSource
---------------
id
type
name
scope
eventId nullable
providerConnectionId nullable
config JSONB
syncStatus
lastSyncAt
createdAt
updatedAt
```

---

# 58. Knowledge Sync

Pipeline:

```text
Source
  ↓
Fetch
  ↓
Parse
  ↓
Normalize
  ↓
Version
  ↓
Chunk
  ↓
Embed
  ↓
Index
```

Never destroy previous document version immediately.

---

# 59. Knowledge Versioning

```text
KnowledgeDocumentVersion
------------------------
id
documentId
version
content
contentHash
createdAt
```

If source content hash is unchanged:

```text
skip re-embedding
```

---

# 60. Retrieval Permissions

Knowledge may be:

```text
PUBLIC_OPERATIONAL
INTERNAL
FINANCE
PRIVATE
```

AI retrieval must apply permission filters before vector similarity.

---

# 61. Search V2

Global search supports:

```text
People
Events
Orders
Tickets
Conversations
Tasks
Documents
Choreographers
```

Search UI:

```text
Cmd/Ctrl + K
```

Results grouped by entity.

PostgreSQL full-text + trigram search.

Enable:

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

---

# 62. Analytics Architecture

Do not introduce a separate warehouse yet.

Use PostgreSQL operational reporting with:

```text
indexed queries
summary tables/materialized views where required
background refresh
```

Introduce warehouse only when volume proves necessary.

---

# 63. Event Analytics

Metrics:

```text
tickets sold
gross revenue
refunds
net revenue
participants
check-in rate
no-show rate
session attendance
countries
languages
repeat participants
open support conversations
average response time
```

---

# 64. Choreographer Analytics

Metrics:

```text
events
sessions
participant attendance
cost per event
cost per session
participant feedback later
```

Do not create misleading "performance scores" without defined methodology.

---

# 65. Communication Analytics

Metrics:

```text
inbound messages
needs reply
median first response time
resolution time
AI draft rate
AI acceptance rate
AI edited rate
top intents
messages per event
```

---

# 66. Retention Analytics

Examples:

```text
First-time participant
Repeat participant
Events attended
Last event
Lifetime ticket value
```

Avoid calling this customer LTV unless the calculation is formally defined.

---

# 67. Operational Dashboard

Dashboard sections:

```text
Today

Upcoming sessions
Check-in status
Open urgent tasks
Emails needing reply
Refunds awaiting approval
Choreographer issues
Automation failures
Integration failures
```

Dashboard should be actionable, not only KPI decoration.

---

# 68. Import Framework

Support CSV import:

```text
People
Registrations
Choreographers
```

Pipeline:

```text
Upload
  ↓
Detect columns
  ↓
Map fields
  ↓
Validate
  ↓
Preview
  ↓
Import
  ↓
Report
```

No import should mutate data before preview confirmation.

---

# 69. Export Framework

Authorized users may export:

```text
People
Participants
Registrations
Orders
Tickets
Finance
```

Every sensitive export creates an AuditLog entry.

Large exports run asynchronously.

---

# 70. GDPR Data Export

Authorized staff Person page:

```text
Privacy
├── Prepare personal-data export
├── Anonymize according to policy
└── Retention information
```

These are internal administrative operations. V2 does not include a customer privacy portal.

Export includes relevant:

```text
profile
roles
registrations
orders
tickets
communications where legally appropriate
activity
consents
```

---

# 71. GDPR Anonymization

Never simply delete a Person with financial history.

Create a policy-driven anonymization process.

Example:

```text
name → anonymized
email → removed/hash as appropriate
phone → removed
notes → reviewed/removed
financial records → retained where legally required
audit → retained
```

Require explicit permission and confirmation.

---

# 72. Consent

```text
Consent
-------
id
personId
type
status
source
capturedAt
withdrawnAt nullable
metadata JSONB
```

Types:

```text
MARKETING_EMAIL
MARKETING_SMS
PHOTO_VIDEO
TERMS
OTHER
```

Campaign recipient resolution must respect applicable consent.

---

# 73. Webhooks Outbound

Allow external systems to subscribe.

```text
WebhookEndpoint
---------------
id
name
url
secretEncrypted
status
events JSONB
createdAt
updatedAt
```

Events:

```text
person.created
registration.created
ticket.created
checkin.completed
payment.paid
event.updated
```

---

# 74. Webhook Delivery

```text
WebhookDelivery
---------------
id
endpointId
eventType
eventId
status
attempts
responseStatus nullable
lastError nullable
nextRetryAt nullable
createdAt
```

Sign payloads using HMAC.

Retry with exponential backoff.

---

# 75. Internal / Integration API Keys

```text
ApiKey
------
id
name
keyHash
prefix
permissions JSONB
lastUsedAt nullable
expiresAt nullable
status
createdBy
createdAt
```

Never store plaintext API keys after creation.

Display secret once.

---

# 76. Rate Limiting

Separate limits:

```text
login
public API
webhooks
AI
provider sync
exports
```

Use Redis-backed rate limiting in multi-instance production.

---

# 77. Job Infrastructure

V2 standard:

```text
Redis
BullMQ
```

Queues:

```text
integrations
communications
ai
automation
knowledge
exports
webhooks
notifications
```

Do not create one queue per tiny use case.

---

# 78. Job Requirements

All jobs should support where relevant:

```text
idempotency
retry
backoff
timeout
structured error
correlation ID
dead-letter handling
```

Job dashboard:

```text
Operations → Job Monitor
```

---

# 79. Outbox Pattern

Introduce a transactional outbox for important asynchronous domain events.

```text
OutboxEvent
-----------
id
type
aggregateType
aggregateId
payload JSONB
status
createdAt
processedAt nullable
attempts
```

Business transaction:

```text
Create Registration
+
Insert OutboxEvent
```

same PostgreSQL transaction.

Worker publishes/processes later.

This prevents:

```text
DB commit succeeded
but queue publish failed
```

---

# 80. Inbox/Outbox for Webhooks

External inbound webhooks require deduplication:

```text
InboundWebhook
--------------
id
provider
externalEventId
payloadHash
status
receivedAt
processedAt nullable
```

Unique external event IDs where provider supports them.

---

# 81. Integration Observability

Provider page:

```text
Status
Last successful request
Last sync
Requests today
Failures
Average duration
Rate limit state
Recent errors
```

Do not store sensitive response payloads in general logs.

---

# 82. Provider Registry V2

Provider categories:

```text
TICKETING
EMAIL
AI
PAYMENT
STORAGE
MESSAGING
SIGNATURE
```

Possible providers:

```text
Weeztix
Gmail
OpenAI
Ollama
Mollie
Google Drive
future WhatsApp provider
future signature provider
```

---

# 83. Secrets Management

V1 application encryption can remain initially.

V2 production architecture should support secret-provider abstraction:

```ts
interface SecretStore {
  get(key: string): Promise<string>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}
```

Possible future implementation:

```text
Vault
cloud secret manager
```

Do not require migration now if current encrypted storage is secure enough.

---

# 84. RBAC V2

Add permissions:

```text
choreographers.finance.read
choreographers.finance.write

checkin.use
checkin.override

campaigns.read
campaigns.send

finance.read
finance.refund.request
finance.refund.approve

documents.read
documents.sensitive.read
documents.write

automation.read
automation.manage

ai.actions.propose
ai.actions.confirm

exports.create
gdpr.manage

api.manage
webhooks.manage
```

Use least privilege.

---

# 85. Optional Event-Scoped Permissions

Design for:

```text
User A can manage Event X
User B can manage Event Y
```

V2 may introduce:

```text
UserEventAccess
---------------
userId
eventId
role
```

Global OWNER/ADMIN can bypass event scoping.

All event-aware queries must enforce scope centrally.

---

# 86. Audit V2

Audit additional actions:

```text
refund approved
refund executed
person merged
person anonymized
export generated
campaign sent
contract accessed
provider credential changed
API key created/revoked
automation enabled
AI action confirmed
check-in override
```

Audit remains immutable.

---

# 87. Security Event Log

Separate from normal audit if needed:

```text
SecurityEvent
-------------
id
type
userId nullable
ipAddress
metadata JSONB
createdAt
```

Examples:

```text
LOGIN_FAILED
RATE_LIMITED
SUSPICIOUS_API_KEY
PERMISSION_DENIED
```

---

# 88. Performance

V2 requirements:

- paginate every large list;
- background large exports;
- async campaigns;
- async embeddings;
- async external sync;
- proper compound indexes;
- avoid N+1 Prisma queries;
- profile dashboard queries;
- materialize expensive analytics if required.

Do not add Redis caching blindly.

Cache only measured bottlenecks.

---

# 89. PostgreSQL V2 Extensions

Recommended:

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

Potential future:

```text
PostGIS
```

only if geographic queries become a real requirement.

---

# 90. Data Retention Jobs

Create configurable policies for:

```text
raw provider payloads
job logs
webhook payloads
AI context snapshots
export files
security logs
```

Do not delete canonical financial/audit data without legal/business policy.

---

# 91. Frontend V2

Continue FSD.

Add entities:

```text
session
venue
group
task
payment
refund
document
campaign
automation
notification
segment
```

Features:

```text
scan-checkin
build-segment
send-campaign
create-automation
approve-refund
merge-person
generate-contract
confirm-ai-action
```

---

# 92. Event Command Center

Create an event-specific operational page:

```text
Event Command Center

Today
├── Sessions
├── Check-in
├── Attendance
├── Tasks
├── Choreographers
├── Inbox
├── Alerts
└── Live KPIs
```

This should be optimized for event-day use.

---

# 93. Mobile/Tablet Responsive Operations

Do not build native apps yet.

Make responsive web interfaces for:

```text
QR check-in
participant lookup
task completion
session attendance
choreographer lookup
```

Use PWA capabilities later if justified.

---

# 94. Offline Check-in Preparation

Full offline-first mode is optional V2+.

But design check-in so a future client can cache:

```text
registration ID
display name
ticket status
QR token hash
```

and reconcile check-ins later.

Do not expose unnecessary PII in offline caches.

---

# 95. Schedule Change Workflow

When a session changes:

```text
Update session
     ↓
Detect affected registrations
     ↓
Show impact
     ↓
Optional notification proposal
     ↓
Admin confirms
     ↓
Campaign/transactional messages queued
```

Do not automatically message thousands of people after an accidental edit.

---

# 96. Refund Workflow

```text
Email refund request
       ↓
AI intent = REFUND_REQUEST
       ↓
Link Person / Order / Payment
       ↓
Create Refund Request
       ↓
Human review
       ↓
Approve
       ↓
Mollie adapter
       ↓
Provider confirms
       ↓
Update Payment / Refund
       ↓
Notify customer
       ↓
Audit
```

This is a model V2 cross-module workflow.

---

# 97. Choreographer Workflow

```text
Create/find Person
       ↓
CHOREOGRAPHER role
       ↓
Assign Event
       ↓
Invite
       ↓
Confirm
       ↓
Generate contract
       ↓
Sign
       ↓
Create travel/hotel tasks
       ↓
Assign sessions
       ↓
Event
       ↓
Record costs/payment
       ↓
Complete
```

---

# 98. Participant Lifecycle

```text
Lead/contact
     ↓
Buyer
     ↓
Ticket holder
     ↓
Registration confirmed
     ↓
Pre-event communication
     ↓
Check-in
     ↓
Session attendance
     ↓
Post-event communication
     ↓
Repeat participant
```

The Person identity remains stable throughout.

---

# 99. Campaign Safety

Before send show:

```text
Campaign
Recipients: 428

English: 310
Dutch: 72
Ukrainian: 46

No consent: 19 excluded
Missing email: 3 excluded

[Send test]
[Schedule]
[Send]
```

Require confirmation for bulk send.

---

# 100. Automation Safety

Before activating automation show:

```text
Trigger
Conditions
Actions
Estimated recent matches
Potential side effects
```

Provide:

```text
Test automation
```

against historical/sample data without executing side effects.

---

# 101. Dry Run Framework

Support dry run for:

```text
campaign recipient resolution
automation
person import
ticket sync mapping
knowledge sync
```

Dry runs should produce reports without state-changing actions.

---

# 102. Feature Flags

Introduce:

```text
FeatureFlag
-----------
key
enabled
config JSONB
```

Use for risky/new modules:

```text
ai_actions
campaigns
refund_execution
new_checkin
```

Feature flags are not permission controls.

---

# 103. Organization Settings

```text
Organization
------------
name
legalName
timezone
defaultLanguage
defaultCurrency
supportEmail
logo
```

Centralize these values.

Do not hard-code event brand assumptions.

---

# 104. Multi-brand Preparation

V2 does not need full multi-tenant SaaS.

But support:

```text
Brand
-----
id
name
slug
logo
defaultEmailFrom
settings JSONB
```

Event may reference a Brand.

Useful for operating multiple event brands inside one CRM.

Do not introduce tenant isolation unless actual external organizations share the platform.

---

# 104.1 API Boundary

The API supports:

```text
internal CRM frontend
background workers
trusted provider integrations
controlled internal integrations
```

It is NOT a public customer/participant/choreographer API. Do not design API authentication or resources around external people logging into CRM or directly mutating their CRM records.

# 105. API V2 Additions

Examples:

```text
GET/POST /groups
GET/POST /events/:id/sessions
GET/POST /sessions/:id/registrations

POST /check-in/scan
POST /check-in/manual

GET/POST /tasks

GET/POST /segments
POST /segments/:id/preview

GET/POST /campaigns
POST /campaigns/:id/test
POST /campaigns/:id/schedule
POST /campaigns/:id/send

GET/POST /automations
POST /automations/:id/test
POST /automations/:id/activate

GET /payments
GET/POST /refunds
POST /refunds/:id/approve
POST /refunds/:id/process

GET/POST /documents
GET/POST /contracts

POST /people/:id/merge-preview
POST /people/:id/merge

POST /ai/assistant
POST /ai/actions/:id/confirm

GET /analytics/events/:id

POST /exports

GET/POST /webhooks
GET/POST /api-keys
```

---

# 106. API Versioning

Continue:

```text
/api/v1
```

for compatible additions if semantics remain compatible.

Only introduce:

```text
/api/v2
```

when breaking API behavior is actually required.

Product V2 does not automatically mean API v2.

---

# 107. Testing V2

Critical E2E flows:

```text
choreographer onboarding
session scheduling
schedule conflict
participant QR check-in
campaign test/send
automation execution
refund approval
Mollie refund
person merge
contract generation
AI assistant read-only query
AI proposed action confirmation
GDPR export
```

---

# 108. Contract Tests

Create adapter contract tests for:

```text
TicketingProvider
EmailProvider
AiProvider
PaymentProvider
StorageProvider
CommunicationProvider
```

All implementations must satisfy the same behavioral contract.

---

# 109. V2 Deployment

Recommended production processes:

```text
web
worker-integrations
worker-communications
worker-ai
worker-automation
```

They can use the same codebase/image with different commands.

This is still a modular monolith deployment architecture, not microservices.

---

# 110. Docker Production Concept

```text
crm-web
crm-worker
crm-postgres
crm-redis
ollama optional
reverse-proxy
```

At larger scale:

```text
crm-worker-ai
crm-worker-integrations
crm-worker-automation
```

can scale independently.

---

# 111. Backup V2

Back up:

```text
PostgreSQL
documents not externally durable
provider configuration metadata
encryption-key recovery process
```

Requirements:

```text
daily backup
off-server copy
retention
encrypted backups
regular restore test
documented recovery procedure
```

---

# 112. Disaster Recovery

Document:

```text
RPO
RTO
database restore
secret recovery
provider reconnect
queue recovery
document recovery
```

Do not claim disaster recovery exists until restore has been tested.

---

# 113. Monitoring

Monitor:

```text
API error rate
API latency
PostgreSQL health
Redis health
queue depth
failed jobs
Weeztix sync age
Gmail sync age
Mollie webhook failures
AI failure rate
knowledge indexing failures
disk
backup age
```

Alert only on actionable conditions.

---

# 114. V2 Implementation Phases

## Phase 1 — Operations Foundation

```text
Redis
BullMQ
Outbox
Tasks
Notifications
Job Monitor
Integration Health
```

## Phase 2 — Event Operations

```text
Venues
Rooms
Sessions
Schedule
Conflict detection
Check-in
Attendance
Event Command Center
```

## Phase 3 — Talent Management

```text
ChoreographerProfile
Extended EventChoreographer
Costs
Travel/hotel statuses
Documents
Contracts
```

## Phase 4 — Communication Platform

```text
Templates
Segments
Saved Views
Campaigns
Delivery Log
Communication provider abstraction
```

## Phase 5 — Automation

```text
Triggers
Conditions
Actions
Runs
Dry-run
Automation UI
```

## Phase 6 — Finance

```text
Payments
Mollie
Refund workflow
Choreographer costs
Event financial overview
```

## Phase 7 — AI Platform

```text
AI Assistant
Read-only tools
AI Review Queue
Action proposals
Prompt Registry
Evaluation
Feedback
Knowledge versioning
```

## Phase 8 — Data & Platform

```text
Duplicates
Merge
Custom fields
Import/export
GDPR
API keys
Webhooks
Analytics
Feature flags
Multi-brand preparation
```

## Phase 9 — Hardening

```text
RBAC review
Event scoping
Performance
Security
Backups
DR test
Load tests
E2E
Observability
```

---

# 115. V2 Definition of Done

V2 is considered operationally complete when this scenario works:

1. Admin creates an event.
2. Admin creates sessions/workshops.
3. Choreographers are assigned.
4. Scheduling conflicts are detected.
5. Choreographer contract and operational tasks are tracked.
6. Weeztix imports buyers/tickets.
7. Participants register for relevant sessions.
8. Pre-event automation sends appropriate information.
9. Staff can use QR check-in.
10. Session attendance can be recorded.
11. Incoming support email is linked to participant/order/event.
12. AI creates a grounded draft.
13. Staff sends the reply.
14. Refund requests enter a controlled workflow.
15. Authorized staff can process an approved provider refund.
16. Campaigns can target a safe segment.
17. Consent exclusions are respected.
18. Automation runs are fully inspectable.
19. AI Assistant can answer authorized CRM questions.
20. AI can propose but not silently execute sensitive actions.
21. Choreographer costs and event revenue are visible.
22. Duplicate people can be safely reviewed and merged.
23. GDPR export/anonymization workflow exists.
24. API/webhook integrations are secure and auditable.
25. Failed jobs/providers are visible in Operations.
26. Restore procedure has been tested.
27. No customer, participant, buyer, or choreographer needs a CRM account for any V2 workflow.
28. Every operational CRM screen is protected by internal authentication and RBAC.

---

# 116. What V2 Must NOT Become

Do not turn V2 into:

```text
a customer portal
a participant portal
a choreographer portal
a self-service application
a collection of provider-specific screens
a giant Prisma service
a giant React admin component
an autonomous AI agent with unrestricted DB access
a workflow system based on scattered cron scripts
a financial ledger pretending to be accounting software
a microservice architecture without scale justification
```

Keep clear ownership:

```text
Domain → owns business state
Provider adapters → connect external capabilities
Workers → execute asynchronous work
Automation → coordinates predefined safe actions
AI → interprets/suggests within permissions
Human → approves sensitive actions
```

---

# 117. Coding Agent V2 Rules

The coding agent MUST:

1. Read V1 and V2 specifications.
2. Treat V2 as an extension of V1.
3. Preserve existing domain identifiers and relations where possible.
4. Create migrations, never destructive schema resets.
5. Write migration/backfill plans for changed data.
6. Use domain/application services for state changes.
7. Route asynchronous side effects through jobs/outbox where appropriate.
8. Keep provider-specific DTOs inside adapters.
9. Maintain idempotency.
10. Apply RBAC to every new API endpoint.
11. Apply event scope when enabled.
12. Audit sensitive actions.
13. Add tests for automation/refund/check-in/merge rules.
14. Never expose arbitrary SQL to AI.
15. Never allow LLM output to directly mutate sensitive state.
16. Validate all automation configs and conditions.
17. Add dry-run capability before high-volume operations.
18. Keep campaign recipients as execution snapshots.
19. Respect consent and privacy filters.
20. Never silently merge contacts.
21. Never store API keys plaintext.
22. Never put PII inside QR payloads.
23. Keep timestamps timezone-aware.
24. Use decimal money values.
25. Avoid provider network calls inside DB transactions.
26. Add an ADR for material architectural deviations.
27. Never create authentication or CRM accounts for `Person`.
28. Treat `User` as internal staff identity only.
29. Never build participant/customer/choreographer self-service screens from this specification.
30. All check-in and attendance screens require authenticated internal staff access.
31. External links/messages may be sent through providers, but must not implicitly create a CRM portal.

---

# 118. New ADRs

Add:

```text
0008-redis-bullmq-workers.md
0009-transactional-outbox.md
0010-event-session-model.md
0011-qr-checkin-token.md
0012-automation-engine.md
0013-finance-provider-abstraction.md
0014-document-storage-abstraction.md
0015-controlled-ai-actions.md
0016-ai-tool-permission-boundary.md
0017-person-merge-strategy.md
0018-custom-fields.md
0019-segment-filter-dsl.md
0020-multi-brand-preparation.md
```

---

# 119. Target V2 Domain Map

```text
                              PERSON
                                │
       ┌────────────────────────┼────────────────────────┐
       │                        │                        │
 PARTICIPANT              CHOREOGRAPHER              CUSTOMER
       │                        │                        │
       │                 ChoreographerProfile           │
       │                        │                        │
       │                 EventChoreographer              │
       │                        │                        │
       └──────────────┐         │         ┌──────────────┘
                      │         │         │
                      ▼         ▼         ▼
                           EVENT
                             │
                ┌────────────┼────────────┐
                │            │            │
             SESSION     REGISTRATION   TASKS
                │            │
                │        CHECK-IN
                │            │
             ATTENDANCE      │
                             │
                          TICKETS
                             │
                           ORDER
                             │
                          PAYMENT
                             │
                          REFUND

PERSON / EVENT
      │
      ▼
CONVERSATION
      │
   MESSAGE
      │
AI CLASSIFICATION
      │
RAG / KNOWLEDGE
      │
  AI DRAFT
      │
HUMAN APPROVAL


DOMAIN EVENTS
      │
      ▼
TRANSACTIONAL OUTBOX
      │
      ▼
BULLMQ WORKERS
      │
 ┌────┼──────────────┬─────────────┬───────────────┐
 │    │              │             │               │
EMAIL AUTOMATION  PROVIDERS      AI/RAG        WEBHOOKS


PROVIDERS
├── Weeztix
├── Gmail
├── OpenAI
├── Ollama
├── Mollie
└── Google Drive
```

---

# 120. V2 Architecture Summary

V1 answers:

> Who is this person, what event/order/ticket/conversation belongs to them, and how can staff manage communication safely?

V2 answers:

> How can internal staff operate and track the event lifecycle from one backoffice platform while customers, participants and choreographers continue interacting through external channels?

The resulting platform consists of six major capabilities:

```text
CRM
Event Operations
Talent Management
Communication & Automation
Finance & Documents
AI & Knowledge
```

all built around the same canonical entities and PostgreSQL system of record.

The architectural rule remains:

> **Business state belongs to the CRM domain. Providers are replaceable adapters. Automation coordinates deterministic actions. AI interprets and proposes. Sensitive decisions remain controlled and auditable.**
