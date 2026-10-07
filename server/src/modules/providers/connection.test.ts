import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canTestConnection, probeConnection, withDefaultSender } from './connection.service';

const mailbox = { type: 'EMAIL', provider: 'IMAP', credentials: { username: 'info@hhdc.test', password: 'x' }, settings: { imapHost: 'imap.hhdc.test' } };

test('a failing provider yields its reason instead of a stored connection', async () => {
    const testers = { EMAIL: async () => { throw new Error('Invalid credentials'); } };
    assert.equal(await probeConnection(mailbox, testers), 'Invalid credentials');
    assert.equal(await probeConnection(mailbox, { EMAIL: async () => ({ success: true }) }), null);
});

test('a mailbox sends from its login unless a sender was configured', () => {
    assert.equal(withDefaultSender(mailbox).sender, 'info@hhdc.test');
    assert.equal(withDefaultSender({ ...mailbox, settings: { sender: 'team@hhdc.test' } }).sender, 'team@hhdc.test');
    assert.equal(withDefaultSender({ ...mailbox, provider: 'GMAIL' }).sender, undefined);
    assert.equal(withDefaultSender({ ...mailbox, credentials: { username: 'not-an-address', password: 'x' } }).sender, undefined);
});

test('only providers with a verifiable adapter offer a connection test', () => {
    assert.equal(canTestConnection('EMAIL'), true);
    assert.equal(canTestConnection('STORAGE'), false);
});
