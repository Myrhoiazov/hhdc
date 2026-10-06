# HHDC Admin --- Telegram Authentication Integration Specification

**Status:** Draft for implementation\
**Scope:** Authentication / Account linking\
**Target stack:** React 19 + TypeScript, Express 5, Prisma 6, MySQL\
**Principle:** CRM remains the source of truth. Telegram is an
authentication identity provider only.

## 1. Goal

Add login and authentication through Telegram without allowing Telegram
to create CRM users.

A user may log in through Telegram only when:

1.  a CRM account already exists;
2.  the CRM account is approved/verified according to the existing
    authorization rules;
3.  the account is active and not blocked;
4.  the Telegram identity has previously been explicitly linked to that
    CRM account.

Telegram authentication must reuse the existing CRM authorization,
session/token, roles, permissions, audit and security mechanisms rather
than introduce a parallel authentication system.

## 2. Non-goals

This change must **not**:

-   create CRM accounts from Telegram;
-   automatically match users by Telegram username, display name, email
    or phone;
-   replace the existing email/password login;
-   bypass existing user status, roles or permissions;
-   create a second session/JWT implementation;
-   store Telegram authorization codes, ID tokens or temporary PKCE
    values permanently;
-   refactor unrelated authentication code unless required for safe
    integration.

## 3. Required user flows

### 3.1 Link Telegram to an existing CRM account

Telegram linking is available only to an already authenticated CRM user.

Flow:

``` text
Existing CRM login
        ↓
Authenticated CRM session
        ↓
Profile / Security
        ↓
Connect Telegram
        ↓
Create state + nonce + PKCE
        ↓
Telegram OIDC authorization
        ↓
Backend callback
        ↓
Validate authorization response
        ↓
Resolve stable Telegram user ID
        ↓
Check identity is not linked elsewhere
        ↓
Create AuthIdentity
        ↓
Audit event: TELEGRAM_LINKED
```

A Telegram identity must never be linked solely because an email, phone
number or username happens to match CRM data.

### 3.2 Login with Telegram

``` text
Login page
    ↓
Login with Telegram
    ↓
Telegram OIDC
    ↓
Backend callback
    ↓
Validate Telegram identity
    ↓
Find AuthIdentity(provider=TELEGRAM, providerUserId=...)
    ↓
Find associated CRM User
    ↓
Validate CRM account status
    ↓
Apply existing authentication/security policy
    ↓
Create normal CRM session
```

If the Telegram identity is valid but is not linked to a CRM account,
access is denied. Do not create a user.

Recommended user-facing message:

> Этот Telegram-аккаунт не подключён к HHDC Admin. Войдите с помощью
> электронной почты и подключите Telegram в настройках профиля.

The response should not disclose unnecessary information about existing
CRM accounts.

### 3.3 Unlink Telegram

An authenticated user can remove their Telegram identity from Security
settings.

Unlinking should require a recent authenticated session and, if the
current security architecture supports it, re-authentication or existing
2FA confirmation.

Do not allow unlinking if doing so would violate an existing invariant
that requires at least one usable authentication method.

## 4. Data model

Prefer a provider-neutral identity model instead of adding `telegramId`
directly to `User`.

Example conceptual Prisma model:

``` prisma
enum AuthProvider {
  TELEGRAM
}

model AuthIdentity {
  id             String       @id @default(cuid())
  userId         String
  user           User         @relation(fields: [userId], references: [id], onDelete: Cascade)

  provider       AuthProvider
  providerUserId String

  username       String?
  displayName    String?

  linkedAt       DateTime     @default(now())
  lastLoginAt    DateTime?

  @@unique([provider, providerUserId])
  @@index([userId])
}
```

Before implementing this schema, inspect the existing
domain/authentication models and reuse existing abstractions if an
equivalent identity/provider structure already exists.

### Data invariants

-   `(provider, providerUserId)` is globally unique.
-   A Telegram identity can belong to only one CRM user.
-   A CRM user may have at most one Telegram identity unless existing
    product requirements explicitly require otherwise.
