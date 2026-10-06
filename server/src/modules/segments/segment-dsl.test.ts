import test from 'node:test';
import assert from 'node:assert/strict';
import { compileSegment, parseSegmentDefinition, segmentWhere } from './segment-dsl';

test('registration rules in one group describe the same registration', () => {
    const where = segmentWhere({ all: [
        { field: 'registration.eventId', operator: 'eq', value: '11111111-1111-4111-8111-111111111111' },
        { field: 'registration.status', operator: 'eq', value: 'CONFIRMED' },
        { field: 'person.language', operator: 'eq', value: 'en' },
    ] });
    assert.deepEqual(where, { AND: [
        { registrations: { some: { AND: [{ eventId: '11111111-1111-4111-8111-111111111111' }, { status: 'CONFIRMED' }] } } },
        { language: 'en' },
    ] });
});

test('role and country rules compile to relation and scalar filters', () => {
    const where = compileSegment({ any: [{ field: 'person.role', operator: 'eq', value: 'CHOREOGRAPHER' }, { field: 'person.country', operator: 'in', value: ['NL', 'BE'] }] });
    assert.deepEqual(where, { OR: [{ roles: { some: { role: 'CHOREOGRAPHER' } } }, { country: { in: ['NL', 'BE'] } }] });
});

test('a segment cannot reference columns outside the whitelist or smuggle SQL', () => {
    assert.throws(() => segmentWhere({ field: 'person.passwordHash', operator: 'eq', value: 'x' }), /Unsupported segment field/);
    assert.throws(() => segmentWhere({ all: [{ field: 'registration.personId; DROP TABLE', operator: 'eq', value: 'x' }] }), /Unsupported segment field/);
    assert.throws(() => parseSegmentDefinition({ sql: 'SELECT 1' }));
});

test('an empty definition matches everyone and deep nesting is rejected', () => {
    assert.deepEqual(segmentWhere({}), { AND: [] });
    const nested = { all: [{ all: [{ all: [{ all: [{ all: [{ field: 'person.language', operator: 'eq', value: 'en' }] }] }] }] }] };
    assert.throws(() => parseSegmentDefinition(nested));
});
