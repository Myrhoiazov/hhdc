# Agent Prompt --- Implement Telegram Authentication for HHDC Admin

You are working in the existing **HHDC Admin** repository.

Your task is to analyze, plan and then implement Telegram authentication
according to:

`docs/spec/DDC_CRM_TELEGRAM_AUTH_SPEC.md`

## Objective

Add Telegram as an authentication provider while preserving the current
CRM as the only source of truth for users and authorization.

The fundamental invariant is:

> Telegram must never create or independently authorize a CRM user. A
> Telegram identity may log in only when it has already been explicitly
> linked to an existing, approved and active CRM account.

## Operating mode

Do **not** start coding immediately.

First perform repository discovery and produce a concrete implementation
plan based on the actual codebase.

Follow `AGENTS.md` and the repository's existing architecture,
conventions and source-of-truth documents.

Use the normal context-efficient workflow:

1.  Read `AGENTS.md`.
2.  Locate relevant auth code with Graphify/symbol search where useful.
3.  Use `rg` to find concrete implementations.
4.  Perform targeted reads of only relevant files/ranges.
5.  Inspect existing Prisma models, auth/session flow, 2FA, user status,
    roles/permissions, Redis/session storage, audit logging, API errors
    and frontend auth state.
6.  Inspect relevant existing tests.
7.  Read only the domain/spec/ADR documents required to understand those
    components.
8.  Compare the existing implementation with
    `DDC_CRM_TELEGRAM_AUTH_SPEC.md`.
9.  Produce the implementation plan.
10. Only after the plan is clear, implement phase by phase.

Do not load the whole repository or all documentation into context.

## Before implementation, answer these questions from the codebase

Determine:

-   How is a CRM user currently authenticated?
-   Where is password verification performed?
-   How is 2FA represented and enforced?
-   How are sessions/access/refresh tokens issued?
-   Where is the authoritative `User` status checked?
-   Which statuses represent active/blocked/unapproved/deleted users?
-   How are roles and permissions resolved?
-   Is Redis already suitable for short-lived OIDC transactions?
-   Is there an existing external identity/provider abstraction?
-   Is there an existing audit log?
-   What error contract does the API use?
-   What rate-limiting mechanism already exists?
-   How does the frontend persist and restore auth state?
-   What test infrastructure exists for auth?
-   Which existing components should be reused for the Telegram
    login/link UI?

Do not assume the specification's example names match the repository.
Map the specification to actual project abstractions.

## Architecture requirements

Keep Telegram protocol concerns isolated from CRM authorization.

The desired boundary is conceptually:

``` text
Telegram OIDC
      ↓
Telegram provider adapter
      ↓
verified external identity
      ↓
Auth service / policy
      ↓
CRM User
      ↓
status + role + permissions
      ↓
existing CRM session
```

Do not create a parallel session system.

Do not create a Telegram-specific user model.

Prefer a provider-neutral `AuthIdentity` abstraction unless an
equivalent abstraction already exists.

## Required flows

Implement:

``` text
1. Link Telegram to authenticated CRM user
2. Unlink Telegram
3. Login through already-linked Telegram identity
```

Implement **linking before login**.

Login must fail when the verified Telegram identity has no existing CRM
mapping.

Never auto-link based on:

-   Telegram username;
-   display name;
-   email;
-   phone number.

Never accept a target CRM `userId` from the browser during linking. Bind
the link transaction to the currently authenticated user on the server.

## Telegram security

Use Telegram's current OpenID Connect Authorization Code flow with PKCE.

Implement or reuse library support for:

-   PKCE S256;
-   state;
-   nonce;
-   server-side authorization-code exchange;
-   JWT signature verification through JWKS;
-   issuer validation;
-   audience/client ID validation;
-   expiration validation;
-   single-use short-lived transactions.

Do not hand-roll cryptographic verification if an appropriate maintained
library can handle it.

Do not persist authorization codes, ID tokens, PKCE verifiers or other
temporary secrets after the flow is complete.

Do not expose client secrets to the frontend.

## Existing security behavior

Telegram authentication must not bypass:

-   user status;
-   account approval;
-   roles;
-   permissions;
-   existing mandatory 2FA rules;
-   session security;
-   CSRF protections;
-   rate limits.

If the existing code does not make it clear whether Telegram should
replace the second factor for a particular role, **do not silently
change the policy**. Preserve the current 2FA requirement and document
the decision point.

## Database

Before creating a migration, inspect the actual Prisma schema.

If no provider identity abstraction exists, implement the smallest
provider-neutral model required by the specification.

Enforce identity uniqueness at database level.