-   Telegram username is metadata only and is never an authentication
    key.
-   Authorization always resolves to the internal CRM `userId`.

## 5. Telegram protocol

Use Telegram's current OpenID Connect authorization flow with
Authorization Code + PKCE.

Backend responsibilities include:

-   generate cryptographically secure `state`;
-   generate `nonce`;
-   generate PKCE verifier/challenge using S256;
-   store temporary flow state securely with a short TTL;
-   exchange authorization code server-side;
-   verify the returned ID token;
-   validate signature using Telegram JWKS;
-   validate issuer;
-   validate audience/client ID;
-   validate expiration and issued-at constraints;
-   validate nonce;
-   reject reused/invalid/expired flow state;
-   use the stable Telegram subject/user identifier as `providerUserId`.

Do not implement JWT signature verification manually when a mature
OIDC/JWT library already used by or suitable for the project can do it
safely.

## 6. Temporary authentication state

OIDC transaction data must be short-lived.

It may contain:

``` text
state
nonce
PKCE verifier
flow type: LOGIN | LINK
authenticated CRM user ID (LINK only)
createdAt / expiresAt
```

Use the project's existing Redis/session infrastructure if appropriate.
Do not introduce another persistence mechanism when the existing
infrastructure can safely support this.

Requirements:

-   short TTL;
-   single use;
-   server-side ownership;
-   no sensitive transaction secrets in browser localStorage;
-   failed or completed transactions must not remain reusable.

## 7. Backend API

Exact routes should follow the existing project routing conventions.
Conceptually the module needs:

``` http
POST /api/auth/telegram/login/start
GET  /api/auth/telegram/login/callback

POST /api/auth/telegram/link/start
GET  /api/auth/telegram/link/callback

DELETE /api/auth/telegram/link
GET    /api/auth/providers
```

Do not duplicate endpoints if the current auth architecture already has
generic provider routes.

### Login start

Responsibilities:

-   create OIDC transaction;
-   create PKCE challenge;
-   return or redirect to the Telegram authorization URL;
-   mark transaction as `LOGIN`.

### Link start

Requirements:

-   existing authenticated CRM session;
-   create transaction marked `LINK`;
-   bind transaction to the current internal `userId`;
-   never accept a target `userId` supplied by the frontend.

### Callback

The callback must distinguish `LOGIN` and `LINK` using trusted
server-side transaction state, not arbitrary query parameters from the
client.

For `LOGIN`:

1.  validate OIDC transaction;
2.  resolve Telegram provider ID;
3.  locate existing `AuthIdentity`;
4.  resolve internal user;
5.  validate account status;
6.  apply existing auth/2FA policy;
7.  issue the same CRM session/token used by normal authentication;
8.  update `lastLoginAt`;
9.  create audit record.

For `LINK`:

1.  validate OIDC transaction;
2.  resolve authenticated internal user from server-side transaction;
3.  validate Telegram identity;
4.  verify it is not already linked to another user;
5.  create identity transactionally;
6.  create audit record.

## 8. Existing 2FA policy

Do not silently redefine the current 2FA policy.

Telegram authentication must integrate through the existing
authentication policy layer.

The implementation should make the decision explicit, for example:

``` text
Telegram identity verified
        ↓
CRM user resolved
        ↓
existing auth policy
        ↓
optional additional 2FA depending on role/policy
        ↓
session
```

If the project currently requires 2FA for administrators or privileged
users, Telegram login must not bypass that requirement.

Any change making Telegram itself sufficient to replace an existing
second factor must be treated as a separate product/security decision.

## 9. Authorization

Authentication through Telegram does not grant permissions.

After Telegram identity resolution, all access must continue through the
existing CRM mechanisms:

``` text
Telegram
   ↓
Identity verification
   ↓
CRM User
   ↓
Account status
   ↓
Role
   ↓
Permissions
   ↓
Authorization
```

