import test from 'node:test';
import assert from 'node:assert/strict';
import { Prisma } from '@prisma/client';
import prisma from '../../../../prisma/prisma-client';
import { findMiniAppIdentityByTelegramUserId, linkMiniAppIdentity } from './telegram-miniapp-identity.service';

function stub(t: test.TestContext, delegate: object, method: string, impl: (...args: any[]) => unknown) {
    const target = delegate as Record<string, unknown>;
    const original = target[method];
    target[method] = impl;
    t.after(() => { target[method] = original; });
}
const input = { userId: 7, telegramUserId: '123456789' };
const transaction = (t: test.TestContext) => {
    stub(t, prisma, '$transaction', async (fn) => fn(prisma));
    stub(t, prisma, '$queryRaw', async () => [{ id: 7 }]);
};
test('links a numeric Telegram identity independently of an existing OIDC identity', async (t) => {
    transaction(t);
    stub(t, prisma.authIdentity, 'findFirst', async (args) => args.where.provider === 'TELEGRAM' ? { id: 1 } : null);
    let saved: any;
    stub(t, prisma.authIdentity, 'create', async ({ data }) => { saved = data; return data; });
    stub(t, prisma.authIdentity, 'findUnique', async ({ where }) => where.provider_providerUserId.provider === saved.provider ? { ...saved, user: { id: 7 } } : null);
    assert.deepEqual(await linkMiniAppIdentity(input), { ok: true });
    assert.equal(saved.provider, 'TELEGRAM_MINIAPP');
    assert.equal((await findMiniAppIdentityByTelegramUserId(input.telegramUserId))?.user.id, 7);
});
test('returns null for an unlinked identity', async (t) => {
    stub(t, prisma.authIdentity, 'findUnique', async () => null);
    assert.equal(await findMiniAppIdentityByTelegramUserId('987654321'), null);
});
test('rejects a second Mini App identity for the same user', async (t) => {
    transaction(t);
    stub(t, prisma.authIdentity, 'findFirst', async () => ({ id: 1 }));
    stub(t, prisma.authIdentity, 'create', async () => assert.fail('must not create'));
    assert.deepEqual(await linkMiniAppIdentity(input), { ok: false, reason: 'USER_ALREADY_LINKED' });
});
test('reports a Telegram identity already linked to another user', async (t) => {
    transaction(t);
    stub(t, prisma.authIdentity, 'findFirst', async () => null);
    stub(t, prisma.authIdentity, 'create', async () => { throw new Prisma.PrismaClientKnownRequestError('unique', { code: 'P2002', clientVersion: 'test' }); });
    assert.deepEqual(await linkMiniAppIdentity(input), { ok: false, reason: 'IDENTITY_ALREADY_LINKED' });
});
test('propagates database outages', async (t) => {
    transaction(t);
    stub(t, prisma.authIdentity, 'findFirst', async () => { throw new Error('offline'); });
    await assert.rejects(linkMiniAppIdentity(input), /offline/);
});
