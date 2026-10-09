import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isAutomaticSender, retryDelayMs, retryOnConflict } from './ingest';

test('addresses that programs write from make no contact', () => {
    for (const address of ['noreply@appsheet.com', 'no-reply@shop.example.test', 'No_Reply+abc@example.test', 'donotreply@example.test', 'mailer-daemon@example.test', 'notifications@example.test', 'bounce-123@example.test',
        'noreply123@example.test', 'info-noreply@example.test', 'newsletter@example.test', 'notify@example.test']) {
        assert.equal(isAutomaticSender(address), true, address);
    }
});

test('an address of a person is not mistaken for a program', () => {
    for (const address of ['anna@example.test', 'priority@admetricscore.com', 'reply@example.test', 'norepl@example.test', 'noreplying.anna@example.test', 'notifyme.anna@example.test', 'anna.newsletterfan@example.test']) {
        assert.equal(isAutomaticSender(address), false, address);
    }
});

const conflict = new Error('write conflict');
const retryConflicts = { isRetryable: (error: unknown) => error === conflict };

test('a letter that hits a write conflict is stored on a later attempt, after a pause', async () => {
    const waits: number[] = [];
    let calls = 0;
    const result = await retryOnConflict(async () => { calls += 1; if (calls < 3) throw conflict; return 'stored'; },
        { ...retryConflicts, wait: async ms => { waits.push(ms); } });
    assert.equal(result, 'stored');
    assert.equal(waits.length, 2);
});

test('the conflict is reported once the attempts run out, and other errors at once', async () => {
    let calls = 0;
    await assert.rejects(retryOnConflict(async () => { calls += 1; throw conflict; }, { ...retryConflicts, attempts: 4, wait: async () => undefined }), /write conflict/);
    assert.equal(calls, 4);
    calls = 0;
    await assert.rejects(retryOnConflict(async () => { calls += 1; throw new Error('broken letter'); }, { ...retryConflicts, wait: async () => undefined }), /broken letter/);
    assert.equal(calls, 1);
});

test('each pause is longer than the one before and never the same for two mailboxes', () => {
    assert.ok(retryDelayMs(3, () => 0) > retryDelayMs(0, () => 1));
    assert.notEqual(retryDelayMs(1, () => 0.1), retryDelayMs(1, () => 0.9));
});
