import { test } from 'node:test';
import assert from 'node:assert/strict';
import { markConversationRead, type ConversationReadDeps } from './read';

const unread = {
    id: 'message-1',
    direction: 'INBOUND',
    providerConnectionId: 'provider-1',
    externalId: '<m1@site>',
    rawData: { threadId: 'thread-1', providerRef: '7:12' },
};

const depsWith = (overrides: Partial<ConversationReadDeps> = {}): ConversationReadDeps => ({
    loadUnread: async () => ({ id: 'conversation-1', messages: [unread] }),
    markLocal: async () => 1,
    markRemote: async () => undefined,
    ...overrides,
});

test('opening a conversation reads its unread messages locally and tells the mailbox', async () => {
    const calls: string[] = [];
    const deps = depsWith({
        markLocal: async (conversationId, messageIds) => {
            calls.push(`local:${conversationId}:${messageIds.join(',')}`);
            return messageIds.length;
        },
        markRemote: async (providerId, messages) => {
            calls.push(`remote:${providerId}`);
            assert.deepEqual(messages, [{ externalId: '<m1@site>', threadId: 'thread-1', providerRef: '7:12' }]);
        },
    });

    const result = await markConversationRead('conversation-1', deps);

    assert.deepEqual(calls, ['local:conversation-1:message-1', 'remote:provider-1']);
    assert.equal(result.marked, 1);
});

test('a mailbox that rejects the flag does not stop the conversation from being read', async () => {
    const deps = depsWith({ markRemote: async () => { throw new Error('mailbox offline'); } });

    const result = await markConversationRead('conversation-1', deps);

    assert.equal(result.marked, 1);
});

test('an unknown conversation reports not found', async () => {
    const deps = depsWith({ loadUnread: async () => null });

    await assert.rejects(markConversationRead('missing', deps), /Conversation not found/);
});

test('an already read conversation asks nobody to do anything', async () => {
    let touched = false;
    const deps = depsWith({
        loadUnread: async () => ({ id: 'conversation-1', messages: [] }),
        markLocal: async () => { touched = true; return 0; },
        markRemote: async () => { touched = true; },
    });

    const result = await markConversationRead('conversation-1', deps);

    assert.deepEqual(result, { marked: 0 });
    assert.equal(touched, false);
});

test('only incoming mailbox messages are forwarded to the provider', async () => {
    let remoteCalls = 0;
    const deps = depsWith({
        loadUnread: async () => ({ id: 'conversation-1', messages: [
            { id: 'message-2', direction: 'OUTBOUND', providerConnectionId: 'provider-1', externalId: 'sent-1', rawData: null },
            { id: 'message-3', direction: 'INBOUND', providerConnectionId: null, externalId: null, rawData: null },
        ] }),
        markLocal: async () => 2,
        markRemote: async () => { remoteCalls += 1; },
    });

    await markConversationRead('conversation-1', deps);

    assert.equal(remoteCalls, 0);
});

