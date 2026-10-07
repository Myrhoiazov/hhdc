import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { SendEmailInput } from '../../integrations/email/EmailProvider';
import { composeEmail, composeSchema, type ComposeEmailDeps, type SentEmail } from './compose';

const input = { providerConnectionId: '2c81a8b8-1556-47af-96fd-0be50e6d8561', recipient: 'anna@example.test', subject: 'Camp details', content: 'Hello Anna' };

const fakeDeps = (send: (mail: SendEmailInput) => Promise<{ externalId: string; threadId?: string }>, recorded: SentEmail[] = []): ComposeEmailDeps => ({
    openMailbox: async () => ({ sender: 'info@hhdc.test', send }),
    record: async email => { recorded.push(email); return { id: 'conversation-1' }; },
    newMessageId: () => '<new-1@hhdc-crm.local>',
});

test('a new email is sent from the chosen mailbox and stored as a conversation', async () => {
    const sent: SendEmailInput[] = [];
    const recorded: SentEmail[] = [];
    const result = await composeEmail(input, 'user-1', { deps: fakeDeps(async mail => { sent.push(mail); return { externalId: '<smtp-1@hhdc.test>' }; }, recorded) });

    assert.deepEqual(result, { id: 'conversation-1' });
    assert.deepEqual(sent, [{ sender: 'info@hhdc.test', recipient: 'anna@example.test', subject: 'Camp details', content: 'Hello Anna', messageId: '<new-1@hhdc-crm.local>' }]);
    // Without a provider thread id the Message-ID names the thread, so the reply joins it.
    assert.deepEqual(recorded, [{ ...input, sender: 'info@hhdc.test', externalId: '<smtp-1@hhdc.test>', threadId: '<new-1@hhdc-crm.local>', attachments: [] }]);
});

test('the provider thread id is kept when the mailbox assigns one', async () => {
    const recorded: SentEmail[] = [];
    await composeEmail(input, 'user-1', { deps: fakeDeps(async () => ({ externalId: 'gmail-1', threadId: 'thread-9' }), recorded) });
    assert.equal(recorded[0].threadId, 'thread-9');
});

test('nothing is stored when the mailbox does not confirm the delivery', async () => {
    const recorded: SentEmail[] = [];
    await assert.rejects(
        composeEmail(input, 'user-1', { deps: fakeDeps(async () => { throw new Error('smtp password rejected'); }, recorded) }),
        (error: Error) => /did not confirm delivery/.test(error.message) && !/password/.test(error.message),
    );
    assert.deepEqual(recorded, []);
});

test('the request is rejected for a bad recipient, a multi-line subject or an empty message', () => {
    assert.equal(composeSchema.parse({ ...input, recipient: ' Anna@Example.test ' }).recipient, 'anna@example.test');
    assert.throws(() => composeSchema.parse({ ...input, recipient: 'anna' }));
    assert.throws(() => composeSchema.parse({ ...input, subject: 'Hi\r\nBcc: x@example.test' }));
    assert.throws(() => composeSchema.parse({ ...input, content: '   ' }));
});

test('attached files travel with the letter and are recorded with it', async () => {
    const sent: SendEmailInput[] = [];
    const recorded: SentEmail[] = [];
    const attachments = [{ filename: 'price.pdf', contentType: 'application/pdf', content: Buffer.from('pdf') }];
    await composeEmail(input, 'user-1', { attachments, deps: fakeDeps(async mail => { sent.push(mail); return { externalId: 'x' }; }, recorded) });

    assert.deepEqual(sent[0].attachments, attachments);
    assert.deepEqual(recorded[0].attachments, attachments);
});
