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
