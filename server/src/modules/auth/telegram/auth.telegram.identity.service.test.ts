import test from 'node:test';
import assert from 'node:assert/strict';
import { Prisma } from '@prisma/client';
import prisma from '../../../../prisma/prisma-client';
import {
    findTelegramIdentityByUserId,
    linkTelegramIdentity,
    unlinkTelegramIdentity,
} from './auth.telegram.identity.service';

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

const identityInput = {
    userId: 7,
    providerUserId: '123456789',
    username: 'ada',
    displayName: 'Ada Lovelace',
};

test('linkTelegramIdentity refuses a second Telegram identity for the same user without touching create', async () => {
    let createCalled = false;
    const restoreFind = stub(prisma.authIdentity as unknown as Record<string, unknown>, 'findFirst', async () => ({ id: 1, userId: 7 }));
    const restoreCreate = stub(prisma.authIdentity as unknown as Record<string, unknown>, 'create', async () => {
        createCalled = true;
        return {};
    });
    try {
        const result = await linkTelegramIdentity(identityInput);
        assert.deepEqual(result, { ok: false, reason: 'USER_ALREADY_LINKED' });
        assert.equal(createCalled, false);
    } finally {
        restoreFind();
        restoreCreate();
    }
});

test('linkTelegramIdentity maps a unique-constraint violation to IDENTITY_ALREADY_LINKED', async () => {
    const restoreFind = stub(prisma.authIdentity as unknown as Record<string, unknown>, 'findFirst', async () => null);
    const restoreCreate = stub(prisma.authIdentity as unknown as Record<string, unknown>, 'create', async () => {
        throw new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
            code: 'P2002',
            clientVersion: 'test',
        });
    });
    try {
        const result = await linkTelegramIdentity(identityInput);
        assert.deepEqual(result, { ok: false, reason: 'IDENTITY_ALREADY_LINKED' });
    } finally {
        restoreFind();
        restoreCreate();
    }
});

test('linkTelegramIdentity persists provider=TELEGRAM with the caller-bound userId, not a client-supplied one', async () => {
    let createArgs: unknown;
    const created = { id: 5, ...identityInput, provider: 'TELEGRAM' };
    const restoreFind = stub(prisma.authIdentity as unknown as Record<string, unknown>, 'findFirst', async () => null);
    const restoreCreate = stub(prisma.authIdentity as unknown as Record<string, unknown>, 'create', async (args: unknown) => {
        createArgs = args;
        return created;
    });
    try {
        const result = await linkTelegramIdentity(identityInput);
        assert.deepEqual(result, { ok: true, identity: created });

        const args = createArgs as { data: { userId: number; provider: string; providerUserId: string } };
        assert.equal(args.data.userId, 7);
        assert.equal(args.data.provider, 'TELEGRAM');
        assert.equal(args.data.providerUserId, '123456789');
    } finally {
        restoreFind();
        restoreCreate();
    }
});

test('linkTelegramIdentity rethrows an unrelated database error', async () => {
    const restoreFind = stub(prisma.authIdentity as unknown as Record<string, unknown>, 'findFirst', async () => null);
    const restoreCreate = stub(prisma.authIdentity as unknown as Record<string, unknown>, 'create', async () => {
        throw new Error('connection lost');
    });
    try {
        await assert.rejects(() => linkTelegramIdentity(identityInput), /connection lost/);
    } finally {
        restoreFind();
        restoreCreate();
    }
});

test('findTelegramIdentityByUserId scopes the lookup to provider=TELEGRAM', async () => {
    let capturedArgs: unknown;
    const restoreFind = stub(prisma.authIdentity as unknown as Record<string, unknown>, 'findFirst', async (args: unknown) => {
        capturedArgs = args;
        return null;
    });
    try {
        await findTelegramIdentityByUserId(7);
        const args = capturedArgs as { where: { userId: number; provider: string } };
        assert.equal(args.where.userId, 7);
        assert.equal(args.where.provider, 'TELEGRAM');
    } finally {
        restoreFind();
    }
});

test('unlinkTelegramIdentity scopes deletion to the caller\'s own row and reports whether anything was removed', async () => {
    let capturedArgs: unknown;
    const restoreDelete = stub(prisma.authIdentity as unknown as Record<string, unknown>, 'deleteMany', async (args: unknown) => {
        capturedArgs = args;
        return { count: 1 };
    });
    try {
        const removed = await unlinkTelegramIdentity(7);
        assert.equal(removed, true);
        const args = capturedArgs as { where: { userId: number; provider: string } };
        assert.equal(args.where.userId, 7);
        assert.equal(args.where.provider, 'TELEGRAM');
    } finally {
        restoreDelete();
    }
});

test('unlinkTelegramIdentity returns false when there was nothing to remove', async () => {
    const restoreDelete = stub(prisma.authIdentity as unknown as Record<string, unknown>, 'deleteMany', async () => ({ count: 0 }));
    try {
        assert.equal(await unlinkTelegramIdentity(999), false);
    } finally {
        restoreDelete();
    }
});
