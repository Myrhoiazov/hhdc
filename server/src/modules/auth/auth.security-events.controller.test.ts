import assert from 'node:assert/strict';
import test from 'node:test';
import { AuthSecurityEventType } from '@prisma/client';
import { parseAuthSecurityEventsQuery } from './auth.security-events.controller';

test('defaults to page 1 and limit 25 when no query params are given', () => {
    const { page, limit, where } = parseAuthSecurityEventsQuery({});

    assert.equal(page, 1);
    assert.equal(limit, 25);
    assert.deepEqual(where, {});
});

test('clamps limit above 100 down to 100', () => {
    const { limit } = parseAuthSecurityEventsQuery({ _limit: '500' });

    assert.equal(limit, 100);
});

test('clamps limit below 1 up to 1', () => {
    const { limit } = parseAuthSecurityEventsQuery({ _limit: '0' });

    assert.equal(limit, 1);
});

test('clamps page below 1 up to 1', () => {
    const { page } = parseAuthSecurityEventsQuery({ _page: '-3' });

    assert.equal(page, 1);
});

test('filters by a valid AuthSecurityEventType', () => {
    const { where } = parseAuthSecurityEventsQuery({ type: AuthSecurityEventType.ROLE_CHANGED });

    assert.deepEqual(where, { type: AuthSecurityEventType.ROLE_CHANGED });
});

test('ignores an invalid type value', () => {
    const { where } = parseAuthSecurityEventsQuery({ type: 'NOT_A_REAL_TYPE' });

    assert.deepEqual(where, {});
});

test('filters by a valid targetUserId', () => {
    const { where } = parseAuthSecurityEventsQuery({ targetUserId: '42' });

    assert.deepEqual(where, { targetUserId: 42 });
});

test('ignores a non-numeric targetUserId', () => {
    const { where } = parseAuthSecurityEventsQuery({ targetUserId: 'abc' });

    assert.deepEqual(where, {});
});

test('combines type and targetUserId filters', () => {
    const { where } = parseAuthSecurityEventsQuery({
        type: AuthSecurityEventType.SESSION_REVOKED,
        targetUserId: '7',
    });

    assert.deepEqual(where, { type: AuthSecurityEventType.SESSION_REVOKED, targetUserId: 7 });
});

test('exports authSecurityEventListSelect with expected fields', () => {
    const { authSecurityEventListSelect } = require('./auth.security-events.controller');

    assert.ok(authSecurityEventListSelect, 'authSecurityEventListSelect should be exported');
    assert.equal(typeof authSecurityEventListSelect, 'object');
    assert.notEqual(authSecurityEventListSelect, null);

    const select = authSecurityEventListSelect as Record<string, unknown>;
    assert.ok(select.id === true || select.id !== undefined, 'id should be selected');
    assert.ok(select.type === true || select.type !== undefined, 'type should be selected');
    assert.ok(select.createdAt === true || select.createdAt !== undefined, 'createdAt should be selected');
    assert.ok(select.metadata === true || select.metadata !== undefined, 'metadata should be selected');
    assert.ok(select.actorUserId === true || select.actorUserId !== undefined, 'actorUserId should be selected');
    assert.ok(select.targetUserId === true || select.targetUserId !== undefined, 'targetUserId should be selected');
});