Disabled, deleted, suspended, unapproved or otherwise unauthorized CRM
accounts must remain unable to access the application even when Telegram
authentication succeeds.

## 10. Frontend

### Login page

Add a secondary action below the existing login flow:

``` text
[ Войти ]

────── или ──────

[ Telegram icon  Войти через Telegram ]
```

The existing email/password form remains the primary login method unless
product requirements later change.

Required UI states:

-   idle;
-   redirecting/loading;
-   Telegram authentication failed;
-   Telegram account not linked;
-   CRM account inactive/unauthorized;
-   generic authentication error.

### Profile / Security

Add a section similar to:

``` text
Telegram

Not connected
[ Connect Telegram ]

or

Connected
@username
Connected: 19.09.2026

[ Disconnect ]
```

Do not rely on `@username` as identity. It is display-only metadata.

UI must use existing components, spacing, typography, buttons,
notifications and design tokens. Do not create a parallel design system.

## 11. Security requirements

Mandatory:

-   Authorization Code Flow;
-   PKCE S256;
-   state validation;
-   nonce validation;
-   server-side token validation;
-   issuer validation;
-   audience validation;
-   expiration validation;
-   unique Telegram provider identity;
-   account status validation after identity resolution;
-   rate limiting;
-   secure HTTP-only session/cookie rules already used by CRM;
-   CSRF protection consistent with the current architecture;
-   no tokens in logs;
-   no secrets in frontend bundles;
-   no Telegram client secret in the database;
-   generic errors where account enumeration is possible;
-   audit logging for security-sensitive actions.

Configuration/secrets must use the project's established
environment/secrets mechanism.

## 12. Audit events

Integrate with the existing audit system. Prefer existing naming
conventions.

Conceptual events:

``` text
TELEGRAM_LINKED
TELEGRAM_UNLINKED
LOGIN_TELEGRAM_SUCCESS
LOGIN_TELEGRAM_FAILED
```

Record only data appropriate for the existing audit policy. Never log
authorization codes, access tokens, ID tokens, PKCE verifiers or client
secrets.

## 13. Error handling

Handle at least:

-   user cancels Telegram authorization;
-   invalid state;
-   expired state;
-   invalid nonce;
-   token exchange failure;
-   invalid ID token;
-   Telegram identity not linked;
-   identity already linked to another CRM user;
-   CRM user inactive;
-   CRM user removed during authentication;
-   duplicate concurrent linking attempt;
-   network/provider failure.

Use existing API error contracts and frontend error handling. Do not
invent a separate response format.

## 14. Concurrency and integrity

The database unique constraint is the final protection against two users
linking the same Telegram identity.

Linking should be transactional where necessary.

Do not rely solely on:

``` text
SELECT -> if missing -> INSERT
```

without handling a possible unique-constraint race.

## 15. Tests

### Unit

Cover:

-   OIDC validation mapping;
-   provider identity normalization;
-   CRM account status checks;
-   login policy;
-   link policy;
-   unlink policy;
-   duplicate identity handling;
-   error mapping.

### Integration

Cover:

``` text
valid Telegram + linked active CRM user -> success
valid Telegram + no link -> denied
valid Telegram + inactive CRM user -> denied
invalid state -> denied
invalid nonce -> denied
expired transaction -> denied
Telegram already linked to another user -> denied
authenticated CRM user + new Telegram -> linked
unlink -> identity removed
```

Mock Telegram/OIDC boundaries; do not depend on real Telegram in normal
CI.

### E2E

Add the smallest useful E2E coverage consistent with the existing test
architecture:

-   Telegram login entry point is available;
-   linked user completes simulated login;
-   unlinked user receives expected UI;
-   authenticated user can link/unlink Telegram.

Do not make CI dependent on external Telegram availability.

## 16. Observability

Use existing logging/telemetry conventions.

Capture useful operational signals such as:

-   Telegram login attempts;
-   successful logins;
-   failed validation;
-   unlinked identity attempts;
-   link/unlink operations;
-   provider/token exchange errors.

