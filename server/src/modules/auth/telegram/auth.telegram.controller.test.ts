import test from 'node:test';
import assert from 'node:assert/strict';
import { AuthSecurityEventType, UserRole } from '@prisma/client';
import prisma from '../../../../prisma/prisma-client';
import {
    denyIfNotAdmin,
    getAuthProviders,
    isTelegramRoleAllowed,
    mapTransactionFailureToErrorCode,
    resolveTelegramLoginDenialReason,
} from './auth.telegram.controller';

process.env.JWT_ACCESS_SECRET ||= 'test-access-secret';
process.env.JWT_REFRESH_SECRET ||= 'test-refresh-secret';

// Same stubbing approach as comments.service.test.ts — see that file for why.
function stub<T extends (...args: never[]) => unknown>(
    delegate: Record<string, unknown>,
    method: string,
    impl: T,
): () => void {
    const original = delegate[method] as T;
    delegate[method] = impl;
    return () => {
        delegate[method] = original;
    };
}

// Minimal fake matching only what these controller functions call.
const fakeRes = () => {
    const calls: { status?: number; body?: unknown } = {};
    return {
        calls,
        status(code: number) {
            calls.status = code;
            return this;
        },
        json(body: unknown) {
            calls.body = body;
            return this;
        },
    };
};

test('isTelegramRoleAllowed is true only for ADMIN — the product decision is Telegram auth is ADMIN-only', () => {
    assert.equal(isTelegramRoleAllowed(UserRole.ADMIN), true);
    assert.equal(isTelegramRoleAllowed(UserRole.MANAGER), false);
    assert.equal(isTelegramRoleAllowed(UserRole.DOCTOR), false);
});

test('mapTransactionFailureToErrorCode distinguishes EXPIRED from every other failure reason', () => {
    assert.equal(mapTransactionFailureToErrorCode('EXPIRED'), 'OIDC_TRANSACTION_EXPIRED');
    assert.equal(mapTransactionFailureToErrorCode('NOT_FOUND'), 'OIDC_STATE_INVALID');
});

// Spec's required scenario: "linked Telegram + inactive/blocked CRM user ->
// denied". The linked-identity lookup itself is exercised by
// auth.telegram.identity.service.test.ts; this is the eligibility decision
// once that user row is in hand.
test('resolveTelegramLoginDenialReason denies a disabled account even for an ADMIN', () => {
    const reason = resolveTelegramLoginDenialReason({ isEnabled: false, role: UserRole.ADMIN });
    assert.equal(reason, 'ACCOUNT_DISABLED');
});

test('resolveTelegramLoginDenialReason denies an enabled non-ADMIN account', () => {
    const reason = resolveTelegramLoginDenialReason({ isEnabled: true, role: UserRole.MANAGER });
    assert.equal(reason, 'ROLE_NOT_ALLOWED');
});

test('resolveTelegramLoginDenialReason prioritizes ACCOUNT_DISABLED when both conditions hold', () => {
    const reason = resolveTelegramLoginDenialReason({ isEnabled: false, role: UserRole.MANAGER });
    assert.equal(reason, 'ACCOUNT_DISABLED');
});

test('resolveTelegramLoginDenialReason allows an enabled ADMIN', () => {
    const reason = resolveTelegramLoginDenialReason({ isEnabled: true, role: UserRole.ADMIN });
    assert.equal(reason, null);
});

test('getAuthProviders reports telegram enabled only when fully configured', async () => {
    const original = {
        id: process.env.TELEGRAM_OIDC_CLIENT_ID,
        secret: process.env.TELEGRAM_OIDC_CLIENT_SECRET,
        redirect: process.env.TELEGRAM_OIDC_REDIRECT_URI,
    };
    try {
        process.env.TELEGRAM_OIDC_CLIENT_ID = 'client-id';
        process.env.TELEGRAM_OIDC_CLIENT_SECRET = 'client-secret';
        process.env.TELEGRAM_OIDC_REDIRECT_URI = 'https://crm.example.com/callback';
        const res1 = fakeRes();
        await getAuthProviders({} as never, res1 as never);
        assert.deepEqual(res1.calls.body, { telegram: true });

        delete process.env.TELEGRAM_OIDC_CLIENT_SECRET;
        const res2 = fakeRes();
        await getAuthProviders({} as never, res2 as never);
        assert.deepEqual(res2.calls.body, { telegram: false });
    } finally {
        process.env.TELEGRAM_OIDC_CLIENT_ID = original.id;
        process.env.TELEGRAM_OIDC_CLIENT_SECRET = original.secret;
        process.env.TELEGRAM_OIDC_REDIRECT_URI = original.redirect;
    }
});

test('denyIfNotAdmin lets an ADMIN through without recording anything', async () => {
    let createCalled = false;
    const restore = stub(prisma.authSecurityEvent as unknown as Record<string, unknown>, 'create', async () => {
        createCalled = true;
        return {};
    });
    try {
        const denied = await denyIfNotAdmin(
            { ip: '127.0.0.1', headers: {} } as never,
            { id: 1, role: UserRole.ADMIN },
            AuthSecurityEventType.LOGIN_TELEGRAM_FAILED,
        );
        assert.equal(denied, false);
        assert.equal(createCalled, false);
    } finally {
        restore();
    }
});

test('denyIfNotAdmin rejects a non-ADMIN and audits the denial with reason ROLE_NOT_ALLOWED', async () => {
    let capturedArgs: unknown;
    const restore = stub(prisma.authSecurityEvent as unknown as Record<string, unknown>, 'create', async (args: unknown) => {
        capturedArgs = args;
        return {};
    });
    try {
        const denied = await denyIfNotAdmin(
            { ip: '127.0.0.1', headers: {} } as never,
            { id: 9, role: UserRole.MANAGER },
            AuthSecurityEventType.TELEGRAM_LINKED,
        );
        assert.equal(denied, true);

        const args = capturedArgs as { data: { type: string; actorUserId: number; targetUserId: number; metadata: { reason: string } } };
        assert.equal(args.data.type, AuthSecurityEventType.TELEGRAM_LINKED);
        assert.equal(args.data.actorUserId, 9);
        assert.equal(args.data.targetUserId, 9);
        assert.equal(args.data.metadata.reason, 'ROLE_NOT_ALLOWED');
    } finally {
        restore();
    }
});
