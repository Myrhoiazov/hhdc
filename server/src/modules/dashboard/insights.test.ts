import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summariseCountries, summariseYears, toCents } from './insights';

const events = [
    { id: 'camp-26', name: 'Camp 2026', startAt: new Date('2026-05-15T10:00:00Z') },
    { id: 'show-26', name: 'Show 2026', startAt: new Date('2026-02-01T10:00:00Z') },
    { id: 'camp-25', name: 'Camp 2025', startAt: new Date('2025-05-16T10:00:00Z') },
];
const sales = [
    { eventId: 'camp-26', tickets: 445, revenue: 13941500, listValue: 14908000 },
    { eventId: 'show-26', tickets: 60, revenue: 270000, listValue: 270000 },
];
const costs = [{ eventId: 'camp-26', amount: 500000 }, { eventId: 'camp-26', amount: 120050 }];

test('years run newest first and events inside a year in the order they took place', () => {
    const years = summariseYears(events, sales, costs);
    assert.deepEqual(years.map(year => year.year), [2026, 2025]);
    assert.deepEqual(years[0].events.map(event => event.name), ['Show 2026', 'Camp 2026']);
});

test('an event shows income, the discount given, what was spent and what is left', () => {
    const camp = summariseYears(events, sales, costs)[0].events[1];
    assert.deepEqual([camp.tickets, camp.revenue, camp.discount, camp.costs, camp.result], [445, '139415.00', '9665.00', '6200.50', '133214.50']);
});

test('a year adds its events up, and an event without sales or costs is zeros, not missing', () => {
    const [y2026, y2025] = summariseYears(events, sales, costs);
    assert.deepEqual([y2026.tickets, y2026.revenue, y2026.costs, y2026.result], [505, '142115.00', '6200.50', '135914.50']);
    assert.deepEqual([y2025.tickets, y2025.revenue, y2025.costs, y2025.result, y2025.events.length], [0, '0.00', '0.00', '0.00', 1]);
});

test('money from the database is counted in cents', () => {
    assert.equal(toCents('0.10') + toCents('0.20'), 30);
    assert.equal(toCents(null), 0);
});

test('buyers are counted once per country, whatever language they typed it in', () => {
    const summary = summariseCountries([
        { holderId: 'p1', country: 'Germany', revenue: 33000 }, { holderId: 'p1', country: 'Germany', revenue: 33000 },
        { holderId: 'p2', country: 'Deutschland', revenue: 39000 }, { holderId: 'p3', country: 'Nederland', revenue: 1200 },
    ]);
    assert.deepEqual(summary.countries, [{ code: 'DE', buyers: 2, tickets: 3, revenue: '1050.00' }, { code: 'NL', buyers: 1, tickets: 1, revenue: '12.00' }]);
});

test('a missing or unreadable country is counted apart, not guessed', () => {
    const summary = summariseCountries([
        { holderId: 'p1', country: null, revenue: 100 }, { holderId: 'p1', country: null, revenue: 100 }, { holderId: 'p2', country: '  ', revenue: 100 },
        { holderId: 'p3', country: 'Amsterdam', revenue: 100 },
    ]);
    assert.deepEqual(summary, { countries: [], notGiven: 2, notRecognised: 1 });
});
