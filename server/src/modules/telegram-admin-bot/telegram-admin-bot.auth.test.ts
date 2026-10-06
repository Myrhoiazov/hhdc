import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveTelegramAdmin } from './telegram-admin-bot.auth';

const identityWithUser = (user: Record<string, unknown> | null) => (async () => (
    user ? { id: 1, userId: 1, provider: 'TELEGRAM', providerUserId: '1', user } : null
)) as never;

test('returns null when no CRM user is linked to this Telegram id', async () => {
    const result = await resolveTelegramAdmin('999', identityWithUser(null));
    assert.equal(result, null);
});

test('returns null when the linked user is disabled', async () => {
    const result = await resolveTelegramAdmin('1', identityWithUser({
        id: 5, email: 'a@b.com', firstName: 'A', lastName: 'B', role: 'ADMIN', isEnabled: false,
    }));
    assert.equal(result, null);
});

test('returns null when the linked user is not ADMIN', async () => {
    const result = await resolveTelegramAdmin('1', identityWithUser({
        id: 5, email: 'a@b.com', firstName: 'A', lastName: 'B', role: 'MANAGER', isEnabled: true,
    }));
    assert.equal(result, null);
});

test('resolves an enabled ADMIN user', async () => {
    const result = await resolveTelegramAdmin('1', identityWithUser({
        id: 5, email: 'admin@ddc.nl', firstName: 'Anna', lastName: 'K', role: 'ADMIN', isEnabled: true,
    }));
    assert.deepEqual(result, { userId: 5, email: 'admin@ddc.nl', firstName: 'Anna', lastName: 'K' });
});
