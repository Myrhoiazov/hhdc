# HHDC Admin — Telegram Admin Bot Specification

> **Status (2026-09-24): superseded for the implemented subset.** Only Dashboard (§7), Student
> Search (§8), and Create Student (§9) were ever built as bot-driven conversational flows; Mollie
> Customer/Mandate/Subscription/Payment Link (§10-13) were never implemented. The flows that *were*
> built have since been retired — `/start` no longer drives §6's callback-menu conversation at all.
> Those three screens now live in the **Telegram Mini App** instead (a real web UI, not a
> chat-message flow); `/start` sends `web_app` deep-link buttons straight into it (or a `url`
> link into a private chat first, if `/start` came from a group — see below). §4 (Architecture),
> §5 (Access and Security), §14 (Conversation/Flow State — the flow-state store this described no
> longer exists), and §6 (Bot UX) describe the **retired** architecture; treat them as historical,
> not current. Current design/rollout history:
> `docs/superpowers/specs/2026-09-23-telegram-mini-app-design.md`,
> `docs/superpowers/plans/2026-09-23-telegram-mini-app.md`, and
> [docs/domain/identity.md](../domain/identity.md)'s "Telegram Mini App auth" section. §15 (Audit
> Logging), §16-18 (Error Handling/Reliability/Privacy principles) remain generally applicable.

## 1. Purpose

Implement a private Telegram Admin Bot as a **thin operational interface** over the existing HHDC Admin.

The Telegram bot MUST NOT duplicate the full CRM admin panel. It exists only for frequent administrative and payment operations that should be possible quickly from Telegram.

Core principle:

> Telegram Bot is not a second CRM. It is a limited interface over existing CRM application/domain services.

The web CRM remains the source of truth and the primary interface for complete administration.

---

## 2. Goals

The bot must support only the following core capabilities:

1. View a compact dashboard.
2. Create a new student.
3. Find/select an existing student when required for an operation.
4. Create/link a Mollie Customer for a student/customer.
5. Initiate/create a Mollie mandate using the existing supported CRM/Mollie flow.
6. Create a Mollie subscription.
7. Create a one-time Mollie payment/payment link.
8. Show the resulting payment link in Telegram for copying/sharing.

All write operations must reuse existing CRM business logic wherever it exists.

---

## 3. Explicitly Out of Scope

Do NOT reproduce the complete admin panel.

Unless technically required for one of the approved flows, do not add Telegram functionality for:

- full student profile editing;
- group management;
- teacher management;
- schedule management;
- attendance management;
- full payment history UI;
- CRM settings;
- bulk operations;
- reporting system;
- CSV import/export;
- complex filtering;
- user/role administration;
- arbitrary database editing;
- any feature merely because it exists in the web admin panel.

When functionality is not included in this specification, it should remain in the web CRM.

---

## 4. Architecture

Target architecture:

```text
Private Telegram Group / Direct Bot Chat
                 │
                 ▼
         Telegram Bot Adapter
                 │
       authentication / RBAC
                 │
                 ▼
        Existing CRM Backend
                 │
      ┌──────────┼──────────┐
      ▼          ▼          ▼
 Student      Payment     Mollie
 Services     Services    Services
      │          │          │
      └──────────┼──────────┘
                 ▼
             Database
```

### 4.1 Mandatory architecture rules

The Telegram layer MUST NOT:

- access Prisma/database repositories directly when an application/domain service already exists;
- duplicate Mollie integration logic;
- duplicate student creation rules;
- duplicate subscription rules;
- implement a second payment domain;
- create parallel models for existing CRM entities without a demonstrated need;
- bypass existing validation, authorization or audit mechanisms.

Prefer:

```text
Telegram handler
    -> application/use-case/service
        -> repository / Mollie adapter
```

not:

```text
Telegram handler
    -> Prisma
    -> Mollie SDK
```

If a required operation does not yet exist as a reusable backend capability, implement/refactor it in the appropriate existing CRM application/domain layer first, then call it from both Web and Telegram where applicable.

---

## 5. Access and Security

The bot is for approved CRM administrators only.

A private Telegram group alone MUST NOT be considered sufficient authorization.

### 5.1 CRM ↔ Telegram identity

An approved CRM account must be associated with a Telegram identity, preferably by immutable Telegram `user_id`.

Conceptually:

```text
CRM User
  ├─ id
  ├─ role
  ├─ status
  └─ telegramUserId
```

Reuse the existing Telegram authentication/account-linking implementation if the project already provides it. Do not create a second independent linking mechanism.

### 5.2 Every privileged interaction must verify

- Telegram user identity;
- linked CRM user exists;
- CRM account is active;
- user has permission for the requested operation;
- when operating in a group, the chat/group is allowed if an allowlist is configured.

Unauthorized users must receive no CRM/customer/payment information.

### 5.3 Secrets

Never expose or log:

- Mollie API keys;
- Telegram bot token;
- authentication secrets;
- complete sensitive payment credentials.

Use the project's existing secret/environment configuration conventions.

---

## 6. Bot UX

