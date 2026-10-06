# Telegram Mini App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the inline-keyboard Telegram admin bot with a Telegram Mini App (real web forms/styles) that reuses the existing REST API and service layer end to end, and properly fix Telegram identity linking using the real numeric id `initData` provides.

**Architecture:** A new Express auth path (`X-Telegram-Init-Data` header, HMAC-verified, resolved to a CRM `User` via a new `AuthProvider.TELEGRAM_MINIAPP` identity) is layered into the *existing* `isAuthenticated` middleware, so the *existing* `/mollie/dashboard/summary`, `/clients` (GET/POST) routes work for the Mini App with no route-level changes. A small dependency-free TypeScript frontend (esbuild, no framework) reuses the existing Sero CSS tokens and calls those same endpoints.

**Tech Stack:** Express 5, Prisma 6, Zod, Node `crypto` (HMAC-SHA256) for initData verification, esbuild for the frontend bundle, `node --test -r ts-node/register` for server tests.

**Spec:** `docs/superpowers/specs/2026-09-23-telegram-mini-app-design.md` — read it before starting; this plan implements it exactly, plus one gap the spec didn't resolve (see Task 4).

## Global Constraints

- Reuse existing services/controllers verbatim wherever the spec says to — no parallel business logic (spec §3, §4).
- New `AuthProvider` value (`TELEGRAM_MINIAPP`) is distinct from the OIDC `TELEGRAM` value — never conflate the two (spec §4.1).
- Every server file follows the existing `modules/<name>/<name>.routes.ts -> .controller.ts -> .service.ts` pattern (`AGENTS.md`).
- Server tests: `node --test -r ts-node/register <file>`, then the module's own `npm run test:*` script, per `AGENTS.md`.
- Frontend bundle is intentionally NOT part of `client/`'s FSD tree and does not use React/Redux (spec §4.2) — plain TypeScript + esbuild.
- No secrets/tokens ever logged (existing project-wide rule, `docs/spec/DDC_LOCAL_AI_EMAIL_ASSISTANT_SPEC.md` §15 states it for that feature but the rule is project-wide).
- Conventional Commits (`feat:`, `fix:`, `refactor:`, `chore:`, `test:`, `docs:`) per `AGENTS.md`.

---

### Task 1: Schema — new `AuthProvider` and `AuthSecurityEventType` values

**Files:**
- Modify: `server/prisma/schema/user.prisma` (the `AuthProvider` enum, currently just `TELEGRAM`; the `AuthSecurityEventType` enum, ends with `TELEGRAM_ADMIN_PAYMENT_LINK_CREATED`)
- Create: `server/prisma/migrations/<timestamp>_add_telegram_miniapp/migration.sql`

**Interfaces:**
- Produces: `AuthProvider.TELEGRAM_MINIAPP` (used by Tasks 3-5), `AuthSecurityEventType.TELEGRAM_MINIAPP_STUDENT_CREATED` (used by Task 10).

- [ ] **Step 1: Edit the enums**

In `server/prisma/schema/user.prisma`, change:
```prisma
enum AuthProvider {
  TELEGRAM
}
```
to:
```prisma
enum AuthProvider {
  TELEGRAM
  TELEGRAM_MINIAPP
}
```
And add one line to the end of `AuthSecurityEventType` (before the closing `}`):
```prisma
  TELEGRAM_MINIAPP_STUDENT_CREATED
```

- [ ] **Step 2: Generate the migration SQL**

Run (from `server/`, using the real dev DB credentials already used earlier this session):
```bash
DATABASE_URL="mysql://hhdc:hhdc_password@127.0.0.1:33061/hhdc" npx prisma migrate diff \
  --from-url "mysql://hhdc:hhdc_password@127.0.0.1:33061/hhdc" \
  --to-schema-datamodel prisma/schema \
  --script
```
Expected output: two `ALTER TABLE ... MODIFY ... ENUM(...)` statements (one for `auth_identities.provider`, one for `auth_security_events.type`), each enum list gaining exactly the one new value at the end.

- [ ] **Step 3: Write the migration folder and deploy**

```bash
mkdir -p prisma/migrations/<YYYYMMDDHHMMSS>_add_telegram_miniapp
```
Paste the exact SQL from Step 2 into `prisma/migrations/<YYYYMMDDHHMMSS>_add_telegram_miniapp/migration.sql`, then:
```bash
DATABASE_URL="mysql://hhdc:hhdc_password@127.0.0.1:33061/hhdc" npx prisma migrate deploy
npm run prisma:generate
```
Expected: "All migrations have been successfully applied." and a clean Prisma Client generation.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema/user.prisma prisma/migrations/
git commit -m "feat(auth): add TELEGRAM_MINIAPP provider and its audit event type"
```

---

### Task 2: `verifyTelegramInitData` — pure HMAC verification

**Files:**
- Create: `server/src/modules/auth/telegram-miniapp/telegram-miniapp-init-data.service.ts`
- Test: `server/src/modules/auth/telegram-miniapp/telegram-miniapp-init-data.service.test.ts`

**Interfaces:**
- Produces: `verifyTelegramInitData(initData: string, botToken: string, now?: () => Date): VerifyInitDataResult`, `VerifyInitDataResult = { ok: true; telegramUserId: string; firstName?: string; lastName?: string; username?: string } | { ok: false; reason: string }`. Consumed by Task 3's resolver.

This implements Telegram's documented WebApp `initData` verification algorithm (HMAC-SHA256, secret derived from the bot token with the fixed key `"WebAppData"`).

- [ ] **Step 1: Write the failing tests**

```typescript
import assert from 'node:assert/strict';
import test from 'node:test';
import { createHmac } from 'node:crypto';
import { verifyTelegramInitData } from './telegram-miniapp-init-data.service';

const BOT_TOKEN = 'test-token:ABCDEF';

// Mirrors Telegram's own client-side signing algorithm independently of the
// implementation under test, so this fixture proves our verifier accepts
// what a real Telegram client would actually send.
const signInitData = (fields: Record<string, string>, botToken: string): string => {
    const dataCheckString = Object.keys(fields)
        .sort()
        .map((key) => `${key}=${fields[key]}`)
        .join('\n');
    const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest();
    const hash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
    return new URLSearchParams({ ...fields, hash }).toString();
};

const validFields = (authDateSeconds: number) => ({
    query_id: 'AAHdF6IQAAAAAN0XohDhrOrc',
    user: JSON.stringify({ id: 123456789, first_name: 'Anna', last_name: 'K', username: 'anna_k' }),
    auth_date: String(authDateSeconds),
});

test('accepts a correctly signed, fresh initData string', () => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const initData = signInitData(validFields(nowSeconds), BOT_TOKEN);

    const result = verifyTelegramInitData(initData, BOT_TOKEN);

    assert.equal(result.ok, true);
    if (result.ok) {
        assert.equal(result.telegramUserId, '123456789');
        assert.equal(result.firstName, 'Anna');
        assert.equal(result.username, 'anna_k');
    }
});

test('rejects a tampered payload (hash no longer matches)', () => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const initData = signInitData(validFields(nowSeconds), BOT_TOKEN);
    const tampered = initData.replace('Anna', 'Mallory');

    const result = verifyTelegramInitData(tampered, BOT_TOKEN);

    assert.equal(result.ok, false);
});

test('rejects a signature produced with a different bot token', () => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const initData = signInitData(validFields(nowSeconds), 'a-different-token:XYZ');

    const result = verifyTelegramInitData(initData, BOT_TOKEN);

    assert.equal(result.ok, false);
});

