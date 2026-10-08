import { test } from 'node:test';
import assert from 'node:assert/strict';
import { auditFiltersSchema, auditWhere } from './audit.service';

test('without filters the whole log is listed', () => {
    assert.deepEqual(auditWhere(auditFiltersSchema.parse({ q: '', entityType: '', actorUserId: '', from: '', to: '', page: '2' })), {});
});

test('an action is found by its words, whatever the case', () => {
    assert.deepEqual(auditWhere({ q: ' payment  confirmed ' }), { action: { contains: 'payment_confirmed', mode: 'insensitive' } });
});

test('the kind of record and the staff member narrow the log together', () => {
    const actorUserId = '24fa64b2-1964-41e4-abf8-e42d0a4304ad';
    assert.deepEqual(auditWhere({ entityType: 'Person', actorUserId }), { entityType: 'Person', actorUserId });
});

test('a period includes both of its days, and one end may be left open', () => {
    assert.deepEqual(auditWhere({ from: '2026-10-07', to: '2026-10-08' }), { createdAt: { gte: new Date('2026-10-07T00:00:00.000Z'), lt: new Date('2026-10-09T00:00:00.000Z') } });
    assert.deepEqual(auditWhere({ to: '2026-10-08' }), { createdAt: { lt: new Date('2026-10-09T00:00:00.000Z') } });
});

test('a malformed user or date is refused instead of being ignored', () => {
    assert.throws(() => auditFiltersSchema.parse({ actorUserId: 'me' }));
    assert.throws(() => auditFiltersSchema.parse({ from: '08.10.2026' }));
});
