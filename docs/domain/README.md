# HHDC Admin — Domain Model

## Purpose

`docs/domain/` is the canonical source for business/domain knowledge in HHDC Admin. It documents
bounded contexts, entities, relationships, and business rules **as they exist in the code today**
— not an aspirational or DDD-refactored model. Every claim in these documents is grounded in
`server/prisma/schema/*.prisma`, the module controllers/services/routes, or existing committed docs.

Where a term or rule couldn't be confirmed from code, it's marked `Needs clarification` rather
than guessed. See [GLOSSARY.md](GLOSSARY.md) for vocabulary.

Read this before touching business logic in `server/src/modules/*` or
`server/prisma/schema/*.prisma` — it tells you which bounded context owns which entity, and where
the non-obvious cross-domain rules live.

## Domain Map

```
HHDC Admin
├── Identity        — staff accounts, sessions, 2FA, Telegram OIDC login (ADMIN-only), security audit
├── Organization     — legal entity, brands, branches (shared reference data)
├── CRM              — clients (students/payers), notes, search
├── Scheduling        — dance groups, choreographers, halls, schedule slots
├── Billing           — invoices, payments recorded against them, delivery, reminders
├── Payments          — Mollie integration, internal cash ledger, subscription reminders
└── Communication      — staff email mailboxes, Instagram webhook (stub), Telegram staff notifications + switches
```

These seven contexts are the ones confirmed by dedicated controllers/routers and cohesive Prisma
models. **Organization is not in the task's starter list** — it was added because
`company.prisma` (`Branch`, `LegalOrganization`, `BusinessBrand`) has its own controller/router
(`modules/company/company.controller.ts` / `company.routes.ts`) and models concerns (legal
identity, multi-brand billing presentation, physical locations) that don't belong to Clients,
Invoices, or Payments.
Folding it into any of those would misrepresent the dependency direction — see
[organization.md](organization.md) for the reasoning.

## Context Responsibilities

### Identity
- **Responsible for**: staff (`User`) accounts, login/session lifecycle, 2FA, CSRF, rate limiting,
  security audit events (`AuthSecurityEvent`), Telegram OIDC login as an additional ADMIN-only
  provider (`AuthIdentity`, `TelegramAuthTransaction` — see [identity.md](identity.md)).
- **Not responsible for**: client/student identity — `Client` records never authenticate; there
  is no login path for them anywhere in the code.
- **Interacts with**: every other domain, but only as "who did this" attribution
  (`createdById`/`updatedById`/`actorId` foreign keys) — never behavioral coupling.

### Organization
- **Responsible for**: the studio's own legal entity (`LegalOrganization`), billing brands
  (`BusinessBrand`), and physical branches (`Branch`).
- **Not responsible for**: client records, invoicing logic, payment processing — it supplies
  reference/identity data that those domains consume.
- **Interacts with**: CRM (`Client.branchId`), Scheduling (`DanceGroup.branchId`), Billing
  (`Invoice.businessBrandId`, snapshotted at issue time), Payments (stores
  `mollieOrganizationId`/`mollieProfileId`, one-way sync from Mollie).

### CRM
- **Responsible for**: `Client` records (student or parent/payer), staff notes (`Comment`),
  cross-domain client search.
- **Not responsible for**: group/class definitions (Scheduling), invoicing (Billing), payment
  processing (Payments) — though it exposes a derived payment-status summary for a client by
  reading Payments-domain tables.
- **Interacts with**: Organization (branch assignment), Scheduling (group membership — see note in
  [scheduling.md](scheduling.md) about who actually owns the enrollment write path), Payments
  (Mollie customer linking, payment summaries), Billing (`Invoice.clientId`).

### Scheduling
- **Responsible for**: `DanceGroup` (classes), `Choreographer`, `Hall`, `ScheduleSlot`,
  `DanceStyle` (public style catalog).
- **Not responsible for**: pricing computation for invoices (Billing never reads
  `DanceGroup.lessonPriceCents` — line prices are supplied independently) or client identity.
- **Interacts with**: Organization (`DanceGroup.branchId`), CRM (client enrollment — see
  [scheduling.md](scheduling.md), the `ClientDanceGroup` bridge rows are actually
  written by CRM's client controller, not Schedule's), Billing (`InvoiceItem.groupId` is a
  descriptive reference only).

### Billing
- **Responsible for**: `Invoice` lifecycle (issuing, status, adjustments/credit-debit notes),
  manual payment recording, delivery (email + public link), due/overdue reminders.
- **Not responsible for**: the Mollie sync mechanism itself, or recurring-subscription reminders
  (a **separate** mechanism owned by Payments — see the disambiguation in
  [GLOSSARY.md](GLOSSARY.md) and both [billing.md](billing.md) and [payments.md](payments.md)).
- **Interacts with**: Organization (issuer snapshot from `BusinessBrand`/`LegalOrganization`),
  CRM (`Invoice.clientId`, optional), Scheduling (`InvoiceItem.groupId`, descriptive), Payments
  (`Payment.invoiceId`, `InvoiceMolliePaymentLink`, reconciliation reads Payments tables).

