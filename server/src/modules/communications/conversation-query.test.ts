import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildConversationWhere, parseConversationQuery } from './conversation-query';

const providerConnectionId = 'a3e8ba12-c88d-4c0f-9797-277fc9fe03ce';

test('conversation query filters one email account and searches message content', () => {
    const query = parseConversationQuery({
        providerConnectionId,
        q: '  tickets  ',
    });

    assert.deepEqual(buildConversationWhere(query), {
        messages: { some: { providerConnectionId } },
        AND: [{
            OR: [
                { subject: { contains: 'tickets', mode: 'insensitive' } },
                { person: { is: { OR: [
                    { displayName: { contains: 'tickets', mode: 'insensitive' } },
                    { email: { contains: 'tickets', mode: 'insensitive' } },
                ] } } },
                { messages: { some: { bodyText: { contains: 'tickets', mode: 'insensitive' } } } },
            ],
        }],
    });
});

test('conversation query rejects an invalid provider connection id', () => {
    assert.throws(() => parseConversationQuery({ providerConnectionId: 'not-a-uuid' }));
});

test('conversation query lists the correspondence of one person', () => {
    const personId = 'b7c3a1de-5a44-4f0e-8a51-0c1c1f2f3a4b';
    assert.deepEqual(buildConversationWhere(parseConversationQuery({ personId })), { personId });
    assert.throws(() => parseConversationQuery({ personId: 'someone' }));
});
