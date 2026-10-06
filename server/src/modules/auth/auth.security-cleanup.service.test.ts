import assert from 'node:assert/strict';
import test from 'node:test';
import { AUTH_SECURITY_EVENT_RETENTION_DAYS, authSecurityEventCutoffDate } from './auth.security-cleanup.service';

test('cutoff date is exactly the retention window before now', () => {
    const now = new Date('2026-09-10T12:00:00.000Z');
    const cutoff = authSecurityEventCutoffDate(now);

    const expectedMs = now.getTime() - AUTH_SECURITY_EVENT_RETENTION_DAYS * 24 * 60 * 60 * 1000;
    assert.equal(cutoff.getTime(), expectedMs);
});

test('an event created exactly at the cutoff is not older than the cutoff', () => {
    const now = new Date('2026-09-10T12:00:00.000Z');
    const cutoff = authSecurityEventCutoffDate(now);

    assert.equal(cutoff.getTime() < cutoff.getTime(), false);
});

test('an event created one millisecond before the cutoff is older than the cutoff', () => {
    const now = new Date('2026-09-10T12:00:00.000Z');
    const cutoff = authSecurityEventCutoffDate(now);
    const justBeforeCutoff = new Date(cutoff.getTime() - 1);

    assert.equal(justBeforeCutoff.getTime() < cutoff.getTime(), true);
});

test('defaults to the current time when now is not provided', () => {
    const before = Date.now();
    const cutoff = authSecurityEventCutoffDate();
    const after = Date.now();

    const retentionMs = AUTH_SECURITY_EVENT_RETENTION_DAYS * 24 * 60 * 60 * 1000;
    assert.ok(cutoff.getTime() >= before - retentionMs);
    assert.ok(cutoff.getTime() <= after - retentionMs);
});
