import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GmailEmailProvider, buildRawEmail } from './index';

test('Gmail failure does not report a sent message', async () => {
    const provider = new GmailEmailProvider({ accessToken: 'test' }, async () => new Response('', { status: 503 }));
    await assert.rejects(provider.sendMessage({ sender: 'staff@example.test', recipient: 'person@example.test', subject: 'Event', content: 'Hello' }), /503/);
});

test('email headers reject injected recipients', () => {
    assert.throws(() => buildRawEmail({ sender: 'staff@example.test', recipient: 'person@example.test\r\nBcc: hidden@example.test', subject: 'Event', content: 'Hello' }), /Invalid email header/);
});

test('Gmail success returns provider identity rather than an invented local ID', async () => {
    const provider = new GmailEmailProvider({ accessToken: 'test' }, async () => Response.json({ id: 'external-42', threadId: 'thread-7' }));
    assert.deepEqual(await provider.sendMessage({ sender: 'staff@example.test', recipient: 'person@example.test', subject: 'Event', content: 'Hello' }), { externalId: 'external-42', threadId: 'thread-7' });
});