### Payments
- **Responsible for**: the Mollie integration (OAuth connection, customers, mandates,
  subscriptions, payments, webhooks), reconciliation/incident surfacing, the internal cash-flow
  ledger (`Transaction` + synced Mollie payments), and subscription-based payment reminders.
- **Not responsible for**: invoice numbering/status (Billing owns `Invoice`; Payments only writes
  `Payment` rows and updates `InvoiceMolliePaymentLink` status), organization identity config
  (Organization owns the Mollie ID *fields*, even though Payments is where the live Mollie API
  calls happen).
- **Interacts with**: CRM (`Customer.clientId` / `CustomerClientLink.clientId`), Billing (as
  above), Identity (`MollieAccount.userId` — see note in [payments.md](payments.md) about the
  connection being operationally shared, not truly per-user), Communication (Telegram
  notifications for payment webhook events and for newly created Mollie customers).

### Communication
- **Responsible for**: staff email mailboxes (`EmailAccount`/`EmailMessage`/`EmailAttachment`,
  IMAP sync + SMTP send), the Instagram webhook endpoint, and outbound Telegram notifications
  for staff, including the admin-controlled per-type switches (`TelegramNotificationSetting`).
- **Not responsible for**: invoice delivery email (Billing has its own independent SMTP path —
  see [billing.md](billing.md)) or 2FA email (Identity bypasses this module entirely).
- **Interacts with**: CRM (`EmailMessage.clientId`, matched by exact email address). Its Telegram
  notifications are triggered by other domains: Payments (Mollie webhook events, new Mollie
  customers), CRM (new students), Identity (login blocked, new device, role changed) — and by its
  own IMAP sync (new email). Identity also attributes switch changes
  (`TelegramNotificationSetting.updatedById`).

## Domain Dependencies

Confirmed by code (not schema alone):

```
Organization (Branch, BusinessBrand, LegalOrganization)
  │
  ├──▶ CRM (Client.branchId)
  ├──▶ Scheduling (DanceGroup.branchId)
  └──▶ Billing (Invoice.businessBrandId → issuer snapshot at issue time)

CRM (Client)
  ├──▶ Scheduling (group membership; branch-match validated in CRM, enrollment rows
  │      also written by CRM — see scheduling.md)
  ├──▶ Billing (Invoice.clientId, optional)
  └──▶ Payments (Customer.clientId / CustomerClientLink)

Scheduling (DanceGroup)
  └──▶ Billing (InvoiceItem.groupId — descriptive reference, not a pricing source)

Billing (Invoice) ◀──────────────┐
  └──▶ Payments (InvoiceMolliePaymentLink, Payment.invoiceId; reconciliation reads
        Payments tables from Billing's own service)

Payments (Mollie webhook events, new Mollie customers)
  └──▶ Communication (Telegram staff notification)

CRM (new student)
  └──▶ Communication (Telegram staff notification)

Identity (login blocked, new device, role changed)
  └──▶ Communication (Telegram staff notification)

Identity (User)
  └──▶ every domain, as staff-attribution foreign keys only
       (createdById / updatedById / actorId / author, etc.)
```

## Documentation Routing

| Domain | File | Read when touching... |
|---|---|---|
| Identity | [identity.md](identity.md) | `modules/auth/auth.controller.ts`, `auth.profiles.controller.ts`, `modules/auth/telegram/*` (OIDC login), `modules/users/users.controller.ts`, `modules/auth/auth.password/token/csrf/rate-limit/two-factor/security-audit.service.ts`, `user.prisma` |
| Organization | [organization.md](organization.md) | `modules/company/company.controller.ts`, `company.prisma` |
| CRM | [crm.md](crm.md) | `modules/clients/clients.controller.ts`, `modules/comments/comments.controller.ts`, `modules/search/search.controller.ts`, `client.prisma` |
| Scheduling | [scheduling.md](scheduling.md) | `modules/schedule/schedule.controller.ts`, `schedule.prisma` |
| Billing | [billing.md](billing.md) | `modules/invoices/invoices.controller.ts`, `invoices.*.service.ts`, `invoice.prisma` |
| Payments | [payments.md](payments.md) | `modules/payments/payments.controller.ts`, `payments.*.service.ts`, `modules/transactions/transactions.controller.ts`, `modules/payment-reminders/payment-reminders.controller.ts`, `mollie.prisma`, `payment-reminder.prisma`, `Transaction` model in `schema.prisma` |
| Communication | [communication.md](communication.md) | `modules/communication/email/email.controller.ts`, `instagram/instagram.controller.ts`, `email/email-*.service.ts`, `telegram/telegram.service.ts`, `telegram/notification-settings.*`, `telegram/new-record-notifications.service.ts`, `email.prisma`, `telegram-notification.prisma` |

Technical implementation detail (exact function signatures, validation schemas, migration
history) stays in the code and in `docs/spec/*` — these documents describe *what exists and why
it's shaped this way*, not *how to call it*. `docs/schema.md` remains the field-by-field Prisma
reference; these documents add the business meaning on top of it.
