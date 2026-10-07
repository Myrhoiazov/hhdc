import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { EmailSyncPage, NormalizedEmail } from '../../integrations/email/EmailProvider';
import { buildReplySubject } from './send';
import { cursorAfter, ingestPage, isNewSyncFailure } from './sync';

const email = (externalId: string): NormalizedEmail => ({ externalId, threadId: 't', sender: 'a@example.test', recipient: 'info@hhdc.test', subject: 's', bodyText: '', receivedAt: new Date(0) });

test('a page is tallied as created, already-known and failed without stopping at a failure', async () => {
    const outcomes: Record<string, () => Promise<{ created: boolean }>> = {
        new: async () => ({ created: true }),
        known: async () => ({ created: false }),
        broken: async () => { throw new Error('db down'); },
    };
    const summary = await ingestPage('p', { messages: [email('broken'), email('new'), email('known')], skipped: 2 }, (_id, message) => outcomes[message.externalId]());
    assert.deepEqual(summary, { created: 1, skipped: 3, failed: 1 });
});

test('the cursor advances only when every message of the page was stored', () => {
    const page: EmailSyncPage = { messages: [], cursor: '7:20' };
    assert.equal(cursorAfter('7:10', page, { created: 2, skipped: 0, failed: 0 }), '7:20');
    assert.equal(cursorAfter('7:10', page, { created: 1, skipped: 0, failed: 1 }), '7:10');
    assert.equal(cursorAfter('7:10', { messages: [] }, { created: 0, skipped: 0, failed: 0 }), '7:10');
});

test('reply subjects are not prefixed twice', () => {
    assert.equal(buildReplySubject('Camp'), 'Re: Camp');
    assert.equal(buildReplySubject('RE: Camp'), 'RE: Camp');
});

test('a mailbox that keeps failing is announced once, not on every retry', () => {
    assert.equal(isNewSyncFailure('CONNECTED'), true);
    assert.equal(isNewSyncFailure('ERROR'), false);
});
