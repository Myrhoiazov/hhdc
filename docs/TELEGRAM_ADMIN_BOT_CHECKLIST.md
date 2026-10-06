# DDC Telegram Admin Bot — Implementation Checklist

## Discovery
- [x] Read `TELEGRAM_ADMIN_BOT_SPEC.md`.
- [x] Locate existing Telegram/auth implementation. — `auth/telegram/` (OIDC), `communication/telegram/telegram.service.ts` (transport), `ai-email-assistant/telegram-approval.*` (webhook/polling bot)
- [x] Locate CRM RBAC/user authorization. — `User.role`, `auth/auth.middleware.ts:37` `requireRole`
- [x] Locate student create/search services. — `clients.service.ts` `createClient`/`getAllClients`
- [x] Locate dashboard metrics implementation. — `payments.dashboard.service.ts:86` `getMollieDashboardSummary`
- [x] Locate Mollie Customer logic. — `payments.controller.ts:753` `createCustomerRecord`
- [x] Locate mandate logic. — `payments.controller.ts:2604,2710` `createAndSyncMollieMandate`/`findCustomerWithValidMandate`
- [x] Locate subscription logic. — `payments.controller.ts:2722` `mollieCreateMandateSubscriptionController`
- [x] Locate one-time payment/payment-link logic. — `payments.controller.ts:1974` `mollieCreateCustomerPaymentLinkController`
- [x] Locate Mollie webhook/sync logic. — `payments.controller.ts:634` `webhookMollieController`
- [x] Locate audit/logging/validation/i18n conventions. — `auth.security-audit.service.ts:58` `recordAuthSecurityEvent`; Zod inline `safeParse` per controller (no shared middleware in practice)
- [x] Produce REUSE / REFACTOR / ADD matrix. — see `tasks/plan.md` "Telegram Admin Bot" section
- [x] Produce implementation plan before significant coding. — see `tasks/plan.md`

## Telegram Foundation
- [x] Bot configuration follows existing env/config conventions. — reuses `TELEGRAM_TOKEN`/`TELEGRAM_CHAT_ID`/`TELEGRAM_WEBHOOK_SECRET`, no new env vars
- [x] Telegram user is mapped to CRM user. — `telegram-admin-bot.auth.ts` via existing `AuthIdentity`
- [x] Active CRM user is required. — `user.isEnabled` checked
- [x] RBAC is enforced. — `role === 'ADMIN'` gate (whole bot, per user decision)
- [ ] Allowed chat/group is checked where configured. — not implemented; only role-gates who can act, not which chat they act from (open item, low priority given decision 3 puts everything in one already-private group)
- [x] Unauthorized requests expose no CRM data. — live-verified: unlinked Telegram id gets only "⛔ У вас нет доступа", no menu/data
- [x] Inline root menu implemented. — live-verified via real webhook call
- [x] Multi-step state is isolated per admin. — keyed by Telegram user id, unit-tested
- [x] Back/Cancel supported. — `adm:cancel`/`adm:menu:root`
- [x] Stale state expires. — 15 min TTL (Redis/in-memory, same convention as rate-limiter)

## Dashboard
- [x] Student count uses existing CRM definition. — new trivial `getClientCount()` (`prisma.client.count()`), no prior definition existed to diverge from
- [x] Current-month payment count uses existing CRM definition. — `getMollieDashboardSummary().paidThisMonth`
- [x] Revenue shown only if existing definition can be reused. — `getMollieDashboardSummary().monthlyRevenue`
- [x] Subscription/problem metrics shown only if reliably available. — `activeSubscriptions` always shown; `failedPayments` shown only when > 0
- [x] No duplicate dashboard calculation logic in Telegram. — live-verified against real dev DB

## Students
- [x] Minimal student search implemented. — reuses `getAllClients({_q})`, not the broader `search` module
- [x] Search exposes only necessary personal data. — name/contact/Mollie-linked flag only, capped at 8 results
- [x] New student flow uses existing create service/use case. — `clients.service.ts`'s `createClient`, unchanged
- [x] Existing validation is reused. — `createClientSchema` (exported, unchanged) via `.safeParse`
- [x] Confirmation occurs before creation. — explicit CONFIRM step + button
- [x] Student creation is audited. — new `TELEGRAM_ADMIN_STUDENT_CREATED` `AuthSecurityEvent`, via existing `recordAuthSecurityEvent`

