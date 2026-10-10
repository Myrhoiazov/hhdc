import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ApiError } from '../../common/http';
import { applyBulkDisposition, bulkDispositionSchema, MAX_BULK_CONVERSATIONS } from './bulk-disposition';

const ID_A = '11111111-1111-4111-8111-111111111111';
const ID_B = '22222222-2222-4222-8222-222222222222';
const ID_C = '33333333-3333-4333-8333-333333333333';

test('every selected conversation receives the disposition on behalf of the acting user', async () => {
    const calls: string[] = [];

    const result = await applyBulkDisposition({ ids: [ID_A, ID_B], disposition: 'SPAM' }, 'user-1',
        async (id, disposition, actorUserId) => { calls.push(`${id}:${disposition}:${actorUserId}`); });

    assert.deepEqual(calls, [`${ID_A}:SPAM:user-1`, `${ID_B}:SPAM:user-1`]);
    assert.deepEqual(result, { applied: [ID_A, ID_B], failed: [] });
});

test('a conversation the mailbox refused is reported and the rest are still processed', async () => {
    const result = await applyBulkDisposition({ ids: [ID_A, ID_B, ID_C], disposition: 'TRASH' }, 'user-1', async (id) => {
        if (id === ID_B) throw new ApiError(502, 'REMOTE_MAILBOX_UPDATE_FAILED', 'Mailbox provider did not confirm the action');
    });

    assert.deepEqual(result, { applied: [ID_A, ID_C], failed: [{ id: ID_B, code: 'REMOTE_MAILBOX_UPDATE_FAILED' }] });
});

test('an unexpected failure is reported without its internal message', async () => {
    const result = await applyBulkDisposition({ ids: [ID_A], disposition: 'TRASH' }, 'user-1',
        async () => { throw new Error('connection string leaked here'); });

    assert.deepEqual(result, { applied: [], failed: [{ id: ID_A, code: 'DISPOSITION_FAILED' }] });
});

test('a conversation selected twice is processed once', async () => {
    const calls: string[] = [];

    const result = await applyBulkDisposition({ ids: [ID_A, ID_A], disposition: 'TRASH' }, 'user-1', async (id) => { calls.push(id); });

    assert.deepEqual(calls, [ID_A]);
    assert.deepEqual(result.applied, [ID_A]);
});

test('the request is refused without conversations, above the limit, or with an unknown action', () => {
    const tooMany = Array.from({ length: MAX_BULK_CONVERSATIONS + 1 }, () => ID_A);

    assert.equal(bulkDispositionSchema.safeParse({ ids: [], disposition: 'TRASH' }).success, false);
    assert.equal(bulkDispositionSchema.safeParse({ ids: tooMany, disposition: 'TRASH' }).success, false);
    assert.equal(bulkDispositionSchema.safeParse({ ids: ['not-a-uuid'], disposition: 'TRASH' }).success, false);
    assert.equal(bulkDispositionSchema.safeParse({ ids: [ID_A], disposition: 'ARCHIVE' }).success, false);
    assert.equal(bulkDispositionSchema.safeParse({ ids: [ID_A], disposition: 'SPAM' }).success, true);
});
