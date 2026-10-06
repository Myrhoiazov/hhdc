import test from 'node:test';
import assert from 'node:assert/strict';
import prisma from '../../../../prisma/prisma-client';
import {
    consumeTelegramAuthTransaction,
    createTelegramAuthTransaction,
    hashTelegramNonce,
    verifyTelegramNonce,
} from './auth.telegram.transaction.service';

process.env.JWT_ACCESS_SECRET ||= 'test-access-secret';
process.env.JWT_REFRESH_SECRET ||= 'test-refresh-secret';

// Same stubbing approach as comments.service.test.ts: Prisma model delegates
// are lazy proxies, so the delegate method is replaced directly rather than
// via t.mock.method. No real DB connection is made — the stub owns the query.
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

test('hashTelegramNonce does not expose the raw nonce and is deterministic', () => {
    const nonce = 'a-random-nonce';
    const hash = hashTelegramNonce(nonce);

    assert.notEqual(hash, nonce);
    assert.equal(hashTelegramNonce(nonce), hash);
    assert.notEqual(hashTelegramNonce('a-different-nonce'), hash);
});

test('verifyTelegramNonce accepts the matching nonce and rejects everything else', () => {
    const nonce = 'expected-nonce';
    const nonceHash = hashTelegramNonce(nonce);

    assert.equal(verifyTelegramNonce(nonce, nonceHash), true);
    assert.equal(verifyTelegramNonce('wrong-nonce', nonceHash), false);
    assert.equal(verifyTelegramNonce(undefined, nonceHash), false);
});

test('createTelegramAuthTransaction sweeps this user\'s stale rows and persists flow=LINK bound to the caller', async () => {
    let deleteArgs: unknown;
    let createArgs: unknown;
    const restoreDelete = stub(prisma.telegramAuthTransaction as unknown as Record<string, unknown>, 'deleteMany', async (args: unknown) => {
        deleteArgs = args;
        return { count: 0 };
    });
    const restoreCreate = stub(prisma.telegramAuthTransaction as unknown as Record<string, unknown>, 'create', async (args: unknown) => {
        createArgs = args;
        return {};
    });
    try {
        const result = await createTelegramAuthTransaction({ flow: 'LINK', userId: 7 });

        assert.match(result.state, /^[A-Za-z0-9_-]+$/);
        assert.match(result.nonce, /^[A-Za-z0-9_-]+$/);
        assert.ok(result.codeChallenge);
        assert.ok(result.expiresAt instanceof Date);

        const del = deleteArgs as { where: { OR: Array<{ userId?: number }> } };
        assert.ok(del.where.OR.some((clause) => clause.userId === 7));

        const create = createArgs as { data: { state: string; flow: string; userId: number | null; nonceHash: string } };
        assert.equal(create.data.state, result.state);
        assert.equal(create.data.flow, 'LINK');
        assert.equal(create.data.userId, 7);
        assert.equal(create.data.nonceHash, hashTelegramNonce(result.nonce));
    } finally {
        restoreDelete();
        restoreCreate();
    }
});

test('createTelegramAuthTransaction leaves userId null for flow=LOGIN', async () => {
    let createArgs: unknown;
    const restoreDelete = stub(prisma.telegramAuthTransaction as unknown as Record<string, unknown>, 'deleteMany', async () => ({ count: 0 }));
    const restoreCreate = stub(prisma.telegramAuthTransaction as unknown as Record<string, unknown>, 'create', async (args: unknown) => {
        createArgs = args;
        return {};
    });
    try {
        await createTelegramAuthTransaction({ flow: 'LOGIN' });
        const create = createArgs as { data: { userId: number | null } };
        assert.equal(create.data.userId, null);
    } finally {
        restoreDelete();
        restoreCreate();
    }
});

test('consumeTelegramAuthTransaction rejects a missing or already-consumed state', async () => {
    const restoreFind = stub(prisma.telegramAuthTransaction as unknown as Record<string, unknown>, 'findUnique', async () => null);
    try {
        assert.deepEqual(await consumeTelegramAuthTransaction(undefined), { ok: false, reason: 'NOT_FOUND' });
        assert.deepEqual(await consumeTelegramAuthTransaction('unknown-state'), { ok: false, reason: 'NOT_FOUND' });
    } finally {
        restoreFind();
    }
});

test('consumeTelegramAuthTransaction rejects an expired transaction', async () => {
    const restoreFind = stub(prisma.telegramAuthTransaction as unknown as Record<string, unknown>, 'findUnique', async () => ({
        id: 1,
        consumedAt: null,
        expiresAt: new Date(Date.now() - 1000),
    }));
    try {
        assert.deepEqual(await consumeTelegramAuthTransaction('expired-state'), { ok: false, reason: 'EXPIRED' });
    } finally {
        restoreFind();
    }
});

test('consumeTelegramAuthTransaction marks the row consumed exactly once and returns its payload', async () => {
    let updateArgs: unknown;
    const restoreFind = stub(prisma.telegramAuthTransaction as unknown as Record<string, unknown>, 'findUnique', async () => ({
        id: 42,
        consumedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
        flow: 'LOGIN',
        userId: null,
        codeVerifier: 'verifier-value',
        nonceHash: 'nonce-hash-value',
    }));
    const restoreUpdate = stub(prisma.telegramAuthTransaction as unknown as Record<string, unknown>, 'updateMany', async (args: unknown) => {
        updateArgs = args;
        return { count: 1 };
    });
    try {
        const result = await consumeTelegramAuthTransaction('valid-state');

        assert.deepEqual(result, {
            ok: true,
            flow: 'LOGIN',
            userId: null,
            codeVerifier: 'verifier-value',
            nonceHash: 'nonce-hash-value',
        });
        const update = updateArgs as { where: { id: number; consumedAt: null } };
        assert.equal(update.where.id, 42);
        assert.equal(update.where.consumedAt, null);
    } finally {
        restoreFind();
        restoreUpdate();
    }
});

test('consumeTelegramAuthTransaction loses a concurrent race when updateMany affects zero rows', async () => {
    const restoreFind = stub(prisma.telegramAuthTransaction as unknown as Record<string, unknown>, 'findUnique', async () => ({
        id: 42,
        consumedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
        flow: 'LOGIN',
        userId: null,
        codeVerifier: 'verifier-value',
        nonceHash: 'nonce-hash-value',
    }));
    const restoreUpdate = stub(prisma.telegramAuthTransaction as unknown as Record<string, unknown>, 'updateMany', async () => ({ count: 0 }));
    try {
        assert.deepEqual(await consumeTelegramAuthTransaction('raced-state'), { ok: false, reason: 'NOT_FOUND' });
    } finally {
        restoreFind();
        restoreUpdate();
    }
});