Prefer Telegram inline keyboards and guided flows instead of requiring administrators to memorize commands.

Suggested root menu:

```text
DDC ADMIN

📊 Dashboard
👤 Новый ученик
🔗 Payment Link
💳 Mollie
🔎 Найти ученика
```

Mollie submenu:

```text
💳 Mollie

👤 Create Customer
📝 Create Mandate
🔄 Create Subscription
⬅️ Back
```

Commands such as `/start` may exist as entry points, but primary usage should be button-driven.

Bot text should follow the localization conventions already present in the project. Do not build an independent i18n framework if one already exists.

---

## 7. Dashboard

The Telegram dashboard is intentionally compact.

It should expose only useful high-level figures already available/reliably derivable from CRM data, initially:

- total/current number of students;
- number of payments for the current month;
- optionally monthly revenue if the existing dashboard already defines this metric;
- active subscriptions if already available through the existing dashboard service;
- problematic/failed payments only if the CRM has a clear existing definition for this metric.

Example:

```text
📊 DDC Dashboard

👥 Students: 126
💳 Payments this month: 49
💶 Revenue this month: €3,920
🔄 Active subscriptions: 54
⚠️ Problem payments: 7
```

### Important

Do not independently redefine dashboard calculations inside the bot. Reuse the same backend queries/services/definitions used by the web dashboard whenever possible so numbers cannot diverge between interfaces.

---

## 8. Student Search

Student search is supporting infrastructure, not an attempt to recreate the CRM student module.

Search should support the minimum fields already supported safely by the backend, for example:

- name;
- email;
- optionally phone if already indexed/supported.

Search result cards should expose only data required to identify the correct student and launch supported operations.

Example:

```text
👤 Anna Petrova
Email: anna@example.com
Mollie: ✅
Mandate: ✅
Subscription: €80/month

[🔗 Payment Link]
[💳 Mollie]
```

Do not expose unnecessary personal data in Telegram.

---

## 9. Create Student

The bot must support creation of a new student using the existing CRM student creation use case.

Only request fields required by the current domain rules.

Possible guided flow:

```text
New student
   ↓
First/last name
   ↓
Date/year of birth if required
   ↓
Email/contact/parent data if required
   ↓
Review
   ↓
Confirm
   ↓
CRM Student Service
```

The exact required fields MUST be discovered from the existing implementation. Do not invent a separate Telegram-specific student schema unless necessary.

Before final creation, show a confirmation screen.

After creation, return the created student and relevant supported actions.

---

## 10. Mollie Customer

For a selected CRM student/customer:

1. Check whether a Mollie Customer is already linked.
2. If yes, do not create a duplicate.
3. Display the existing state/reference as appropriate.
4. If absent, call the existing CRM Mollie customer creation service/use case.
5. Persist/link the Mollie Customer according to current CRM conventions.
6. Return success/failure to Telegram.

The operation must be idempotent from the administrator's perspective: repeated button presses must not silently create duplicate Mollie customers.

---

## 11. Mandate

The bot must expose the CRM's existing supported mandate creation/activation flow.

Do not assume that a mandate can simply be generated server-side. Inspect the existing Mollie implementation and use the correct flow already used by the CRM, including any required first payment/authorization/payment URL.

Expected UX conceptually:

```text
Student
  ↓
Mollie Customer check
  ↓
Mandate status
  ↓
Create/initiate mandate
  ↓
Existing Mollie flow
  ↓
Return status/link/instructions
```

If a valid mandate already exists, show its state rather than creating another unnecessarily.

---

## 12. Subscription

Subscription creation must reuse existing CRM/Mollie subscription logic.

Before creation validate all existing prerequisites, including where applicable:

- selected student/customer exists;
- Mollie Customer exists;
- valid mandate exists;
- amount/tariff is valid;
- interval is valid;
- start date is valid;
- currency follows existing CRM configuration.

Example guided flow:

```text
Select student
   ↓
Check Mollie Customer
   ↓
Check Mandate
   ↓
Choose/enter subscription parameters
   ↓
Preview
   ↓
Confirm
   ↓
Existing Subscription Service
```

Never create a subscription on the first click without an explicit confirmation step.

Prevent accidental duplicate subscriptions according to existing business rules.

---

## 13. One-Time Payment / Payment Link

This is a primary bot workflow and should be optimized for speed.

Target flow:

```text
🔗 Payment Link
      ↓
Find/select student
      ↓
Enter/select amount
      ↓
Select purpose/description if supported
      ↓
Review
      ↓
Confirm
      ↓
Existing Payment/Mollie Service
      ↓
Payment URL
```

Example result:

```text
✅ Payment link created

👤 Anna Petrova
💶 €80.00
📝 Monthly payment

<checkout URL>
```

Provide suitable Telegram buttons for actions supported by Telegram, such as opening the payment URL and returning to the student/menu.

Do not implement payment completion by trusting Telegram state. Final payment state must come from the existing Mollie webhook/payment synchronization infrastructure.

---

## 14. Conversation / Flow State

Multi-step workflows need temporary state, e.g.:

```text
CREATE_PAYMENT_LINK
step = AMOUNT
studentId = ...
amount = ...
```

