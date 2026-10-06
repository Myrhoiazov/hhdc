import assert from 'node:assert/strict';
import test from 'node:test';
import { simpleParser } from 'mailparser';
import { addressesToJson, resolveContactAddress, resolveReplyToAddress } from './email-imap.service';

test('addressesToJson keeps only entries with an address, dropping the rest', () => {
    const result = addressesToJson([
        { address: 'a@example.com', name: 'A' },
        { name: 'No address here' },
        { address: 'b@example.com' },
    ]);

    assert.deepEqual(result, [
        { address: 'a@example.com', name: 'A' },
        { address: 'b@example.com', name: undefined },
    ]);
});

test('addressesToJson returns an empty array for missing/undefined input', () => {
    assert.deepEqual(addressesToJson(undefined), []);
    assert.deepEqual(addressesToJson(null), []);
    assert.deepEqual(addressesToJson([]), []);
});

test('resolveReplyToAddress returns the Reply-To of a website contact-form email', () => {
    const replyTo = resolveReplyToAddress('wordpress@talentcenterddc.nl', [{ address: ' Parent@Example.com ', name: '' }]);
    assert.equal(replyTo, 'parent@example.com');
});

test('resolveReplyToAddress ignores a Reply-To that is missing, malformed or equal to From', () => {
    assert.equal(resolveReplyToAddress('parent@example.com', undefined), null);
    assert.equal(resolveReplyToAddress('parent@example.com', []), null);
    assert.equal(resolveReplyToAddress('parent@example.com', [{ name: 'No address' }]), null);
    assert.equal(resolveReplyToAddress('parent@example.com', [{ address: 'not-an-address' }]), null);
    assert.equal(resolveReplyToAddress('parent@example.com', [{ address: 'PARENT@example.com' }]), null);
});

test('resolveReplyToAddress takes the first usable address when several are listed', () => {
    assert.equal(resolveReplyToAddress('form@site.example', [{ name: 'empty' }, { address: 'first@example.com' }, { address: 'second@example.com' }]), 'first@example.com');
});

test('resolveContactAddress prefers Reply-To and falls back to From', () => {
    assert.equal(resolveContactAddress({ fromAddress: 'form@site.example', replyToAddress: 'parent@example.com' }), 'parent@example.com');
    assert.equal(resolveContactAddress({ fromAddress: 'parent@example.com', replyToAddress: null }), 'parent@example.com');
});

const CONTACT_FORM_EMAIL = [
    'From: Talent Center DDC <wordpress@talentcenterddc.nl>',
    'Reply-To: parent@example.com',
    'To: info@example.org',
    'Subject: Talent Center DDC "Question"',
    'Message-ID: <form-1@talentcenterddc.nl>',
    'X-Mailer: PHPMailer 7.1.1',
    'Content-Type: text/plain; charset=UTF-8',
    '',
    'From: Parent parent@example.com',
    'Message: hello',
].join('\r\n');

test('a parsed website contact-form email resolves to the visitor, not the site address', async () => {
    const parsed = await simpleParser(CONTACT_FORM_EMAIL);
    const fromAddress = parsed.from?.value?.[0]?.address ?? '';
    const replyToAddress = resolveReplyToAddress(fromAddress, parsed.replyTo?.value);
    assert.equal(fromAddress, 'wordpress@talentcenterddc.nl');
    assert.equal(resolveContactAddress({ fromAddress, replyToAddress }), 'parent@example.com');
});
