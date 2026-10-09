import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isAutomaticSender } from './ingest';

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
