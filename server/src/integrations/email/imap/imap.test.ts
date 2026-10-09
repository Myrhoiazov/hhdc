import { test } from 'node:test';
import assert from 'node:assert/strict';
import { imapClient, imapConfigSchema, ImapEmailProvider, type ImapMarkReadRequest, type ImapMoveRequest, type ImapTransports, type MailboxSnapshot, type OutgoingMail } from './index';
import { normalizeImapMessage, parseImapCursor, rangeHasMessages, rangeToFetch, type ImapFetchRange } from './normalize';

const config = {
    credentials: { username: 'info@hhdc.test', password: 'app-password' },
    settings: { imapHost: 'imap.hhdc.test', smtpHost: 'smtp.hhdc.test' },
};

const raw = (headers: string[], body = 'Hello') => Buffer.from(`${headers.join('\r\n')}\r\n\r\n${body}`);
const inbound = (uid: number, headers: string[]) => ({ uid, uidValidity: '7', source: raw(headers) });

const fakeTransports = (snapshot: MailboxSnapshot, sent: OutgoingMail[] = [], moved: ImapMoveRequest[] = [], marked: ImapMarkReadRequest[] = []): ImapTransports & { starts: ImapFetchRange[] } => {
    const starts: ImapFetchRange[] = [];
    return {
        starts,
        verify: async () => undefined,
        readInbox: async (_config, selectRange) => { starts.push(selectRange(snapshot)); return snapshot; },
        send: async (_config, mail) => { sent.push(mail); return { messageId: '<sent-1@smtp.hhdc.test>' }; },
        move: async (_config, request) => { moved.push(request); },
        markRead: async (_config, request) => { marked.push(request); },
    };
};

test('a contact-form message is attributed to its Reply-To visitor', async () => {
    const email = await normalizeImapMessage(inbound(4, ['From: Site <wordpress@hhdc.test>', 'Reply-To: Anna <Anna@Example.test>', 'To: info@hhdc.test', 'Subject: Camp', 'Message-ID: <m4@site>']), 'info@hhdc.test');
    assert.equal(email?.sender, 'wordpress@hhdc.test');
    assert.equal(email?.replyTo, 'anna@example.test');
    assert.equal(email?.externalId, '<m4@site>');
    assert.equal(email?.providerRef, '7:4');
});

test('IMAP moves messages using UID references and Message-ID fallbacks', async () => {
    const moved: ImapMoveRequest[] = [];
    const provider = new ImapEmailProvider(config, fakeTransports({ uidValidity: '7', uidNext: 1, exists: 0, messages: [] }, [], moved));

    await provider.applyDisposition([
        { externalId: '<new@site>', providerRef: '7:12' },
        { externalId: '<legacy@site>' },
    ], 'TRASH');

    assert.deepEqual(moved, [{ disposition: 'TRASH', messages: [
        { externalId: '<new@site>', providerRef: '7:12' },
        { externalId: '<legacy@site>' },
    ] }]);
});

test('a reply joins the thread named by the root of its References chain', async () => {
    const email = await normalizeImapMessage(inbound(9, ['From: anna@example.test', 'To: info@hhdc.test', 'Subject: Re: Camp', 'Message-ID: <m9@x>', 'In-Reply-To: <ours@hhdc>', 'References: <m4@site> <ours@hhdc>']), 'info@hhdc.test');
    assert.equal(email?.threadId, '<m4@site>');
});

test('a message without a sender is skipped and one without Message-ID keeps a UID identity', async () => {
    assert.equal(await normalizeImapMessage(inbound(1, ['Subject: orphan']), 'info@hhdc.test'), null);
    const email = await normalizeImapMessage(inbound(2, ['From: a@example.test', 'Subject: x']), 'info@hhdc.test');
    assert.equal(email?.externalId, 'imap:7:2');
    assert.equal(email?.recipient, 'info@hhdc.test');
});

test('the first sync takes the newest messages by position; later syncs continue after the cursor', () => {
    // UIDs run up to 1305 but the mailbox only holds 340 messages: a UID window would miss most of them.
    const mailbox = { uidValidity: '7', uidNext: 1306, exists: 340 };
    assert.deepEqual(rangeToFetch(undefined, mailbox, 200), { from: 141, byUid: false });
    assert.deepEqual(rangeToFetch(parseImapCursor('v2:7:950'), mailbox, 200), { from: 951, byUid: true });
    assert.deepEqual(rangeToFetch(parseImapCursor('v2:6:950'), mailbox, 200), { from: 141, byUid: false });
    assert.deepEqual(rangeToFetch(undefined, { uidValidity: '7', uidNext: 5, exists: 3 }, 200), { from: 1, byUid: false });
});

test('a cursor from before the positional window is ignored so the history is imported again', () => {
    assert.equal(parseImapCursor('7:1306'), undefined);
    assert.deepEqual(parseImapCursor('v2:7:1306'), { uidValidity: '7', lastUid: 1306 });
});

