import { test } from 'node:test';
import assert from 'node:assert/strict';
import { peopleFiltersSchema } from './people.schemas';
import { peopleWhere } from './people.service';

test('without filters every person is listed', () => {
    assert.deepEqual(peopleWhere({}), {});
    assert.deepEqual(peopleWhere({ q: '   ' }), {});
});

test('search looks in the name, email and phone, ignoring case', () => {
    const where = peopleWhere({ q: ' Anna ' });
    assert.deepEqual(where.OR, ['displayName', 'firstName', 'lastName', 'email', 'phone'].map(field => ({ [field]: { contains: 'Anna', mode: 'insensitive' } })));
});

test('filters by role, source and purchases narrow the list together', () => {
    assert.deepEqual(peopleWhere({ role: 'CUSTOMER', source: 'WEEZTIX', purchases: 'yes' }), { roles: { some: { role: 'CUSTOMER' } }, source: 'WEEZTIX', orders: { some: {} } });
    assert.deepEqual(peopleWhere({ purchases: 'no' }), { orders: { none: {} } });
});

test('an empty filter in the address means no filter, an unknown value is refused, paging fields are ignored', () => {
    assert.deepEqual(peopleWhere(peopleFiltersSchema.parse({ q: '', role: '', source: '', purchases: '', page: '2', pageSize: '25' })), {});
    const parsed = peopleFiltersSchema.parse({ q: ' anna ', role: 'CUSTOMER' });
    assert.deepEqual([parsed.q, parsed.role, parsed.source, parsed.purchases], ['anna', 'CUSTOMER', undefined, undefined]);
    assert.throws(() => peopleFiltersSchema.parse({ role: 'ADMIN' }));
    assert.throws(() => peopleFiltersSchema.parse({ purchases: 'maybe' }));
});
