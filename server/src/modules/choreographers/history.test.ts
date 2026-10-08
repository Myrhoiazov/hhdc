import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toHistory, type HistoryRow } from './history.rules';
import { assignToEventSchema, updateAssignmentSchema } from './history.service';

const now = new Date('2026-10-08T12:00:00Z');
const row = (id: string, name: string, start: string, end: string, sessions: HistoryRow['sessions'] = []): HistoryRow => ({
    id, status: 'CONFIRMED', roleTitle: 'Choreographer', travelStatus: 'PENDING', hotelStatus: 'PENDING', notes: null,
    event: { id: `event-${id}`, name, status: 'PUBLISHED', startAt: new Date(start), endAt: new Date(end), city: 'Amsterdam' }, sessions,
});

test('history is newest first, with the year taken from the event start', () => {
    const history = toHistory([
        row('a', 'HHDC 2025', '2025-05-16T08:00:00Z', '2025-05-18T20:00:00Z'),
        row('c', 'HHDC 2027', '2027-05-21T08:00:00Z', '2027-05-23T20:00:00Z'),
        row('b', 'HHDC 2026', '2026-05-15T08:00:00Z', '2026-05-17T20:00:00Z'),
    ], now);
    assert.deepEqual(history.map(item => [item.year, item.timing]), [[2027, 'UPCOMING'], [2026, 'PAST'], [2025, 'PAST']]);
});

test('an event that is running now is current, and sessions are listed in teaching order', () => {
    const [item] = toHistory([row('x', 'Camp', '2026-10-07T08:00:00Z', '2026-10-09T20:00:00Z', [
        { id: 's2', name: 'Heels Pro', startAt: new Date('2026-10-08T14:00:00Z') },
        { id: 's1', name: 'Heels Start', startAt: new Date('2026-10-08T10:00:00Z') },
    ])], now);
    assert.equal(item.timing, 'CURRENT');
    assert.deepEqual(item.sessions.map(session => session.name), ['Heels Start', 'Heels Pro']);
});

test('an assignment defaults to an invited choreographer and only known statuses are accepted', () => {
    const parsed = assignToEventSchema.parse({ eventId: '2c81a8b8-1556-47af-96fd-0be50e6d8561' });
    assert.deepEqual([parsed.roleTitle, parsed.status], ['Choreographer', 'INVITED']);
    assert.throws(() => assignToEventSchema.parse({ eventId: 'not-an-id' }));
    assert.equal(updateAssignmentSchema.parse({ travelStatus: 'BOOKED', notes: '' }).notes, null);
    assert.throws(() => updateAssignmentSchema.parse({ status: 'MAYBE' }));
    assert.throws(() => updateAssignmentSchema.parse({ eventId: '2c81a8b8-1556-47af-96fd-0be50e6d8561' }));
});