## Mollie Customer
- [ ] Existing linked Customer checked first.
- [ ] Duplicate Customer creation prevented.
- [ ] Existing Mollie service reused.
- [ ] CRM linkage persists through existing conventions.
- [ ] Operation is audited.

## Mandate
- [ ] Existing mandate status checked.
- [ ] Existing supported Mollie mandate flow reused.
- [ ] Required authorization/first-payment flow handled correctly.
- [ ] Existing valid mandate is not unnecessarily recreated.
- [ ] Operation is audited.

## Subscription
- [ ] Customer prerequisite validated.
- [ ] Mandate prerequisite validated.
- [ ] Existing amount/tariff rules reused.
- [ ] Interval/start-date rules reused.
- [ ] Preview/confirmation required.
- [ ] Duplicate subscription protection evaluated.
- [ ] Existing subscription service reused.
- [ ] Operation is audited.

## Payment Link
- [ ] Student/customer can be selected quickly.
- [ ] Amount validation reused.
- [ ] Description/purpose follows existing model.
- [ ] Confirmation required.
- [ ] Existing payment/Mollie service reused.
- [ ] Resulting checkout URL returned safely.
- [ ] Payment completion remains webhook/sync-driven.
- [ ] Retry/double-click behavior is safe.
- [ ] Operation is audited.

## Quality & Security
- [x] Telegram handlers contain no duplicated domain logic. — thin flow files calling existing services; only new code is guided-flow UI state
- [x] Telegram handlers do not bypass services to access DB unnecessarily. — only new exception is the trivial `getClientCount()`, which didn't exist to bypass
- [x] Secrets never appear in Telegram/logs. — no secrets handled by this feature (mandate/IBAN entry deliberately excluded, decision 1)
- [x] Raw exceptions/stack traces never appear in Telegram. — errors mapped to short Russian messages
- [x] Sensitive data is minimized in group messages. — student cards show name/contact/Mollie-linked flag only
- [x] No unrelated CRM functionality was added. — scoped to dashboard/search/create-student this pass; Mollie ops deferred
- [x] No unnecessary framework/infrastructure was introduced. — reused existing Redis/in-memory rate-limit pattern for flow state, no new libraries

## Verification
- [x] Unauthorized-user test. — unit-tested + live-verified against the real dev webhook (unlinked Telegram id → "no access", no menu)
- [x] Authorized-admin test. — unit-tested + live-verified (temporary test `AuthIdentity`, removed after)
- [ ] Group/chat authorization test where applicable. — no chat allowlist implemented (see Telegram Foundation note)
- [x] Dashboard test. — unit-tested + live-verified against the real dev DB (`getMollieDashboardSummary`/`getClientCount`)
- [x] Student search/create tests. — unit-tested (search live-verified against real DB; create verified via injected-fake unit tests only, to avoid writing a fake student into the dev DB)
- [ ] Mollie Customer duplicate test. — Phase 4, not yet built
- [ ] Mandate tests. — out of scope for Telegram (decision 1: status-only, not implemented this pass)
- [ ] Subscription prerequisite/confirmation tests. — Phase 4, not yet built
- [ ] Payment-link test. — Phase 4, not yet built
- [ ] Mollie failure test. — Phase 4, not yet built
- [ ] Retry/idempotency tests. — Phase 4, not yet built (no Mollie writes exist yet to protect)
- [x] Audit tests. — student-creation audit call verified via unit test (mocked `recordAuthSecurityEvent`)
- [x] Relevant lint/typecheck/tests pass. — `tsc --noEmit` clean, full `npm run test:ci` 0 failures, `npm run build` clean
- [x] `git diff` reviewed for duplicated logic and scope creep. — see tasks/plan.md for the exact REUSE/REFACTOR/ADD accounting