Never include authentication tokens or secrets in telemetry.

If OpenTelemetry is already part of the project, instrument this flow
through existing tracing conventions rather than introducing another
observability mechanism.

## 17. Implementation order

Implement in small, reviewable stages.

### Phase 1 --- Discovery

Inspect:

-   current User/auth models;
-   login/session/JWT flow;
-   2FA implementation;
-   Redis/session usage;
-   audit log;
-   roles/status/permissions;
-   frontend auth state;
-   existing tests;
-   environment configuration.

Produce a plan before editing code.

### Phase 2 --- Domain/data layer

-   introduce/reuse provider identity abstraction;
-   Prisma migration;
-   repository/service methods;
-   uniqueness/invariants;
-   tests.

### Phase 3 --- Telegram OIDC adapter

-   configuration;
-   discovery/JWKS handling;
-   PKCE;
-   state/nonce transaction;
-   callback validation;
-   adapter tests.

Keep Telegram-specific protocol code isolated from CRM authorization
logic.

### Phase 4 --- Link/unlink

Implement authenticated linking first. This creates trusted
Telegram-to-CRM mappings before login is enabled.

### Phase 5 --- Telegram login

Resolve verified Telegram identity to CRM user and enter the existing
session/authorization flow.

### Phase 6 --- Frontend

-   login button;
-   callback/loading/error states;
-   Security settings;
-   link/unlink UI.

### Phase 7 --- Hardening

-   rate limits;
-   audit;
-   integration/E2E tests;
-   security review;
-   documentation;
-   narrow regression suite, then full CI.

## 18. Definition of Done

The feature is complete when:

-   Telegram cannot create CRM users;
-   only previously linked CRM accounts can log in through Telegram;
-   linking requires an authenticated CRM account;
-   the same Telegram identity cannot be linked to multiple CRM users;
-   Telegram username is not used as an identity key;
-   inactive/blocked/unapproved CRM users cannot bypass restrictions;
-   existing roles and permissions remain authoritative;
-   existing session/token infrastructure is reused;
-   existing 2FA policy is respected;
-   OIDC state/nonce/PKCE validation is implemented;
-   secrets and tokens are not persisted or logged incorrectly;
-   audit events exist;
-   unit and integration tests cover security-critical paths;
-   E2E coverage exists where appropriate;
-   existing email/password login continues to work;
-   lint/typecheck/tests pass;
-   documentation/config examples are updated;
-   no unrelated refactoring is included.

## 19. Engineering constraints

Follow the repository's existing agent and engineering contract.

-   Read `AGENTS.md` first.
-   Use the repository's sources of truth (`docs/domain`, `docs/spec`,
    ADRs) only as required.
-   Search before broad file reads: Graphify when useful → `rg` →
    targeted reads.
-   Read the smallest relevant ranges.
-   Reuse existing abstractions, services, error types, validators and
    components.
-   Do not create new helpers when an equivalent project abstraction
    exists.
-   Preserve FSD/module boundaries on the client and current server
    architecture.
-   Keep styles in the project's established SCSS/style location.
-   Do not introduce inline styling unless already established by the
    component architecture.
-   Prefer focused changes over broad auth refactoring.
-   Use `git diff` after edits instead of rereading entire files.
-   Run the narrowest relevant tests first, then broader CI checks.
-   Do not modify unrelated files.
-   If implementation requires an architectural decision not covered by
    the code/spec, stop and document the decision rather than silently
    choosing a new architecture.

## 20. Expected implementation result

The final architecture should conceptually remain:

``` text
Email/password ──┐
                 │
Telegram OIDC ───┼──> Authentication policy ──> CRM User
                 │                                │
Existing 2FA ────┘                                ↓
                                             roles/status
                                                  ↓
                                             permissions
                                                  ↓
                                            CRM session
```

Telegram verifies an external identity. HHDC Admin decides whether that
identity is allowed to enter.