test('nothing is fetched from an empty mailbox or when no UID follows the cursor', () => {
    assert.equal(rangeHasMessages({ from: 1, byUid: false }, { uidValidity: '7', uidNext: 1, exists: 0 }), false);
    assert.equal(rangeHasMessages({ from: 1, byUid: false }, { uidValidity: '7', uidNext: 9, exists: 3 }), true);
    assert.equal(rangeHasMessages({ from: 13, byUid: true }, { uidValidity: '7', uidNext: 13, exists: 3 }), false);
    assert.equal(rangeHasMessages({ from: 12, byUid: true }, { uidValidity: '7', uidNext: 13, exists: 3 }), true);
});

test('sync returns normalized mail, counts unparseable messages and advances the cursor', async () => {
    const transports = fakeTransports({ uidValidity: '7', uidNext: 13, exists: 2, messages: [
        inbound(11, ['From: a@example.test', 'To: info@hhdc.test', 'Subject: One', 'Message-ID: <a@x>']),
        inbound(12, ['Subject: no sender']),
    ] });
    const page = await new ImapEmailProvider(config, transports).syncMessages('v2:7:10');
    assert.deepEqual(transports.starts, [{ from: 11, byUid: true }]);
    assert.deepEqual(page.messages.map(message => message.subject), ['One']);
    assert.equal(page.skipped, 1);
    assert.equal(page.cursor, 'v2:7:12');
});

test('an empty mailbox poll keeps the cursor from moving backwards', async () => {
    const page = await new ImapEmailProvider(config, fakeTransports({ uidValidity: '7', uidNext: 5, exists: 0, messages: [] })).syncMessages('v2:7:10');
    assert.equal(page.cursor, 'v2:7:10');
});

test('sending threads the reply and returns the SMTP message id', async () => {
    const sent: OutgoingMail[] = [];
    const provider = new ImapEmailProvider(config, fakeTransports({ uidValidity: '7', uidNext: 1, exists: 0, messages: [] }, sent));
    const result = await provider.sendMessage({ sender: 'info@hhdc.test', recipient: 'anna@example.test', subject: 'Re: Camp', content: 'Hi', replyToMessageId: '<m4@site>', threadId: '<m4@site>' });
    assert.deepEqual(result, { externalId: '<sent-1@smtp.hhdc.test>', threadId: '<m4@site>' });
    assert.equal(sent[0].inReplyTo, '<m4@site>');
    await assert.rejects(provider.sendMessage({ sender: 'info@hhdc.test', recipient: 'a@example.test\r\nBcc: x@example.test', subject: 's', content: 'c' }), /Invalid email header/);
});

test('incomplete mailbox settings are rejected before any connection is attempted', () => {
    assert.throws(() => new ImapEmailProvider({ credentials: { username: 'u', password: '' }, settings: {} }));
});

test('a message the mailbox already carries as \Seen arrives as read, the rest as unread', async () => {
    const seen = await normalizeImapMessage({ ...inbound(5, ['From: a@example.test', 'To: info@hhdc.test', 'Subject: Seen', 'Message-ID: <s@x>']), flags: ['\\Seen'] }, 'info@hhdc.test');
    assert.equal(seen?.isRead, true);
    const fresh = await normalizeImapMessage(inbound(6, ['From: a@example.test', 'To: info@hhdc.test', 'Subject: Fresh', 'Message-ID: <f@x>']), 'info@hhdc.test');
    assert.equal(fresh?.isRead, false);
});

test('reading a conversation flags the stored mailbox messages as \Seen', async () => {
    const marked: ImapMarkReadRequest[] = [];
    const provider = new ImapEmailProvider(config, fakeTransports({ uidValidity: '7', uidNext: 1, exists: 0, messages: [] }, [], [], marked));

    await provider.markRead([{ externalId: '<new@site>', providerRef: '7:12' }, { externalId: '<legacy@site>' }]);

    assert.deepEqual(marked, [{ messages: [{ externalId: '<new@site>', providerRef: '7:12' }, { externalId: '<legacy@site>' }] }]);
});

test('sync carries the read flag of every message', async () => {
    const page = await new ImapEmailProvider(config, fakeTransports({ uidValidity: '7', uidNext: 14, exists: 1, messages: [
        { ...inbound(13, ['From: a@example.test', 'To: info@hhdc.test', 'Subject: Read', 'Message-ID: <r@x>']), flags: ['\\Seen', '\\Answered'] },
    ] })).syncMessages('v2:7:12');
    assert.deepEqual(page.messages.map(message => message.isRead), [true]);
});

test('a socket error on a mailbox connection does not become an uncaught exception', () => {
    const client = imapClient(imapConfigSchema.parse(config));
    assert.doesNotThrow(() => client.emit('error', new Error('Socket timeout')));
});
