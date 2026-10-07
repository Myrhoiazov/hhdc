import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GmailEmailProvider, buildRawEmail, buildRawEmailWithAttachments } from './index';

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

test('Gmail moves an entire thread to spam', async () => {
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    const provider = new GmailEmailProvider({ accessToken: 'test' }, async (input, init) => {
        requests.push({ url: String(input), init });
        return new Response(null, { status: 204 });
    });

    await provider.applyDisposition([{ externalId: 'message-1', threadId: 'thread-7' }], 'SPAM');

    assert.equal(requests[0].url, 'https://gmail.googleapis.com/gmail/v1/users/me/threads/thread-7/modify');
    assert.equal(requests[0].init?.method, 'POST');
    assert.deepEqual(JSON.parse(String(requests[0].init?.body)), { addLabelIds: ['SPAM'], removeLabelIds: ['INBOX'] });
});

test('Gmail moves an entire thread to trash', async () => {
    const requests: string[] = [];
    const provider = new GmailEmailProvider({ accessToken: 'test' }, async (input) => {
        requests.push(String(input));
        return new Response(null, { status: 204 });
    });

    await provider.applyDisposition([{ externalId: 'message-1', threadId: 'thread/7' }], 'TRASH');

    assert.equal(requests[0], 'https://gmail.googleapis.com/gmail/v1/users/me/threads/thread%2F7/trash');
});

test('Gmail marks a message as read by dropping the UNREAD label', async () => {
    const requests: Array<{ url: string; body?: unknown }> = [];
    const provider = new GmailEmailProvider({ accessToken: 'test' }, async (input, init) => {
        requests.push({ url: String(input), body: init?.body ? JSON.parse(String(init.body)) : undefined });
        return new Response(null, { status: 204 });
    });

    await provider.markRead([{ externalId: 'message-1' }, { externalId: 'message-2' }]);

    assert.deepEqual(requests.map(request => request.url), [
        'https://gmail.googleapis.com/gmail/v1/users/me/messages/message-1/modify',
        'https://gmail.googleapis.com/gmail/v1/users/me/messages/message-2/modify',
    ]);
    assert.deepEqual(requests[0].body, { removeLabelIds: ['UNREAD'] });
});

const inboxListing = Response.json({ messages: [{ id: 'read-one' }, { id: 'unread-one' }] });
const rawMessage = (id: string, labels: string[]) => Response.json({
    id, threadId: 'thread-7', labelIds: labels, internalDate: '1759790000000',
    raw: buildRawEmail({ sender: 'anna@example.test', recipient: 'info@hhdc.test', subject: 'Camp', content: 'Hello' }),
});

test('sync reads the Gmail UNREAD label so the CRM shows the same read state as the mailbox', async () => {
    const provider = new GmailEmailProvider({ accessToken: 'test' }, async (input) => {
        const url = String(input);
        if (url.includes('messages?')) return inboxListing;
        return url.includes('messages/unread-one')
            ? rawMessage('unread-one', ['INBOX', 'UNREAD'])
            : rawMessage('read-one', ['INBOX']);
    });

    const page = await provider.syncMessages();

    assert.deepEqual(page.messages.map(message => [message.externalId, message.isRead]), [
        ['read-one', true], ['unread-one', false],
    ]);
});

test('incremental sync follows every Gmail result page so older messages are not lost', async () => {
    let listings = 0;
    const provider = new GmailEmailProvider({ accessToken: 'test' }, async (input) => {
        const url = new URL(String(input));
        if (url.pathname.endsWith('/messages')) {
            listings += 1;
            const page = Number(url.searchParams.get('pageToken') ?? '0');
            return Response.json({
                messages: [{ id: `message-${page}` }],
                ...(page < 10 ? { nextPageToken: String(page + 1) } : {}),
            });
        }
        return rawMessage(url.pathname.split('/').at(-1) ?? '', ['INBOX']);
    });

    const page = await provider.syncMessages('1750000000');

    assert.equal(listings, 11);
    assert.equal(page.messages.length, 11);
});

test('a Gmail letter with a file is a multipart message that carries the file', async () => {
    const letter = { sender: 'staff@example.test', recipient: 'person@example.test', subject: 'Price list', content: 'See attached' };
    const raw = await buildRawEmailWithAttachments({ ...letter, attachments: [{ filename: 'price.txt', contentType: 'text/plain', content: Buffer.from('100 EUR') }] });
    const mime = Buffer.from(raw, 'base64url').toString();

    assert.match(mime, /Content-Type: multipart\/mixed/);
    assert.match(mime, /filename="?price\.txt"?/);
    assert.match(mime, new RegExp(Buffer.from('100 EUR').toString('base64')));
    await assert.rejects(buildRawEmailWithAttachments({ ...letter, subject: 'x\r\nBcc: y@example.test', attachments: [] }), /Invalid email header/);
});
