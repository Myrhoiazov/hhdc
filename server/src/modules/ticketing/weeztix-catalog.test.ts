import { test } from 'node:test';
import assert from 'node:assert/strict';
import { changesToApply, eventSlug, eventStatus, toSnapshot, type EventSnapshot } from './weeztix-catalog.service';

const now = new Date('2026-10-08T12:00:00Z').getTime();
const item = {
    guid: '5262e2a2-a707-41eb-83c3-cbb8200c51ab', name: 'HHDC 2027', description: null as string | null, startAt: '2027-05-21T01:00:00+02:00', endAt: '2027-05-23T23:00:00+02:00',
    currency: 'EUR', venueName: 'Studio', address: 'Street 1', capacity: null as number | null, ticketTypes: [] as never[],
};
const synced: EventSnapshot = toSnapshot(item, now);

test('an event that has ended is completed, any other is published', () => {
    assert.equal(eventStatus('2026-10-08T11:59:00Z', now), 'COMPLETED');
    assert.equal(eventStatus('2027-05-23T23:00:00+02:00', now), 'PUBLISHED');
});

test('dates are compared as moments, whatever offset Weeztix writes them in', () => {
    assert.equal(synced.startAt, '2027-05-20T23:00:00.000Z');
    assert.equal(toSnapshot({ ...item, startAt: '2027-05-20T23:00:00Z' }, now).startAt, synced.startAt);
});

test('nothing changes while Weeztix says the same', () => {
    assert.deepEqual(changesToApply(synced, synced, synced), {});
});

test('a change in Weeztix reaches the CRM, but a field edited by hand is left alone', () => {
    const incoming = { ...synced, name: 'HHDC 2027 Amsterdam', venueName: 'New Studio' };
    assert.deepEqual(changesToApply(synced, synced, incoming), { name: 'HHDC 2027 Amsterdam', venueName: 'New Studio' });
    const editedByHand = { ...synced, name: 'High Heels Dance Camp 2027' };
    assert.deepEqual(changesToApply(editedByHand, synced, incoming), { venueName: 'New Studio' });
});

test('an event linked before snapshots existed keeps everything the CRM holds', () => {
    assert.deepEqual(changesToApply(synced, {}, { ...synced, name: 'Other' }), {});
});

test('the slug is readable and unique per Weeztix event', () => {
    assert.equal(eventSlug(item), 'hhdc-2027-5262e2a2');
    assert.equal(eventSlug({ name: 'Ж', guid: 'abcdefgh-1' }), 'event-abcdefgh');
});
