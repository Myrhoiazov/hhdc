# Telegram Mini App for DDC Admin Bot — Design

**Status:** Approved by user, pending implementation plan
**Date:** 2026-09-23
**Supersedes:** the inline-keyboard admin bot in `server/src/modules/telegram-admin-bot/`
(dashboard, student search, student creation flows) — those flows are retired once this ships,
per explicit user decision ("заменить полностью").

## 1. Purpose

Replace the current text/inline-keyboard Telegram admin bot with a Telegram **Mini App** (a web
app opened inside Telegram via its WebApp SDK) that looks and behaves like a compact slice of the
existing web admin panel — real forms, real styling, not chat-message ping-pong.

This is also the fix for a real production gap discovered while building the inline bot: Telegram
OIDC's `sub` claim (used by the existing "Войти через Telegram" web login) is an opaque,
per-client pseudonymous identifier, **not** the numeric Telegram user id the Bot API exposes. That
mismatch meant the inline bot could only be unblocked for one admin via a manual database insert.
A Mini App's `initData` carries the real numeric id directly, so this design closes that gap
properly instead of repeating the manual workaround per admin.

## 2. Goals

- Dashboard: the same figures the inline bot showed (student count, payments this month, monthly
  revenue, active subscriptions, failed payments), sourced from the same existing definitions.
- Student search: search by name/email/phone, see compact result cards.
- Student creation: a real form (first/last name, phone, email) with server-side validation and a
  confirmation step, audited.
- Visual parity with the web admin panel (same design tokens / component look), not a generic
  unstyled web form.
- Every admin who is already an active CRM `User` with `role: 'ADMIN'` can use it once they open
  the Mini App from Telegram — no manual per-admin database step.

## 3. Non-goals (this iteration)

- Mollie operations (Customer/Subscription/Payment Link/mandate) — explicitly deferred, matching
  the same phase boundary the inline bot stopped at.
- Any change to the AI email draft-approval bot (`ai-email-assistant/telegram-approval.*`) or the
  shared webhook/dispatcher plumbing that also serves it — untouched.
- A native mobile app, or Mini App usage outside Telegram.
- Rewriting or duplicating any existing business logic. Every server-side capability this design
  needs already exists (`getMollieDashboardSummary`, `getAllClients`, `createClient` +
  `createClientSchema`, `recordAuthSecurityEvent`) and is reused as-is.

## 4. Architecture

```text
Telegram client (WebView)
        │
   Mini App frontend (new, static bundle)
   client/telegram-mini-app/  →  built into  server/public/telegram-admin/
        │  fetch(...) with header X-Telegram-Init-Data: <Telegram.WebApp.initData>
        ▼
Express: telegram-init-data.middleware.ts   (NEW — the only new server auth code)
   - HMAC-validates initData against TELEGRAM_TOKEN (Telegram's documented algorithm)
   - rejects expired/invalid signatures
   - extracts the real numeric user.id from the validated payload
   - looks up AuthIdentity{provider: 'TELEGRAM_MINIAPP', providerUserId: user.id} -> CRM User
   - requires role === 'ADMIN' && isEnabled === true (same policy as the inline bot)
   - on success, sets req.user exactly like the existing cookie-session isAuthenticated
     middleware does, so downstream code is unaware anything Telegram-specific happened
        │
        ▼
Existing routes/controllers — UNCHANGED:
   GET  /api/v1/mollie/dashboard/summary
   GET  /api/v1/clients?_q=...
   POST /api/v1/clients
   (NEW, thin) GET /api/v1/clients/count  ->  clients.service.ts's existing getClientCount()
        │
        ▼
Existing services — UNCHANGED:
   payments.dashboard.service.ts / clients.service.ts / auth.security-audit.service.ts
```

Controllers and services have no knowledge that Telegram is involved — they only ever see
`req.user`, identical to a normal cookie session. This is the load-bearing reuse boundary: the
Mini App is purely a new authentication path plus a new frontend in front of code that already
works and is already tested.

### 4.1 Why a new `AuthProvider` value instead of reusing `TELEGRAM`

`AuthIdentity.provider = 'TELEGRAM'` rows are populated by the *existing* OIDC web login
(`providerUserId` = opaque OIDC `sub`). Reusing that provider value for Mini-App-sourced rows
(`providerUserId` = real numeric id) would put two incompatible identifier spaces under one enum
value, inviting exactly the confusion this design exists to fix. A distinct `AuthProvider.
TELEGRAM_MINIAPP` value keeps the two linking mechanisms — and their very different
`providerUserId` semantics — unambiguous at the schema level. `TELEGRAM` (OIDC) rows are untouched
and keep serving the web login button.

### 4.2 Why not reuse `client/`'s React app for the frontend