test('rejects initData older than 24 hours', () => {
    const twoDaysAgoSeconds = Math.floor(Date.now() / 1000) - 2 * 24 * 60 * 60;
    const initData = signInitData(validFields(twoDaysAgoSeconds), BOT_TOKEN);

    const result = verifyTelegramInitData(initData, BOT_TOKEN);

    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.reason, /expired|old/i);
});

test('rejects initData with no hash field at all', () => {
    const result = verifyTelegramInitData('query_id=abc&auth_date=123', BOT_TOKEN);
    assert.equal(result.ok, false);
});

test('rejects initData whose user field is not valid JSON', () => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const fields = { ...validFields(nowSeconds), user: 'not-json' };
    const initData = signInitData(fields, BOT_TOKEN);

    const result = verifyTelegramInitData(initData, BOT_TOKEN);

    assert.equal(result.ok, false);
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd server && node --test -r ts-node/register src/modules/auth/telegram-miniapp/telegram-miniapp-init-data.service.test.ts
```
Expected: fails with `Cannot find module './telegram-miniapp-init-data.service'`.

- [ ] **Step 3: Write the implementation**

```typescript
import { createHmac, timingSafeEqual } from 'node:crypto';

export type VerifyInitDataResult =
    | { ok: true; telegramUserId: string; firstName?: string; lastName?: string; username?: string }
    | { ok: false; reason: string };

const MAX_AGE_SECONDS = 24 * 60 * 60;
const FUTURE_SKEW_SECONDS = 60;

interface TelegramInitDataUser {
    id: number;
    first_name?: string;
    last_name?: string;
    username?: string;
}

// Telegram's documented WebApp initData check: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
// secret_key = HMAC_SHA256(bot_token, key="WebAppData"); hash = HEX(HMAC_SHA256(data_check_string, key=secret_key)).
export const verifyTelegramInitData = (
    initData: string,
    botToken: string,
    now: () => Date = () => new Date(),
): VerifyInitDataResult => {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return { ok: false, reason: 'missing hash' };
    params.delete('hash');

    const dataCheckString = Array.from(params.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');

    const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest();
    const computedHash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    let hashBuffer: Buffer;
    let computedBuffer: Buffer;
    try {
        hashBuffer = Buffer.from(hash, 'hex');
        computedBuffer = Buffer.from(computedHash, 'hex');
    } catch {
        return { ok: false, reason: 'malformed hash' };
    }
    if (hashBuffer.length !== computedBuffer.length || !timingSafeEqual(hashBuffer, computedBuffer)) {
        return { ok: false, reason: 'invalid signature' };
    }

    const authDateRaw = params.get('auth_date');
    if (!authDateRaw) return { ok: false, reason: 'missing auth_date' };
    const authDateSeconds = Number(authDateRaw);
    if (!Number.isFinite(authDateSeconds)) return { ok: false, reason: 'malformed auth_date' };
    const ageSeconds = now().getTime() / 1000 - authDateSeconds;
    if (ageSeconds > MAX_AGE_SECONDS) return { ok: false, reason: 'initData expired' };
    if (ageSeconds < -FUTURE_SKEW_SECONDS) return { ok: false, reason: 'initData auth_date is in the future' };

    const userRaw = params.get('user');
    if (!userRaw) return { ok: false, reason: 'missing user field' };
    let parsedUser: TelegramInitDataUser;
    try {
        parsedUser = JSON.parse(userRaw);
    } catch {
        return { ok: false, reason: 'malformed user field' };
    }
    if (typeof parsedUser.id !== 'number') return { ok: false, reason: 'missing user.id' };

    return {
        ok: true,
        telegramUserId: String(parsedUser.id),
        firstName: parsedUser.first_name,
        lastName: parsedUser.last_name,
        username: parsedUser.username,
    };
};
```

- [ ] **Step 4: Run to verify it passes**

```bash
cd server && node --test -r ts-node/register src/modules/auth/telegram-miniapp/telegram-miniapp-init-data.service.test.ts
```
Expected: `# pass 6`, `# fail 0`.

- [ ] **Step 5: Commit**

```bash
git add src/modules/auth/telegram-miniapp/
git commit -m "feat(auth): add Telegram Mini App initData HMAC verification"
```

---

### Task 3: Mini App identity lookup + linking service

**Files:**
- Create: `server/src/modules/auth/telegram-miniapp/telegram-miniapp-identity.service.ts`
- Test: `server/src/modules/auth/telegram-miniapp/telegram-miniapp-identity.service.test.ts`

**Interfaces:**
- Consumes: `AuthProvider.TELEGRAM_MINIAPP` (Task 1).
- Produces: `findMiniAppIdentityByTelegramUserId(telegramUserId: string): Promise<{ user: User } | null>` and `linkMiniAppIdentity(input: { userId: number; telegramUserId: string; username?: string; displayName?: string }): Promise<LinkMiniAppIdentityResult>` where `LinkMiniAppIdentityResult = { ok: true } | { ok: false; reason: 'USER_ALREADY_LINKED' | 'IDENTITY_ALREADY_LINKED' }`. Consumed by Task 4 (linking endpoint) and Task 5 (auth middleware).

This mirrors the shape of the existing OIDC `auth/telegram/auth.telegram.identity.service.ts` but is its own file for its own provider — see spec §4.1 for why they are not merged.

- [ ] **Step 1: Write the failing tests**

```typescript
import assert from 'node:assert/strict';
import test from 'node:test';
import { findMiniAppIdentityByTelegramUserId, linkMiniAppIdentity } from './telegram-miniapp-identity.service';
import prisma from '../../../../prisma/prisma-client';

// Real DB integration test — same pattern as auth.telegram.identity.service.test.ts.
// Requires a test user to exist; create one and clean up after.
test('linkMiniAppIdentity creates a row findable by findMiniAppIdentityByTelegramUserId', async (t) => {
    const testUser = await prisma.user.create({
        data: {
            email: `miniapp-test-${Date.now()}@example.com`,
            password: 'irrelevant',
            role: 'ADMIN',
            isEnabled: true,
        },
    });
    t.after(async () => {
        await prisma.authIdentity.deleteMany({ where: { userId: testUser.id } });
        await prisma.user.delete({ where: { id: testUser.id } });
    });

    const linkResult = await linkMiniAppIdentity({ userId: testUser.id, telegramUserId: '999888777', username: 'test_admin' });
    assert.deepEqual(linkResult, { ok: true });

    const found = await findMiniAppIdentityByTelegramUserId('999888777');
    assert.equal(found?.user.id, testUser.id);
});

test('findMiniAppIdentityByTelegramUserId returns null for an unlinked id', async () => {
    const found = await findMiniAppIdentityByTelegramUserId('no-such-telegram-id-ever');
    assert.equal(found, null);
});

test('linkMiniAppIdentity rejects linking a second Telegram id to a user that already has one', async (t) => {
    const testUser = await prisma.user.create({
        data: { email: `miniapp-test2-${Date.now()}@example.com`, password: 'irrelevant', role: 'ADMIN', isEnabled: true },
    });
    t.after(async () => {
        await prisma.authIdentity.deleteMany({ where: { userId: testUser.id } });
        await prisma.user.delete({ where: { id: testUser.id } });
    });

    await linkMiniAppIdentity({ userId: testUser.id, telegramUserId: '111222333' });
    const second = await linkMiniAppIdentity({ userId: testUser.id, telegramUserId: '444555666' });

    assert.deepEqual(second, { ok: false, reason: 'USER_ALREADY_LINKED' });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd server && node --test -r ts-node/register src/modules/auth/telegram-miniapp/telegram-miniapp-identity.service.test.ts
```
Expected: fails with `Cannot find module './telegram-miniapp-identity.service'`.

- [ ] **Step 3: Write the implementation**

```typescript
import { AuthProvider, Prisma } from '@prisma/client';
import prisma from '../../../../prisma/prisma-client';

const PRISMA_UNIQUE_CONSTRAINT_ERROR = 'P2002';

export const findMiniAppIdentityByTelegramUserId = (telegramUserId: string) => prisma.authIdentity.findUnique({
    where: { provider_providerUserId: { provider: AuthProvider.TELEGRAM_MINIAPP, providerUserId: telegramUserId } },
    include: { user: true },
});

const findMiniAppIdentityByUserId = (userId: number) => prisma.authIdentity.findFirst({
    where: { userId, provider: AuthProvider.TELEGRAM_MINIAPP },
});

export type LinkMiniAppIdentityResult =
    | { ok: true }
    | { ok: false; reason: 'USER_ALREADY_LINKED' | 'IDENTITY_ALREADY_LINKED' };

interface LinkMiniAppIdentityInput {
    userId: number;
    telegramUserId: string;
    username?: string;
    displayName?: string;
}

// At most one Mini App identity per CRM user, same policy as the OIDC identity service — the
// unique index on [provider, providerUserId] is the real defense against a race; this check is
// a fast-path rejection, not the source of truth.
export const linkMiniAppIdentity = async ({
    userId,
    telegramUserId,
    username,
    displayName,
}: LinkMiniAppIdentityInput): Promise<LinkMiniAppIdentityResult> => {
    const existingForUser = await findMiniAppIdentityByUserId(userId);
    if (existingForUser) return { ok: false, reason: 'USER_ALREADY_LINKED' };

    try {
        await prisma.authIdentity.create({
            data: {
                userId,
                provider: AuthProvider.TELEGRAM_MINIAPP,
                providerUserId: telegramUserId,
                username: username ?? null,
                displayName: displayName ?? null,
            },
        });
        return { ok: true };
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === PRISMA_UNIQUE_CONSTRAINT_ERROR) {
            return { ok: false, reason: 'IDENTITY_ALREADY_LINKED' };
        }
        throw error;
    }
};
```

- [ ] **Step 4: Run to verify it passes**

```bash
cd server && node --test -r ts-node/register src/modules/auth/telegram-miniapp/telegram-miniapp-identity.service.test.ts
```
Expected: `# pass 3`, `# fail 0`. (Requires the real dev DB reachable — same as every other integration test in this codebase.)

- [ ] **Step 5: Commit**

```bash
git add src/modules/auth/telegram-miniapp/telegram-miniapp-identity.service.ts src/modules/auth/telegram-miniapp/telegram-miniapp-identity.service.test.ts
git commit -m "feat(auth): add Telegram Mini App identity lookup and linking"
```

---

### Task 4: Admin-only linking endpoint (closes the spec gap)

The design spec did not specify how a *brand new* admin gets their first `TELEGRAM_MINIAPP`
identity row created — `initData` only proves "who is asking right now," it can't tell the server
which CRM user that Telegram account belongs to on a first-ever contact. This task replaces the
raw `docker exec ... prisma.authIdentity.create` used as a stopgap earlier this session with a
real, authenticated, ADMIN-only endpoint: an already-linked admin submits another admin's numeric
Telegram id (still obtained out-of-band via `@userinfobot`, same as before) to link them.

**Files:**
- Modify: `server/src/modules/users/users.controller.ts` (add `linkTelegramMiniAppController`)
- Modify: `server/src/modules/users/users.routes.ts` (add the route)
- Test: `server/src/modules/users/users.controller.test.ts` (add cases)

**Interfaces:**
- Consumes: `linkMiniAppIdentity` (Task 3).
- Produces: `POST /api/v1/users/:id/telegram-miniapp-link` — request body `{ telegramUserId: string }`, gated by `requireRole(UserRole.ADMIN)`.

- [ ] **Step 1: Write the failing test**

```typescript
// Add to server/src/modules/users/users.controller.test.ts — follow that file's existing
// fakeRequest/fakeResponse helpers and import style; this shows the two cases that matter.
test('linkTelegramMiniAppController links a valid numeric Telegram id to the target user', async (t) => {
    t.mock.method(identityService, 'linkMiniAppIdentity', async () => ({ ok: true }));
    const req = fakeRequest({ params: { id: '5' }, body: { telegramUserId: '348397131' } });
    const res = fakeResponse();

    await linkTelegramMiniAppController(req, res);

    assert.equal(res.statusCode, 200);
});

test('linkTelegramMiniAppController rejects a non-numeric telegramUserId', async () => {
    const req = fakeRequest({ params: { id: '5' }, body: { telegramUserId: 'not-a-number' } });
    const res = fakeResponse();

    await linkTelegramMiniAppController(req, res);

    assert.equal(res.statusCode, 400);
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd server && node --test -r ts-node/register src/modules/users/users.controller.test.ts
```
Expected: fails — `linkTelegramMiniAppController` is not exported yet.

- [ ] **Step 3: Write the implementation**

In `server/src/modules/users/users.controller.ts`, add:
```typescript
import { z } from 'zod';
import { linkMiniAppIdentity } from '../auth/telegram-miniapp/telegram-miniapp-identity.service';

const linkTelegramMiniAppSchema = z.object({
    telegramUserId: z.string().trim().regex(/^\d+$/, 'Telegram id must be numeric'),
});

export const linkTelegramMiniAppController = async (req: Request, res: Response) => {
    const targetUserId = Number(req.params.id);
    if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
        return res.status(400).json({ message: 'Invalid user id' });
    }
    const parsed = linkTelegramMiniAppSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ message: 'Проверьте Telegram id', details: parsed.error.flatten() });
    }

    const result = await linkMiniAppIdentity({ userId: targetUserId, telegramUserId: parsed.data.telegramUserId });
    if (!result.ok) {
        const message = result.reason === 'USER_ALREADY_LINKED'
            ? 'У этого пользователя уже есть привязанный Telegram Mini App аккаунт'
            : 'Этот Telegram аккаунт уже привязан к другому пользователю';
        return res.status(409).json({ message });
    }

    return res.status(200).json({ message: 'Telegram Mini App привязан' });
};
```
In `server/src/modules/users/users.routes.ts`, add (matching the existing `requireRole` import already used by that file for other admin-only routes):
```typescript
router.post('/:id/telegram-miniapp-link', asyncHandler(isAuthenticated), requireRole(UserRole.ADMIN), asyncHandler(linkTelegramMiniAppController));
```

- [ ] **Step 4: Run to verify it passes**

```bash
cd server && node --test -r ts-node/register src/modules/users/users.controller.test.ts
```
Expected: both new tests pass, no existing test in the file regresses.

- [ ] **Step 5: Commit**

```bash
git add src/modules/users/users.controller.ts src/modules/users/users.routes.ts src/modules/users/users.controller.test.ts
git commit -m "feat(users): add admin-only Telegram Mini App linking endpoint"
```

---

### Task 5: Wire `isAuthenticated` to accept `X-Telegram-Init-Data`

**Files:**
- Modify: `server/src/modules/auth/auth.middleware.ts:8-28` (the `isAuthenticated` function)
- Test: `server/src/modules/auth/auth.middleware.test.ts` (add cases)

**Interfaces:**
- Consumes: `verifyTelegramInitData` (Task 2), `findMiniAppIdentityByTelegramUserId` (Task 3), `getUserById` (existing, `../users/users.service`).
- Produces: `isAuthenticated` now also succeeds for a valid, ADMIN-owning `X-Telegram-Init-Data` header — every route already gated by `isAuthenticated`/`isToken` (they are the same function) gets Mini App support for free, per spec §4.

- [ ] **Step 1: Write the failing tests**

```typescript
// Add to server/src/modules/auth/auth.middleware.test.ts
import { isAuthenticated } from './auth.middleware';
import * as initDataService from './telegram-miniapp/telegram-miniapp-init-data.service';
import * as identityService from './telegram-miniapp/telegram-miniapp-identity.service';
import * as usersService from '../users/users.service';

const createTelegramReq = (initData: string | undefined) => ({
    cookies: {},
    header: (name: string) => (name.toLowerCase() === 'x-telegram-init-data' ? initData : undefined),
} as unknown as Request);

test('isAuthenticated accepts a valid X-Telegram-Init-Data header for a linked, enabled ADMIN', async (t) => {
    t.mock.method(initDataService, 'verifyTelegramInitData', () => ({ ok: true, telegramUserId: '348397131' }));
    t.mock.method(identityService, 'findMiniAppIdentityByTelegramUserId', async () => ({
        user: { id: 1, role: 'ADMIN', isEnabled: true },
    }));
    const req = createTelegramReq('irrelevant-because-mocked');
    const res = createRes();
    let nextCalled = false;

    await isAuthenticated(req, res, () => { nextCalled = true; });

    assert.equal(nextCalled, true);
    assert.equal((req as unknown as { user: { id: number } }).user.id, 1);
});

test('isAuthenticated rejects an invalid X-Telegram-Init-Data signature', async (t) => {
    t.mock.method(initDataService, 'verifyTelegramInitData', () => ({ ok: false, reason: 'invalid signature' }));
    const req = createTelegramReq('tampered');
    const res = createRes();
    let nextCalled = false;

    await isAuthenticated(req, res, () => { nextCalled = true; });

    assert.equal(nextCalled, false);
    assert.equal((res as unknown as { statusCode: number }).statusCode, 401);
});

test('isAuthenticated rejects a valid signature with no linked identity', async (t) => {
    t.mock.method(initDataService, 'verifyTelegramInitData', () => ({ ok: true, telegramUserId: '000000' }));
    t.mock.method(identityService, 'findMiniAppIdentityByTelegramUserId', async () => null);
    const req = createTelegramReq('irrelevant-because-mocked');
    const res = createRes();
    let nextCalled = false;

    await isAuthenticated(req, res, () => { nextCalled = true; });

    assert.equal(nextCalled, false);
    assert.equal((res as unknown as { statusCode: number }).statusCode, 401);
});

test('isAuthenticated rejects a linked but non-ADMIN or disabled account', async (t) => {
    t.mock.method(initDataService, 'verifyTelegramInitData', () => ({ ok: true, telegramUserId: '348397131' }));
    t.mock.method(identityService, 'findMiniAppIdentityByTelegramUserId', async () => ({
        user: { id: 2, role: 'MANAGER', isEnabled: true },
    }));
    const req = createTelegramReq('irrelevant-because-mocked');
    const res = createRes();
    let nextCalled = false;

    await isAuthenticated(req, res, () => { nextCalled = true; });

    assert.equal(nextCalled, false);
    assert.equal((res as unknown as { statusCode: number }).statusCode, 401);
});

test('isAuthenticated falls through to the existing cookie check when the header is absent', async () => {
    const req = { cookies: {}, header: () => undefined } as unknown as Request;
    const res = createRes();
    let nextCalled = false;

    await isAuthenticated(req, res, () => { nextCalled = true; });

    assert.equal(nextCalled, false);
    assert.equal((res as unknown as { statusCode: number }).statusCode, 401); // no cookie either -> existing behavior
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd server && node --test -r ts-node/register src/modules/auth/auth.middleware.test.ts
```
Expected: the new tests fail (the header is never checked yet); existing `requireRole` tests in the same file still pass.

- [ ] **Step 3: Write the implementation**

Replace `isAuthenticated` in `server/src/modules/auth/auth.middleware.ts` with:
```typescript
import { NextFunction, Request, Response } from "express";
import { merge } from "lodash";
import { getUserByOpaqueSessionToken } from "./auth.token.service";
import { UserRole } from "@prisma/client";
import { verifyTelegramInitData } from "./telegram-miniapp/telegram-miniapp-init-data.service";
import { findMiniAppIdentityByTelegramUserId } from "./telegram-miniapp/telegram-miniapp-identity.service";

const cookieName = () => process.env.COOKIE_NAME || 'ddc_refresh';

const authenticateViaTelegramMiniApp = async (req: Request, res: Response, initData: string): Promise<boolean> => {
    const token = process.env.TELEGRAM_TOKEN?.trim();
    if (!token) {
        res.status(401).json({ message: "Unauthorized" });
        return false;
    }
    const verified = verifyTelegramInitData(initData, token);
    if (!verified.ok) {
        res.status(401).json({ message: "Unauthorized" });
        return false;
    }
    const identity = await findMiniAppIdentityByTelegramUserId(verified.telegramUserId);
    if (!identity?.user.isEnabled || identity.user.role !== UserRole.ADMIN) {
        res.status(401).json({ message: "Unauthorized" });
        return false;
    }
    merge(req, { user: identity.user });
    return true;
};

export const isAuthenticated = async (req: Request, res: Response, next: NextFunction) => {
    const initData = req.header('x-telegram-init-data');
    if (initData) {
        const ok = await authenticateViaTelegramMiniApp(req, res, initData);
        if (ok) next();
        return;
    }

    const sessionToken = req.cookies[cookieName()];

    if (!sessionToken) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    try {
        const session = await getUserByOpaqueSessionToken(sessionToken)
        if (!session?.user) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        merge(req, { user: session.user, token: sessionToken });

        return next();
    } catch (error) {
        console.error("Authentication error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}
```
(Only `isAuthenticated` changes; every other export in this file — `requireRole`, `requireOwnerOrRole`, `isToken = isAuthenticated`, `asyncHandler` — is untouched and automatically covered since `isToken` is a reference to the same function.)

- [ ] **Step 4: Run to verify it passes**

```bash
cd server && node --test -r ts-node/register src/modules/auth/auth.middleware.test.ts
npx tsc --noEmit
```
Expected: all tests pass (new and pre-existing `requireRole` ones); clean typecheck.

- [ ] **Step 5: Commit**

```bash
git add src/modules/auth/auth.middleware.ts src/modules/auth/auth.middleware.test.ts
git commit -m "feat(auth): accept Telegram Mini App initData in isAuthenticated"
```

---

### Task 6: CSRF exemption for Mini App requests

**Files:**
- Modify: `server/src/modules/auth/auth.csrf.middleware.ts` (the `csrfExempt` function)
- Test: `server/src/modules/auth/auth.csrf.middleware.test.ts` (add a case)

**Interfaces:**
- Produces: `csrfExempt(req)` now also returns `true` for any request carrying a non-empty `X-Telegram-Init-Data` header — see spec §4.3 for why path-exemption (like the three webhooks) doesn't work here.

- [ ] **Step 1: Write the failing test**

```typescript
// Add to server/src/modules/auth/auth.csrf.middleware.test.ts
test('a POST carrying X-Telegram-Init-Data is exempt from the cookie/CSRF-token check', () => {
    const req = fakeReq({
        method: 'POST',
        path: '/clients',
        headers: { 'x-telegram-init-data': 'query_id=abc&user=%7B%22id%22%3A1%7D&auth_date=1&hash=deadbeef' },
    });
    const { res, calls } = fakeRes();
    let calledNext = false;

    csrfProtection(req, res, () => { calledNext = true; });

    assert.equal(calledNext, true);
    assert.equal(calls.status, undefined);
});

test('a POST with no Telegram header and no CSRF token is still rejected', () => {
    const req = fakeReq({ method: 'POST', path: '/clients' });
    const { res, calls } = fakeRes();

    csrfProtection(req, res, () => {});

    assert.notEqual(calls.status, undefined);
    assert.notEqual(calls.status, 200);
});
```
(Reuse the existing `fakeReq`/`fakeRes` helpers already defined at the top of this test file — `fakeReq` already supports a `headers` map via its `header()` stub, as used by the existing webhook-exemption tests.)

- [ ] **Step 2: Run to verify it fails**

```bash
cd server && node --test -r ts-node/register src/modules/auth/auth.csrf.middleware.test.ts
```
Expected: the first new test fails (request is not yet exempt, falls through to the 403 CSRF-origin-required path in test/non-development `MODE`, or the cookie check).

- [ ] **Step 3: Write the implementation**

In `server/src/modules/auth/auth.csrf.middleware.ts`, change `csrfExempt`:
```typescript
const csrfExempt = (req: Request) => {
    const path = req.path;
    return (
        (req.method === 'POST' && authPostExempt.has(path))
        || path === '/mollie/webhook'
        || path === '/instagram/webhook'
        || path === '/telegram/webhook'
        // A Telegram Mini App request carries no session cookie at all — its own HMAC-verified
        // initData (checked later, in isAuthenticated) is that request's actual authenticity
        // proof, filling the role CSRF fills for cookie sessions. See spec §4.3.
        || Boolean(req.header('x-telegram-init-data'))
    );
};
```

- [ ] **Step 4: Run to verify it passes**

```bash
cd server && node --test -r ts-node/register src/modules/auth/auth.csrf.middleware.test.ts
```
Expected: all tests pass, including the three pre-existing webhook-exemption tests from earlier this session.

- [ ] **Step 5: Commit**

```bash
git add src/modules/auth/auth.csrf.middleware.ts src/modules/auth/auth.csrf.middleware.test.ts
git commit -m "feat(auth): exempt Telegram Mini App requests from CSRF checks"
```

---

### Task 7: `GET /clients/count`

**Files:**
- Modify: `server/src/modules/clients/clients.controller.ts` (add `getClientCountController`)
- Modify: `server/src/modules/clients/clients.routes.ts` (add the route)
- Test: `server/src/modules/clients/clients.service.test.ts` or a new `clients.controller.test.ts` — check which already exists first; add to whichever does.

**Interfaces:**
- Consumes: `getClientCount()` (already exists, `clients.service.ts`, added earlier this session for the inline bot's dashboard — no change needed).
- Produces: `GET /api/v1/clients/count` → `{ count: number }`, gated by the same `isToken` (== `isAuthenticated`) as every other `/clients` route — Task 5 already makes this Mini-App-reachable with zero extra work here.

- [ ] **Step 1: Write the failing test**

```typescript
// Add wherever clients.controller.ts's existing tests live (check for
// server/src/modules/clients/clients.controller.test.ts first; if it doesn't exist yet,
// create it following the fakeRequest/fakeResponse pattern from users.controller.test.ts).
test('getClientCountController returns the current student count as JSON', async (t) => {
    t.mock.method(clientsService, 'getClientCount', async () => 42);
    const req = {} as Request;
    const res = fakeResponse();

    await getClientCountController(req, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, { count: 42 });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd server && node --test -r ts-node/register src/modules/clients/clients.controller.test.ts
```
Expected: fails — `getClientCountController` not exported.

- [ ] **Step 3: Write the implementation**

In `server/src/modules/clients/clients.controller.ts`, add (near `fetchAllClientsController`):
```typescript
export const getClientCountController = async (req: Request, res: Response) => {
    const count = await getClientCount();
    return res.status(200).json({ count });
};
```
(Add `getClientCount` to the existing `import { createClient, deleteClient, getAllClients, getClientById, updateClient } from './clients.service';` line at the top of the file.)

In `server/src/modules/clients/clients.routes.ts`, add **above** the existing `router.get("/:id", ...)` line (route order matters — `/count` must not be swallowed by the `/:id` param route):
```typescript
router.get("/count", asyncHandler(isToken), asyncHandler(getClientCountController));
```
(Add `getClientCountController` to the existing controller import line.)

- [ ] **Step 4: Run to verify it passes**

```bash
cd server && node --test -r ts-node/register src/modules/clients/clients.controller.test.ts
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/modules/clients/clients.controller.ts src/modules/clients/clients.routes.ts src/modules/clients/clients.controller.test.ts
git commit -m "feat(clients): add GET /clients/count for the Mini App dashboard"
```

---

### Task 8: Frontend scaffold + design tokens + Dashboard screen

**Files:**
- Create: `client/telegram-mini-app/package.json` (own tiny `esbuild` devDependency + `build` script)
- Create: `client/telegram-mini-app/src/tokens.css` (extracted subset of Sero tokens)
- Create: `client/telegram-mini-app/src/index.html`
- Create: `client/telegram-mini-app/src/main.ts`
- Create: `client/telegram-mini-app/src/api.ts`
- Create: `client/telegram-mini-app/src/screens/dashboard.ts`
- Modify: `server/src/app.ts` (serve the built bundle)

**Interfaces:**
- Produces: `apiFetch(path, options)` in `api.ts` — a thin `fetch` wrapper that always sends `X-Telegram-Init-Data: Telegram.WebApp.initData`. Consumed by Tasks 9 and 10.
- Produces: `renderDashboard(container: HTMLElement): Promise<void>` in `dashboard.ts`. Consumed by `main.ts`'s screen router.

- [ ] **Step 1: Scaffold the package and install esbuild**

```bash
mkdir -p client/telegram-mini-app/src/screens
cd client/telegram-mini-app
npm init -y
npm install --save-dev esbuild@0.24.0 typescript@5.6.3
```
Edit the generated `package.json`'s `scripts` to:
```json
{
  "name": "ddc-telegram-mini-app",
  "private": true,
  "scripts": {
    "build": "esbuild src/main.ts --bundle --outfile=../../server/public/telegram-admin/app.js --minify && cp src/index.html ../../server/public/telegram-admin/index.html && cp src/tokens.css ../../server/public/telegram-admin/tokens.css"
  }
}
```

- [ ] **Step 2: Extract the design tokens actually used**

Create `client/telegram-mini-app/src/tokens.css` containing only the CSS custom properties this Mini App references (copy the exact values from `client/src/app/styles/themes/default.scss` and `dark.scss` for these specific names — do not invent values):
```css
:root {
    --primary-redesigned: #__COPY_FROM_default.scss__;
    --primary-hover-redesigned: #__COPY_FROM_default.scss__;
    --primary-contrast-redesigned: #__COPY_FROM_default.scss__;
    --sidebar-bg-redesigned: #__COPY_FROM_default.scss__;
    --sidebar-text-hover-redesigned: #__COPY_FROM_default.scss__;
    --sidebar-text-redesigned: #__COPY_FROM_default.scss__;
    --card-border-redesigned: #__COPY_FROM_default.scss__;
    --radius-sm-redesigned: 8px;
    --radius-md-redesigned: 12px;
    --radius-pill-redesigned: 9999px;
}

@media (prefers-color-scheme: dark) {
    :root {
        --sidebar-bg-redesigned: #__COPY_FROM_dark.scss__;
        --sidebar-text-hover-redesigned: #__COPY_FROM_dark.scss__;
        --sidebar-text-redesigned: #__COPY_FROM_dark.scss__;
        --card-border-redesigned: #__COPY_FROM_dark.scss__;
    }
}
```
**Executor note:** open `client/src/app/styles/themes/default.scss` and `dark.scss` and replace every
`__COPY_FROM_*.scss__` placeholder with the real value defined there for that exact token name —
these are the project's real design tokens (`.claude/rules/code-style.md` Rule 2), not values to
invent. This is the one step in this plan where a placeholder is intentional (it names an exact
file+token to copy from, not an open-ended TODO) because the concrete hex/px values live in a file
this plan must not duplicate by hand and risk drifting from.

- [ ] **Step 3: Write `index.html`, `api.ts`, `main.ts`, `dashboard.ts`**

`client/telegram-mini-app/src/index.html`:
```html
<!doctype html>
<html lang="ru">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>DDC Admin</title>
    <!-- No integrity/SRI hash by design: Telegram's own integration docs never publish one for
         this script, and it updates on Telegram's own schedule — pinning a hash would silently
         break the Mini App on Telegram's next update instead of failing loudly. -->
    <script src="https://telegram.org/js/telegram-web-app.js"></script>
    <link rel="stylesheet" href="tokens.css" />
    <style>
        body { margin: 0; padding: 16px; font-family: -apple-system, sans-serif; background: var(--sidebar-bg-redesigned); color: var(--sidebar-text-hover-redesigned); }
        .card { border: 1px solid var(--card-border-redesigned); border-radius: var(--radius-md-redesigned); padding: 16px; margin-bottom: 12px; }
        .metric-label { color: var(--sidebar-text-redesigned); font-size: 13px; }
        .metric-value { font-size: 24px; font-weight: 700; }
    </style>
</head>
<body>
    <div id="app"></div>
    <script src="app.js"></script>
</body>
</html>
```

`client/telegram-mini-app/src/api.ts`:
```typescript
declare global {
    interface Window {
        Telegram: { WebApp: { initData: string; ready: () => void; expand: () => void } };
    }
}

export const apiFetch = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
    const response = await fetch(`/api/v1${path}`, {
        ...options,
        headers: {
            ...options.headers,
            'Content-Type': 'application/json',
            'X-Telegram-Init-Data': window.Telegram.WebApp.initData,
        },
    });
    if (!response.ok) {
        const body = await response.json().catch(() => ({ message: 'Ошибка запроса' }));
        throw new Error(body.message ?? `HTTP ${response.status}`);
    }
    return response.json() as Promise<T>;
};
```

`client/telegram-mini-app/src/screens/dashboard.ts`:
```typescript
import { apiFetch } from '../api';

interface DashboardSummary {
    paidThisMonth: number;
    monthlyRevenue: number;
    activeSubscriptions: number;
    failedPayments: number;
}

export const renderDashboard = async (container: HTMLElement): Promise<void> => {
    container.innerHTML = '<div class="card">Загрузка...</div>';
    try {
        const [summary, countResult] = await Promise.all([
            apiFetch<DashboardSummary>('/mollie/dashboard/summary'),
            apiFetch<{ count: number }>('/clients/count'),
        ]);
        const money = new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(summary.monthlyRevenue);
        container.innerHTML = `
            <div class="card"><div class="metric-label">Ученики</div><div class="metric-value">${countResult.count}</div></div>
            <div class="card"><div class="metric-label">Платежей в этом месяце</div><div class="metric-value">${summary.paidThisMonth}</div></div>
            <div class="card"><div class="metric-label">Выручка за месяц</div><div class="metric-value">${money}</div></div>
            <div class="card"><div class="metric-label">Активные подписки</div><div class="metric-value">${summary.activeSubscriptions}</div></div>
        `;
    } catch (error) {
        container.innerHTML = `<div class="card">Не удалось загрузить: ${(error as Error).message}</div>`;
    }
};
```

`client/telegram-mini-app/src/main.ts`:
```typescript
import { renderDashboard } from './screens/dashboard';

window.Telegram.WebApp.ready();
window.Telegram.WebApp.expand();

const app = document.getElementById('app');
if (app) void renderDashboard(app);
```

- [ ] **Step 4: Serve the built bundle from the backend**

In `server/src/app.ts`, near the existing `app.use(express.static(path.join(ROOT_DIR, 'public'), ...))` line, the `public/telegram-admin/` subfolder Task 8 Step 1 builds into is already covered by that same static mount (no code change needed — `public/telegram-admin/index.html` becomes reachable at `/telegram-admin/index.html` automatically). Confirm this by running the build and requesting the URL:
```bash
cd client/telegram-mini-app && npm run build
cd ../.. && docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d backend
curl -s http://localhost:18080/telegram-admin/index.html | head -5
```
Expected: the raw HTML from Step 3 comes back.

- [ ] **Step 5: Commit**

```bash
git add client/telegram-mini-app/
git commit -m "feat(telegram-mini-app): scaffold frontend bundle and dashboard screen"
```

---

### Task 9: Student search screen

**Files:**
- Create: `client/telegram-mini-app/src/screens/search.ts`
- Modify: `client/telegram-mini-app/src/main.ts` (simple screen router)
- Modify: `client/telegram-mini-app/src/index.html` (nav)

**Interfaces:**
- Consumes: `apiFetch` (Task 8).
- Produces: `renderSearch(container: HTMLElement): Promise<void>`.

- [ ] **Step 1-4 (combined — UI screen, manually verified per spec §7, not unit-testable):**

`client/telegram-mini-app/src/screens/search.ts`:
```typescript
import { apiFetch } from '../api';

interface ClientSearchResult {
    id: number;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phoneNumber: string | null;
    mollieLinks: Array<{ customerId: number }>;
}

export const renderSearch = (container: HTMLElement): void => {
    container.innerHTML = `
        <input id="search-input" type="text" placeholder="Имя, email или телефон" style="width:100%;padding:10px;border-radius:var(--radius-sm-redesigned);border:1px solid var(--card-border-redesigned);box-sizing:border-box;margin-bottom:12px;" />
        <div id="search-results"></div>
    `;
    const input = container.querySelector<HTMLInputElement>('#search-input');
    const results = container.querySelector<HTMLDivElement>('#search-results');
    if (!input || !results) return;

    let debounceHandle: ReturnType<typeof setTimeout>;
    input.addEventListener('input', () => {
        clearTimeout(debounceHandle);
        const query = input.value.trim();
        if (!query) { results.innerHTML = ''; return; }
        debounceHandle = setTimeout(async () => {
            results.innerHTML = '<div class="card">Ищу...</div>';
            try {
                const clients = await apiFetch<ClientSearchResult[]>(`/clients?_q=${encodeURIComponent(query)}`);
                results.innerHTML = clients.length
                    ? clients.map((client) => `
                        <div class="card">
                            <strong>${client.firstName ?? ''} ${client.lastName ?? ''}</strong><br />
                            ${client.email ?? client.phoneNumber ?? ''}<br />
                            Mollie: ${client.mollieLinks?.length ? '✅' : '❌'}
                        </div>
                    `).join('')
                    : '<div class="card">Ничего не найдено</div>';
            } catch (error) {
                results.innerHTML = `<div class="card">Ошибка: ${(error as Error).message}</div>`;
            }
        }, 300);
    });
};
```
Update `main.ts` to add a two-tab router (Dashboard / Search / New student — New student stubbed until Task 10):
```typescript
import { renderDashboard } from './screens/dashboard';
import { renderSearch } from './screens/search';

window.Telegram.WebApp.ready();
window.Telegram.WebApp.expand();

const app = document.getElementById('app');
const nav = document.getElementById('nav');

const screens: Record<string, (container: HTMLElement) => void | Promise<void>> = {
    dashboard: renderDashboard,
    search: renderSearch,
};

const showScreen = (name: keyof typeof screens) => {
    if (app) void screens[name](app);
};

if (nav) {
    nav.querySelectorAll<HTMLButtonElement>('button[data-screen]').forEach((button) => {
        button.addEventListener('click', () => showScreen(button.dataset.screen as keyof typeof screens));
    });
}

showScreen('dashboard');
```
Add a `<nav id="nav">` with three buttons above `<div id="app">` in `index.html`.

**Manual verification (per spec §7 — no automated test exists for this):**
```bash
cd client/telegram-mini-app && npm run build
```
Open the Mini App from the real bot (or `https://hhdc.denys-myr.com/telegram-admin/index.html`
directly in a desktop browser for a quick visual check — `window.Telegram` will be undefined
there, so only test the *real* auth path from inside Telegram). Confirm: typing a known student's
name shows their card within ~1 second; an empty box shows nothing; a nonsense query shows "Ничего
не найдено".

- [ ] **Step 5: Commit**

```bash
git add client/telegram-mini-app/
git commit -m "feat(telegram-mini-app): add student search screen"
```

---

### Task 10: New student screen + audit event

**Files:**
- Create: `client/telegram-mini-app/src/screens/new-student.ts`
- Modify: `client/telegram-mini-app/src/main.ts` (wire the third tab)
- Modify: `server/src/modules/clients/clients.controller.ts`'s `createClientsController` — add the audit call (see Step 3)

**Interfaces:**
- Consumes: `apiFetch` (Task 8), `POST /clients` (existing, unchanged shape), `recordAuthSecurityEvent` (existing).
- Produces: `renderNewStudent(container: HTMLElement): void`.

- [ ] **Step 1: Write the failing server-side test for the new audit call**

```typescript
// Add to server/src/modules/clients/clients.controller.test.ts (or wherever createClientsController is already tested)
test('createClientsController records a TELEGRAM_MINIAPP_STUDENT_CREATED audit event when the actor is a Mini App session', async (t) => {
    const recorded: unknown[] = [];
    t.mock.method(auditService, 'recordAuthSecurityEvent', async (input: unknown) => { recorded.push(input); });
    t.mock.method(clientsService, 'createClient', async () => ({ id: 99, firstName: 'Anna', lastName: null }));
    const req = fakeRequest({ body: { firstName: 'Anna' }, user: { id: 1, role: 'ADMIN' } });
    const res = fakeResponse();

    await createClientsController(req, res);

    assert.equal(recorded.length, 1);
    assert.equal((recorded[0] as { type: string }).type, 'TELEGRAM_MINIAPP_STUDENT_CREATED');
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd server && node --test -r ts-node/register src/modules/clients/clients.controller.test.ts
```

- [ ] **Step 3: Add the audit call**

In `server/src/modules/clients/clients.controller.ts`'s `createClientsController`, after the
existing successful `createClient(...)` call and before `return res.status(200).json(client)`,
add:
```typescript
if (req.header('x-telegram-init-data')) {
    await recordAuthSecurityEvent({
        type: 'TELEGRAM_MINIAPP_STUDENT_CREATED',
        actorUserId: req.user?.id ?? null,
        metadata: { clientId: client.id },
        req,
    });
}
```
Add `import { recordAuthSecurityEvent } from '../auth/auth.security-audit.service';` to the top of
the file. This mirrors exactly how the inline bot recorded `TELEGRAM_ADMIN_STUDENT_CREATED` for its
own creation flow — same function, new event-type value, gated on the same header Task 5/6 already
established as "this request came from the Mini App."

- [ ] **Step 4: Run to verify it passes**

```bash
cd server && node --test -r ts-node/register src/modules/clients/clients.controller.test.ts
```

- [ ] **Step 5: Write the frontend screen and commit**

`client/telegram-mini-app/src/screens/new-student.ts`:
```typescript
import { apiFetch } from '../api';

export const renderNewStudent = (container: HTMLElement): void => {
    container.innerHTML = `
        <form id="new-student-form">
            <input name="firstName" placeholder="Имя" style="width:100%;padding:10px;margin-bottom:8px;border-radius:var(--radius-sm-redesigned);border:1px solid var(--card-border-redesigned);box-sizing:border-box;" />
            <input name="lastName" placeholder="Фамилия" style="width:100%;padding:10px;margin-bottom:8px;border-radius:var(--radius-sm-redesigned);border:1px solid var(--card-border-redesigned);box-sizing:border-box;" />
            <input name="phoneNumber" placeholder="Телефон" style="width:100%;padding:10px;margin-bottom:8px;border-radius:var(--radius-sm-redesigned);border:1px solid var(--card-border-redesigned);box-sizing:border-box;" />
            <input name="email" placeholder="Email" style="width:100%;padding:10px;margin-bottom:12px;border-radius:var(--radius-sm-redesigned);border:1px solid var(--card-border-redesigned);box-sizing:border-box;" />
            <button type="submit" style="width:100%;padding:12px;border-radius:var(--radius-pill-redesigned);border:none;background:var(--primary-redesigned);color:var(--primary-contrast-redesigned);font-weight:600;">Создать ученика</button>
        </form>
        <div id="new-student-result"></div>
    `;
    const form = container.querySelector<HTMLFormElement>('#new-student-form');
    const result = container.querySelector<HTMLDivElement>('#new-student-result');
    form?.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!result) return;
        const data = new FormData(form);
        const payload = {
            firstName: String(data.get('firstName') ?? '').trim() || undefined,
            lastName: String(data.get('lastName') ?? '').trim() || undefined,
            phoneNumber: String(data.get('phoneNumber') ?? '').trim() || undefined,
            email: String(data.get('email') ?? '').trim() || undefined,
        };
        try {
            const client = await apiFetch<{ id: number; firstName: string | null; lastName: string | null }>('/clients', {
                method: 'POST',
                body: JSON.stringify(payload),
            });
            result.innerHTML = `<div class="card">✅ Создан: ${client.firstName ?? ''} ${client.lastName ?? ''} (id ${client.id})</div>`;
            form.reset();
        } catch (error) {
            result.innerHTML = `<div class="card">⚠️ ${(error as Error).message}</div>`;
        }
    });
};
```
Wire it into `main.ts`'s `screens` map as `'new-student': renderNewStudent` and add the third nav
button in `index.html`.

```bash
cd client/telegram-mini-app && npm run build
git add client/telegram-mini-app/ ../server/src/modules/clients/
git commit -m "feat(telegram-mini-app): add new student screen with audit logging"
```

---

### Task 11: Rollout — Menu Button + retire the inline bot

This task is deliberately last and partly operational, not pure code — per spec §8, both
interfaces run in parallel until the Mini App is verified against real Telegram.

> **2026-09-24 update — extensibility requirement changed Step 3's implementation.** Rather than
> deleting `telegram-admin-bot.menu.ts` outright, the root menu was repurposed: its 3 buttons now
> use `web_app` (deep-linking straight into the Mini App via `?screen=<id>`) instead of
> `callback_data`, driven by a `MINI_APP_SCREENS` registry so a future 4th/5th screen is one
> array entry, not a multi-file edit. `telegram-admin-bot.state.ts` and the
> dashboard/search/student-create `.flow.ts` files were deleted as planned (nothing sends the
> `callback_data` values they responded to anymore). `telegram-update-dispatcher.ts`'s
> `hasActiveFlow` branch was removed for the same reason.
>
> **2026-09-24 update #2 — real-Telegram verification (Step 1) surfaced two production-only
> bugs, both fixed and confirmed working end to end:**
> 1. Telegram rejects `web_app` inline buttons outside a private 1:1 chat
>    (`BUTTON_TYPE_INVALID`) — this bot's real admin chat is a supergroup. `/start` now branches
>    on `chat.type`: private gets the real menu, anything else gets a `url` deep link into a
>    private chat with the bot (new `TELEGRAM_BOT_USERNAME` env var). See
>    [[project-telegram-miniapp-group-chat-webapp-restriction]] (agent memory).
> 2. Both `docker-compose.dev.yml`/`docker-compose.prod.yml` list env vars explicitly under
>    `environment:` (no `env_file: .env`) — `TELEGRAM_MINIAPP_URL` and `TELEGRAM_BOT_USERNAME`
>    both needed an explicit line added to each compose file, not just `.env`/`.env.example`.
> 3. Production's Mini App is actually served by the **frontend** nginx container
>    (`client/build/telegram-admin/`, via `client/package.json`'s `build:prod` already calling
>    `npm --prefix telegram-mini-app run build:client`) — not by the backend's `express.static`
>    (`server/public/telegram-admin/`), which is only reachable directly in local dev. No code
>    change needed here, just noting it so a future agent doesn't re-debug the same routing.
> 4. The Mini App identity link for the real production admin (Denis, `user_id=1`) didn't exist
>    yet under `AuthProvider.TELEGRAM_MINIAPP` — created via direct SQL insert using the real
>    numeric Telegram id already known from the OIDC workaround row (`348397131`).
>
> Confirmed working end to end in production 2026-09-24: `/start` in the group → deep link → real
> menu in private chat → all 3 Mini App screens loading live data. Step 2 (Menu Button) is set.
> Still open: retest the second-admin self-link path (Step 1's third bullet) whenever a second
> real admin is available, and Step 5 (final commit/cleanup) — Steps 3/4's code is already
> committed across several commits this session, not one final "chore:" commit as originally
> drafted.

**Files:**
- Delete: `server/src/modules/telegram-admin-bot/telegram-admin-bot.dashboard.flow.ts`,
  `telegram-admin-bot.student-search.flow.ts`, `telegram-admin-bot.student-create.flow.ts`,
  `telegram-admin-bot.menu.ts`, and their `.test.ts` files
- Modify: `server/src/modules/telegram-admin-bot/telegram-admin-bot.service.ts` (remove the
  dashboard/search/create-student branches; keep the file only if the shared RBAC resolver
  (`telegram-admin-bot.auth.ts`) or flow-state store (`telegram-admin-bot.state.ts`) turns out to
  still be imported elsewhere — check with `grep -rn` before deleting either)
- Modify: `server/src/common/telegram/telegram-update-dispatcher.ts` (remove routing to the retired
  admin-bot handler if nothing calls it anymore)
- Modify: `server/package.json` (remove `test:telegram-admin-bot` from `test:ci` once the module
  it tests is gone; delete the script itself if no file it references still exists)

**Interfaces:** none — this task only removes code and updates ops config, it produces nothing new.

- [ ] **Step 1: Verify the Mini App works end to end against real Telegram**

Manual checklist (no automated substitute exists, per spec §7):
- Open the Mini App URL directly in a desktop browser once — confirm it 401s cleanly (no
  `window.Telegram`, so no `initData`) rather than crashing.
- From the real bot in Telegram (mobile or desktop client), open the Mini App via its URL as a
  temporary inline/keyboard button (wire one manually for this check only if the Menu Button isn't
  set yet) as the already-linked ADMIN (Denis) — confirm Dashboard shows real numbers, Search
  finds a known real student, New Student creates one and the audit event appears in
  `auth_security_events`.
- Have a second ADMIN call `POST /users/:id/telegram-miniapp-link` (Task 4) with their own real
  numeric Telegram id (via `@userinfobot`), then open the Mini App themselves — confirms Task 4
  actually closes the self-service gap, not just the already-unblocked admin.

- [ ] **Step 2: Point the bot's Menu Button at the Mini App**

```bash
TOKEN="<current TELEGRAM_TOKEN from server .env>"
curl -s -X POST "https://api.telegram.org/bot${TOKEN}/setChatMenuButton" \
  -H "Content-Type: application/json" \
  -d '{"menu_button": {"type": "web_app", "text": "DDC Admin", "web_app": {"url": "https://hhdc.denys-myr.com/telegram-admin/index.html"}}}'
```
Expected: `{"ok":true,"result":true}`. Re-test from Telegram: the chat's menu button (bottom-left
icon next to the message box) now opens the Mini App directly.

- [ ] **Step 3: Retire the inline bot's now-redundant flows**

```bash
cd server
grep -rn "telegram-admin-bot.menu\|telegram-admin-bot.dashboard.flow\|telegram-admin-bot.student-search.flow\|telegram-admin-bot.student-create.flow" src/
```
Delete every file that grep shows is now only referenced by `telegram-admin-bot.service.ts` and
its own test, then edit `telegram-admin-bot.service.ts` to remove the `adm:dashboard`,
`adm:student:search`, `adm:student:new`, and `adm:student:confirm` branches from
`handleTelegramAdminBotUpdate` (leave `adm:menu:root`/`adm:cancel` only if anything else still
sends those callback values — if nothing does after the menu button change, remove the whole
handler and its entry in `telegram-update-dispatcher.ts`, falling back to only routing
`ai:draft:*`/`/edit` to the email-approval bot as it did before this feature existed).
Remove `"test:telegram-admin-bot"` from `test:ci` in `server/package.json` once its files are gone,
and delete the script line itself only if every file it lists has been deleted (grep the script's
own file list against what remains in `src/modules/telegram-admin-bot/` first).

- [ ] **Step 4: Run the full suite**

```bash
cd server && npm run test:ci
npx tsc --noEmit
npm run build
```
Expected: 0 failures, clean build — confirms nothing else depended on the removed files.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore(telegram): retire inline admin bot flows in favor of the Mini App"
```

---

## Self-Review Notes

- **Spec coverage:** §4 (architecture) → Tasks 1-7; §4.1 (distinct provider) → Task 1/3; §4.2
  (no React) → Task 8; §4.3 (CSRF) → Task 6; §4.4 (tokens) → Task 8; §5 (3 screens) → Tasks 8-10;
  §6 (error handling) → woven into Tasks 8-10's screen code (401/403 plain message, inline form
  errors); §7 (testing) → each backend task's own test, frontend tasks' manual checklist; §8
  (rollout) → Task 11. The one thing the spec didn't cover (how a brand-new admin's first link
  happens) is closed by Task 4, added during this planning pass.
- **Placeholder scan:** the only intentional placeholder is Task 8 Step 2's `__COPY_FROM_*.scss__`
  markers, which name an exact source file and token per value rather than leaving an open TODO —
  every other step has real, complete code.
- **Type consistency:** `VerifyInitDataResult` (Task 2) is consumed by name in Task 5 exactly as
  produced; `findMiniAppIdentityByTelegramUserId`'s return shape (`{ user: User } | null`, Task 3)
  matches how Task 5 destructures it (`identity.user.isEnabled`, `identity.user.role`).
