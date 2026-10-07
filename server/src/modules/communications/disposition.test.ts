import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyConversationDisposition, type ConversationDispositionDeps } from './disposition';

const conversation = {
    id: 'conversation-1',
    messages: [
        { direction: 'INBOUND', providerConnectionId: 'provider-1', externalId: 'message-1', rawData: { threadId: 'thread-1', providerRef: '7:12' } },
        { direction: 'OUTBOUND', providerConnectionId: 'provider-1', externalId: 'sent-1', rawData: null },
    ],
};

test('conversation is removed locally only after the mailbox provider confirms the action', async () => {
    const calls: string[] = [];
    const deps: ConversationDispositionDeps = {
        loadConversation: async () => conversation,
        applyRemote: async (_providerId, refs, disposition) => {
            calls.push(`remote:${disposition}`);
            assert.deepEqual(refs, [{ externalId: 'message-1', threadId: 'thread-1', providerRef: '7:12' }]);
        },
        removeLocal: async () => { calls.push('local'); },
    };

    await applyConversationDisposition('conversation-1', 'TRASH', 'user-1', deps);

    assert.deepEqual(calls, ['remote:TRASH', 'local']);
});

test('provider failure keeps the local conversation intact', async () => {
    let removed = false;
    const deps: ConversationDispositionDeps = {
        loadConversation: async () => conversation,
        applyRemote: async () => { throw new Error('mailbox unavailable'); },
        removeLocal: async () => { removed = true; },
    };

    await assert.rejects(applyConversationDisposition('conversation-1', 'SPAM', 'user-1', deps), /mailbox unavailable/);
    assert.equal(removed, false);
});

test('partial remote deletion never removes the local conversation', async () => {
    const providers: string[] = [];
    let removed = false;
    const deps: ConversationDispositionDeps = {
        loadConversation: async () => ({
            id: conversation.id,
            messages: [
                conversation.messages[0],
                { direction: 'INBOUND', providerConnectionId: 'provider-2', externalId: 'message-2', rawData: { threadId: 'thread-2' } },
            ],
        }),
        applyRemote: async (providerId) => {
            providers.push(providerId);
            if (providerId === 'provider-2') throw new Error('second mailbox unavailable');
        },
        removeLocal: async () => { removed = true; },
    };

    await assert.rejects(applyConversationDisposition('conversation-1', 'TRASH', 'user-1', deps), /second mailbox unavailable/);

    assert.deepEqual(providers, ['provider-1', 'provider-2']);
    assert.equal(removed, false);
});

test('a conversation with only sent letters is removed locally without touching the mailbox', async () => {
    const calls: string[] = [];
    const deps: ConversationDispositionDeps = {
        loadConversation: async () => ({ id: 'conversation-2', messages: [conversation.messages[1]] }),
        applyRemote: async () => { calls.push('remote'); },
        removeLocal: async () => { calls.push('local'); },
    };

    await applyConversationDisposition('conversation-2', 'TRASH', 'user-1', deps);

    assert.deepEqual(calls, ['local']);
});