Before introducing new persistence, inspect how the project currently handles sessions/state/cache.

Requirements:

- state must be scoped to the initiating admin/user;
- group users must not overwrite each other's flow;
- flows must support cancel/back;
- stale flows should expire;
- retrying must not create duplicate financial operations;
- confirmation must occur immediately before write operations.

---

## 15. Audit Logging

All sensitive/write operations initiated through Telegram should be auditable using the existing audit infrastructure if available.

At minimum capture conceptually:

```text
actor CRM user
source = TELEGRAM
Telegram user ID/reference
operation
entity type/id
timestamp
result
```

Important actions include:

- student created;
- Mollie customer created/linked;
- mandate initiated;
- subscription created;
- payment link/payment created.

Do not log secrets or unnecessary personal/payment data.

---

## 16. Error Handling

Translate internal failures into short actionable admin messages.

Examples:

```text
❌ Mollie Customer could not be created.
Try again or open the customer in CRM.
```

```text
⚠️ A valid mandate is required before creating this subscription.
```

Do not expose stack traces, SQL errors, API secrets or raw internal exceptions to Telegram.

Log technical details using the existing backend logging infrastructure.

---

## 17. Reliability / Idempotency

Financial operations require protection against Telegram retries, webhook retries and double-clicks.

The implementation must inspect and preserve existing idempotency mechanisms.

At minimum evaluate duplicate protection for:

- Mollie Customer creation;
- mandate initiation;
- subscription creation;
- payment/payment-link creation.

Do not rely solely on disabling a Telegram button as duplicate protection.

---

## 18. Privacy / Data Minimization

Telegram is an operational interface, not the canonical customer record.

Therefore:

- show only information needed for the action;
- avoid dumping complete customer profiles into a group;
- never display unnecessary bank/payment information;
- avoid sensitive personal information in logs;
- keep CRM/database as the source of truth;
- follow existing retention/security conventions.

For especially sensitive flows, evaluate whether interaction should continue in the administrator's direct bot chat rather than posting detailed customer information to the shared admin group.

---

## 19. Implementation Strategy

### Phase 0 — Discovery

Before writing code:

1. Inspect existing project architecture.
2. Locate Telegram/auth work already present.
3. Locate student creation service/use case.
4. Locate dashboard queries/services.
5. Locate Mollie customer logic.
6. Locate mandate logic.
7. Locate subscription logic.
8. Locate one-time payment/payment-link logic.
9. Locate Mollie webhook/synchronization handling.
10. Locate RBAC, audit, logging, validation and localization conventions.
11. Identify what can be reused without modification.
12. Identify the smallest backend gaps required for Telegram.

Do not begin by generating a parallel Telegram architecture.

### Phase 1 — Telegram foundation

Implement the minimum infrastructure:

- bot adapter/webhook or existing project transport;
- administrator authorization;
- allowed group/chat validation where applicable;
- root menu;
- callback routing;
- temporary conversation state;
- cancel/back behavior.

### Phase 2 — Read-only

Implement:

- dashboard;
- minimal student search/select.

This validates authentication and integration before financial writes are enabled.

### Phase 3 — Student creation

Implement guided student creation through existing backend business logic.

### Phase 4 — Mollie operations

In order:

1. Mollie Customer;
2. Mandate;
3. Subscription;
4. One-time payment/payment link.

Each operation must include validation, confirmation, authorization, audit and duplicate protection.

### Phase 5 — Tests and hardening

Add tests according to project conventions for:

- unauthorized Telegram user;
- authorized administrator;
- wrong/unapproved group;
- dashboard retrieval;
- student search;
- student creation validation;
- existing Mollie Customer detection;
- Customer creation;
- mandate prerequisite/state;
- subscription prerequisites;
- subscription confirmation;
- payment link creation;
- duplicate/retry behavior;
- failed Mollie calls;
- callback/state expiration;
- audit entries.

---

## 20. Definition of Done

The feature is complete when:

- only approved CRM administrators can use protected operations;
- Telegram does not duplicate the complete CRM;
- dashboard displays the agreed core metrics using existing definitions;
- administrators can create a student;
- administrators can create/link a Mollie Customer without duplicates;
- administrators can initiate the supported mandate flow;
- administrators can create a subscription after prerequisite validation and confirmation;
- administrators can create a one-time payment/payment link;
- payment state continues to be reconciled through existing Mollie mechanisms;
- write actions are audited;
- errors do not expose sensitive internals;
- duplicate financial actions are protected;
- existing application/domain services are reused rather than copied;
- relevant automated tests pass;
- existing web CRM behavior remains unchanged unless an intentional shared-service refactor was required.

---

## 21. Non-Goals / Guardrail for the Agent

Do not turn this task into a redesign of the CRM.

Do not introduce new frameworks, repositories, abstractions, event buses, queues or infrastructure merely because they might be useful later.

Follow the existing code style, architecture, module boundaries, validation patterns, error handling, localization and test conventions.

**Implement the smallest maintainable change that exposes the approved CRM operations through Telegram.**