Telegram's WebView is latency- and size-sensitive, and this Mini App has exactly three screens.
Loading the full FSD/Redux admin bundle would be substantial unnecessary weight for that surface
(YAGNI per `AGENTS.md`'s "smallest maintainable change" guidance). A small dependency-free
TypeScript bundle (compiled with esbuild, no framework) keeps load time low and avoids introducing
new tooling into the existing client build.

### 4.3 CSRF exemption for the same reason as the bot webhook

`POST /api/v1/clients` (student creation) is an unsafe method and sits behind the global
`app.use('/api/v1', csrfProtection)` gate, which requires a session cookie + CSRF token that a
Mini App request will never have (no cookies at all — a different auth mechanism entirely). This
is the exact same class of gap discovered and fixed for `/telegram/webhook` earlier this session.

Cannot fix by path-exemption like the webhooks: `/clients` is also called by the real web admin
panel with real cookies/CSRF, and exempting the path outright would remove CSRF protection for
those legitimate browser requests. Fix: `csrfExempt(req)` additionally treats a request carrying a
non-empty `X-Telegram-Init-Data` header as exempt from the *cookie*-based check — the header's own
HMAC validation (in `telegram-init-data.middleware.ts`, running later in the chain) is that
request's actual authenticity proof, filling the role CSRF fills for cookie sessions. A request
with a garbage/missing header simply isn't exempt and falls through to the normal cookie/CSRF
requirement (and then fails auth normally, same as any unauthenticated request today).

### 4.4 Style reuse

The existing Sero design tokens (`client/src/app/styles/themes/{default,dark}.scss`) are the only
source of truth for colors/radii/spacing. A small build step extracts the token subset the Mini
App actually uses into a static `tokens.css`, shared by reference (not by copy-paste) so a token
change in the main app doesn't silently drift the Mini App's look. Dark/light handled the same way
the rest of the app does (`prefers-color-scheme` / Telegram's own `colorScheme` from the WebApp
SDK, whichever the self-review settles on — see open question below).

## 5. Data flow by screen

### 5.1 Dashboard (default screen on open)
1. Frontend calls `GET /api/v1/mollie/dashboard/summary` and `GET /api/v1/clients/count`.
2. Renders the same figures the inline bot's dashboard text showed, as styled cards instead of a
   text block.

### 5.2 Student search
1. Admin types into a search input (debounced).
2. `GET /api/v1/clients?_q=<value>` — the same endpoint/params the web admin's client list already
   uses.
3. Results render as compact cards (name, contact, Mollie-linked indicator) — same fields the
   inline bot showed, styled as real list items instead of chat text.

### 5.3 New student
1. Form fields: first/last name (one required, mirrors `createClientSchema`), phone (optional),
   email (optional).
2. Client-side does only basic non-empty/format hinting — validation of record is still the
   server's `createClientSchema.safeParse`, exactly as today.
3. Confirmation screen (review before submit) — same requirement as the inline bot's CONFIRM step.
4. `POST /api/v1/clients` with the form payload; on success, `recordAuthSecurityEvent({type:
   'TELEGRAM_MINIAPP_STUDENT_CREATED', actorUserId, metadata: {clientId}})` (new event-type value,
   same audit function as the inline bot used for its own event).
5. Success screen shows the created student's name/id.

## 6. Error handling

- Invalid/missing/expired `initData` → HTTP 401 from the middleware; frontend shows a plain
  "Нет доступа" screen, no retry loop, no technical detail.
- Authenticated but not an ADMIN, or disabled account → HTTP 403; same plain access-denied screen
  (never distinguishes "wrong role" from "not linked" to avoid leaking account existence).
- Form validation failures surface the server's Zod error message inline under the relevant field,
  the same information the inline bot printed as a chat message.
- Network/5xx errors show a short retry affordance; raw stack traces never reach the frontend
  (matches the existing `common/errors` convention already used by every other route).

## 7. Testing

- Server: unit tests for `telegram-init-data.middleware.ts` covering valid signature, tampered
  signature, expired `auth_date`, and the AuthIdentity/role/isEnabled lookup branches — mocking
  Telegram's HMAC input the same way `auth.csrf.middleware.test.ts` mocks `Request`.
- Server: the new `GET /clients/count` route gets the same controller-test treatment as any other
  thin route in the `clients` module.
- Frontend: no headless Telegram WebView emulator exists, so this stays manually verified inside
  real Telegram (same practice already established for the inline bot) — a short manual checklist
  per screen belongs in the implementation plan, not automated CI.
- Regression: existing `test:auth`, `test:telegram-admin-bot` (until retired), and full `test:ci`
  stay green throughout — this design touches no existing test's behavior.

## 8. Rollout / migration

1. Ship the Mini App behind its own route, without removing the inline bot yet — both live in
   parallel briefly so the Mini App can be verified against real Telegram before cutover.
2. Point the bot's Menu Button at the Mini App URL once verified.
3. Retire `server/src/modules/telegram-admin-bot/`'s dashboard/search/create-student flows and
   their menu wiring (the shared webhook/dispatcher/RBAC-resolver plumbing that also serves the
   email-approval bot is not touched — only the admin-bot-specific flow files and their dispatcher
   routing are removed).
4. Existing manually-inserted `AuthIdentity` row for the one already-unblocked admin
   (`provider: 'TELEGRAM'`, real numeric id) becomes redundant once that admin opens the Mini App
   for the first time and gets a proper `TELEGRAM_MINIAPP` row — it is not required to be cleaned
   up, but may be removed as housekeeping.

## 9. Open questions for the implementation plan

- Exact Telegram color-scheme integration (`Telegram.WebApp.colorScheme`/`themeParams` vs the
  app's own `prefers-color-scheme` handling) — a small decision to make during implementation, not
  a blocker to planning.
- Whether `GET /api/v1/clients/count` needs its own auth/role check identical to `GET /clients`'s
  existing policy, or can be more permissive — default to matching `/clients`'s existing policy
  unless a reason emerges not to.

None of the above blocks writing the implementation plan.