Handle concurrent linking correctly; do not rely only on a pre-insert
lookup.

Generate a proper Prisma migration using the repository's normal
workflow.

Do not manually alter production data.

## API

Map the specification's conceptual endpoints onto existing route
conventions.

Do not create duplicate generic auth/provider infrastructure if it
already exists.

Keep `LOGIN` and `LINK` transactions explicitly separated on the server.

The callback must determine its flow from trusted server-side
transaction state, not a client-provided flag.

## Frontend

Reuse the current login screen and design system.

Add a secondary Telegram action beneath the existing login form.

Add Telegram connection management to the appropriate Profile/Security
area.

Reuse:

-   buttons;
-   loaders;
-   notifications;
-   error presentation;
-   typography;
-   spacing;
-   auth store/hooks;
-   API client;
-   existing SCSS conventions.

Do not introduce a new styling system.

Do not redesign unrelated authentication UI.

## Errors

Use the existing API error contract.

Provide safe handling for at least:

``` text
OIDC_CANCELLED
OIDC_STATE_INVALID
OIDC_TRANSACTION_EXPIRED
OIDC_NONCE_INVALID
OIDC_TOKEN_INVALID
TELEGRAM_NOT_LINKED
TELEGRAM_ALREADY_LINKED
USER_NOT_AUTHORIZED
PROVIDER_UNAVAILABLE
```

These names are conceptual. Use existing project naming conventions.

Avoid account enumeration.

## Audit and observability

Reuse existing audit/logging/OpenTelemetry mechanisms.

Add meaningful events for:

``` text
Telegram linked
Telegram unlinked
Telegram login success
Telegram login failure
```

Never log:

``` text
authorization code
ID token
access token
PKCE verifier
client secret
```

## Testing

Add focused unit and integration coverage first.

At minimum verify:

``` text
linked Telegram + active CRM user -> login succeeds

valid Telegram + no CRM mapping -> denied

linked Telegram + inactive/blocked CRM user -> denied

invalid state -> denied

invalid nonce -> denied

expired transaction -> denied

Telegram identity already owned by another user -> linking denied

authenticated CRM user + unused Telegram identity -> linking succeeds

unlink -> mapping removed
```

Mock the Telegram/OIDC boundary in normal automated tests.

Do not make CI depend on Telegram being reachable.

Add E2E coverage only through the project's established E2E approach.

## Implementation sequence

Work in these phases and keep diffs focused:

``` text
Phase 1 — Discovery and implementation plan
Phase 2 — Identity domain/data model
Phase 3 — Telegram OIDC adapter
Phase 4 — Link/unlink
Phase 5 — Telegram login
Phase 6 — Frontend
Phase 7 — Security hardening, audit and tests
Phase 8 — Documentation and final verification
```

After each phase:

1.  inspect `git diff`;
2.  run the narrowest relevant checks;
3.  fix issues before expanding scope.

At the end run the repository's required CI/typecheck/lint/test
commands.

## Constraints

Do not:

-   refactor unrelated authentication code;
-   create duplicate utilities;
-   create new services when existing ones can be extended cleanly;
-   change API response conventions;
-   change session semantics unnecessarily;
-   store Telegram tokens unnecessarily;
-   use Telegram username as an identifier;
-   allow registration through Telegram;
-   weaken existing 2FA;
-   modify unrelated files;
-   commit secrets;
-   invent repository conventions.

When the specification conflicts with an established architectural rule
in the repository, identify the conflict and propose the smallest
compatible solution.

## Required plan output

Before coding, provide a plan containing:

### Current architecture

Briefly describe the actual auth flow discovered in the repository.

### Files/modules affected

For each expected file/module:

``` text
path
purpose
planned change
```

### Data changes

Show proposed Prisma changes and migration impact.

### Backend flow

Explain login, link and unlink against the actual services/routes.

### Frontend flow

Identify actual components/features to extend.

### Security decisions

Explicitly state how:

``` text
state
nonce
PKCE
OIDC transaction TTL
JWT verification
account status
2FA
session creation
rate limiting
audit
```

will work.

### Test plan

List exact existing/new test locations and scenarios.

### Risks / unresolved decisions

Only include decisions that genuinely cannot be derived from the
existing code or specification.

## Completion report

When implementation is complete, report:

1.  what was implemented;
2.  important architectural decisions;
3.  migrations created;
4.  endpoints/flows added;
5.  tests added;
6.  commands executed and results;
7.  remaining limitations or manual configuration;
8.  required environment variables;
9.  Telegram/BotFather configuration that must be performed outside the
    repository.

Do not claim completion if tests or required checks are failing.
