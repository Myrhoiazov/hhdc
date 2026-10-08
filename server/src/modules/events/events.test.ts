import { test } from 'node:test';
import assert from 'node:assert/strict';
import { eventFiltersSchema, registrationFiltersSchema } from './events.schemas';
import { eventsWhere, registrationsWhere } from './events.service';

const now = new Date('2026-10-08T12:00:00Z');

test('without filters every event is listed', () => {
    assert.deepEqual(eventsWhere({}, now), {});
    assert.deepEqual(eventsWhere({ q: '  ' }, now), {});
});

test('search looks in the name, venue and city, ignoring case', () => {
    assert.deepEqual(eventsWhere({ q: ' camp ' }, now).OR, ['name', 'venueName', 'city'].map(field => ({ [field]: { contains: 'camp', mode: 'insensitive' } })));
});

test('an event is upcoming until it has ended; status and period narrow the list together', () => {
    assert.deepEqual(eventsWhere({ period: 'upcoming' }, now), { endAt: { gte: now } });
    assert.deepEqual(eventsWhere({ period: 'past', status: 'COMPLETED' }, now), { status: 'COMPLETED', endAt: { lt: now } });
});

test('an empty filter in the address means no filter, an unknown value is refused, paging fields are ignored', () => {
    assert.deepEqual(eventsWhere(eventFiltersSchema.parse({ q: '', status: '', period: '', page: '2', pageSize: '25' }), now), {});
    assert.equal(eventFiltersSchema.parse({ status: 'PUBLISHED' }).status, 'PUBLISHED');
    assert.throws(() => eventFiltersSchema.parse({ status: 'OPEN' }));
    assert.throws(() => eventFiltersSchema.parse({ period: 'soon' }));
});

test('registrations of an event are searched by the person and narrowed by status', () => {
    assert.deepEqual(registrationsWhere('e-1', {}), { eventId: 'e-1' });
    const where = registrationsWhere('e-1', { q: ' anna ', status: 'CHECKED_IN' });
    assert.equal(where.status, 'CHECKED_IN');
    assert.deepEqual(where.person, { is: { OR: ['displayName', 'firstName', 'lastName', 'email', 'phone'].map(field => ({ [field]: { contains: 'anna', mode: 'insensitive' } })) } });
    assert.throws(() => registrationFiltersSchema.parse({ status: 'MAYBE' }));
});
