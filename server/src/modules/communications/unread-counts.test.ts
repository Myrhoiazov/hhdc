import { test } from 'node:test';
import assert from 'node:assert/strict';
import { countByMailbox } from './unread-counts';
import { replyMailboxId } from './send';

test('unread conversations are counted per mailbox, each conversation once', () => {
    assert.deepEqual(countByMailbox([
        { providerConnectionId: 'info', conversationId: 'c1' },
        { providerConnectionId: 'info', conversationId: 'c1' },
        { providerConnectionId: 'info', conversationId: 'c2' },
        { providerConnectionId: 'gmail', conversationId: 'c3' },
        { providerConnectionId: null, conversationId: 'c4' },
    ]), { info: 2, gmail: 1 });
    assert.deepEqual(countByMailbox([]), {});
});

test('a reply leaves from the mailbox the letter came to, not from the one that was asked for', () => {
    assert.equal(replyMailboxId('info', 'gmail'), 'info');
    assert.equal(replyMailboxId(null, 'gmail'), 'gmail');
});
