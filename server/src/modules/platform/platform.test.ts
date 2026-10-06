import test from 'node:test';
import assert from 'node:assert/strict';
import { generateApiKey, hashApiKey, isApiKeyUsable, looksLikeApiKey } from './api-keys';
import { parseCsv, toCsv } from './csv';
import { validateCustomValue } from './custom-fields';
import { findDuplicatePairs, normalizePhone, planFieldUpdates, scoreDuplicate } from './duplicate-rules';
import { planPeopleImport } from './import-export.service';
import { historyEventPayload, outboxFailureStatus } from '../outbox/outbox.service';
import { assertPublicWebhookUrl, nextRetryDelayMs, signWebhookPayload, verifyWebhookSignature } from '../webhooks/webhook-signing';

const person = (id: string, email: string | null, phone: string | null = null, firstName = 'Anna', lastName = 'Smith') => ({ id, firstName, lastName, email, phone });

test('duplicate detection suggests pairs by normalized email and phone', () => {
    const pairs = findDuplicatePairs([person('b', 'Anna@Example.test '), person('a', 'anna@example.test'), person('c', null, '+31 6 1234 5678', 'Ann', 'S'), person('d', null, '0031612345678', 'Bea', 'T'), person('e', 'other@example.test')]);
    assert.deepEqual(pairs.map(pair => [pair.personAId, pair.personBId, pair.reasons.join('+')]), [['a', 'b', 'SAME_EMAIL+SAME_NAME'], ['c', 'd', 'SAME_PHONE']]);
    assert.equal(scoreDuplicate(person('x', null), person('y', null)).reasons.join(), 'SAME_NAME');
    assert.equal(normalizePhone('12'), null);
});

test('a merge keeps target values unless the human picks the source value', () => {
    assert.deepEqual(planFieldUpdates({ email: 'new@example.test', phone: '+311', firstName: 'A' }, { email: 'source', phone: 'target' }), { email: 'new@example.test' });
});

test('custom field values are validated against their definition', () => {
    const select = { key: 'level', type: 'SELECT', required: true, options: ['start', 'pro'] };
    assert.equal(validateCustomValue(select, 'pro'), 'pro');
    assert.throws(() => validateCustomValue(select, 'expert'), /level/);
    assert.throws(() => validateCustomValue(select, ''), /required/);
    assert.equal(validateCustomValue({ key: 'age', type: 'NUMBER', required: false }, null), null);
    assert.throws(() => validateCustomValue({ key: 'age', type: 'NUMBER', required: false }, '12'));
    assert.throws(() => validateCustomValue({ key: 'x', type: 'SCRIPT', required: false }, 'y'), /Unsupported/);
});

test('CSV parsing handles quotes, embedded newlines and BOM; export neutralises formulas', () => {
    assert.deepEqual(parseCsv('\uFEFFname,note\r\n"Smith, Anna","said ""hi""\nbye"\n\n'), [['name', 'note'], ['Smith, Anna', 'said "hi"\nbye']]);
    assert.throws(() => parseCsv('a\n"open'), /unterminated/);
    assert.equal(toCsv(['name', 'note'], [{ name: '=HYPERLINK("x")', note: 'a,b' }]), 'name,note\r\n"\'=HYPERLINK(""x"")","a,b"');
});

test('an import plan validates rows without touching the database', () => {
    const plan = planPeopleImport('First,Mail,Ignored\nAnna,ANNA@example.test,x\n,missing@example.test,x\nBea,not-an-email,x\nCleo,,x', { First: 'firstName', Mail: 'email' });
    assert.deepEqual(plan.valid.map(row => [row.firstName, row.email]), [['Anna', 'anna@example.test'], ['Cleo', null]]);
    assert.deepEqual(plan.invalid.map(row => row.row), [3, 4]);
});

test('API keys are stored hashed, shown once and stop working when revoked or expired', () => {
    const { key, prefix, keyHash } = generateApiKey();
    assert.equal(looksLikeApiKey(key), true);
    assert.equal(key.includes(prefix), true);
    assert.equal(keyHash, hashApiKey(key));
    assert.notEqual(keyHash, key);
    assert.equal(looksLikeApiKey('hhdc_session_cookie'), false);
    assert.equal(isApiKeyUsable({ status: 'ACTIVE', expiresAt: null }), true);
    assert.equal(isApiKeyUsable({ status: 'REVOKED', expiresAt: null }), false);
    assert.equal(isApiKeyUsable({ status: 'ACTIVE', expiresAt: new Date(Date.now() - 1) }), false);
});

test('webhook payloads are HMAC-signed over the timestamp and body', () => {
    const signature = signWebhookPayload('secret', 1700000000, '{"a":1}');
    assert.match(signature, /^v1=[0-9a-f]{64}$/);
    assert.equal(verifyWebhookSignature('secret', 1700000000, '{"a":1}', signature), true);
    assert.equal(verifyWebhookSignature('secret', 1700000001, '{"a":1}', signature), false);
    assert.equal(verifyWebhookSignature('other', 1700000000, '{"a":1}', signature), false);
});

test('webhook retries back off exponentially and then stop', () => {
    assert.deepEqual([1, 2, 3, 4, 5, 6].map(nextRetryDelayMs), [60000, 120000, 240000, 480000, 960000, null]);
});

test('webhook endpoints must be public https hosts', () => {
    assert.equal(assertPublicWebhookUrl('https://hooks.example.com/crm').hostname, 'hooks.example.com');
    for (const url of ['http://hooks.example.com', 'https://localhost/x', 'https://127.0.0.1/x', 'https://10.0.0.5/x', 'https://192.168.1.1/x', 'https://169.254.169.254/latest', 'https://[::1]/x', 'https://user:pw@example.com/x', 'https://db.internal/x']) {
        assert.throws(() => assertPublicWebhookUrl(url), url);
    }
});

test('outbox events carry ids only and fail permanently after the attempt limit', () => {
    assert.deepEqual(historyEventPayload({ type: 'REGISTRATION_CREATED', entityType: 'Registration', entityId: 'r1', personId: 'p1', eventId: 'e1' }), { entityType: 'Registration', entityId: 'r1', personId: 'p1', eventId: 'e1', registrationId: 'r1' });
    assert.equal(outboxFailureStatus(4), 'PENDING');
    assert.equal(outboxFailureStatus(5), 'FAILED');
});
