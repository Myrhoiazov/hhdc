import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createChoreographerSchema, normalizeLabels, updateChoreographerSchema } from './profile.schemas';
import { profileChecklist, summarizeAssignments, type ChecklistProfile } from './profile.summary';

const now = new Date('2026-10-08T12:00:00Z');
const event = (id: string, name: string, start: string, end: string) => ({ id, name, startAt: new Date(start), endAt: new Date(end) });
const assignment = (id: string, status: string, ev: ReturnType<typeof event>) => ({ id, status, roleTitle: 'Choreographer', event: ev });

test('the summary counts collaborations, the last event year and the nearest upcoming event', () => {
    const summary = summarizeAssignments([
        assignment('a1', 'COMPLETED', event('e25', 'HHDC 2025', '2025-05-16T08:00:00Z', '2025-05-18T20:00:00Z')),
        assignment('a2', 'COMPLETED', event('e26', 'HHDC 2026', '2026-05-15T08:00:00Z', '2026-05-17T20:00:00Z')),
        assignment('a3', 'CONFIRMED', event('e27', 'HHDC 2027', '2027-05-21T08:00:00Z', '2027-05-23T20:00:00Z')),
        assignment('a4', 'CANCELLED', event('e28', 'HHDC 2028', '2028-05-19T08:00:00Z', '2028-05-21T20:00:00Z')),
    ], now);
    assert.equal(summary.totalAssignments, 3);
    assert.equal(summary.lastEventYear, 2026);
    assert.deepEqual(summary.upcomingEvent, { id: 'e27', name: 'HHDC 2027', startAt: new Date('2027-05-21T08:00:00Z') });
});

test('a choreographer without events has an empty summary; a running event is both last and upcoming', () => {
    assert.deepEqual(summarizeAssignments([], now), { totalAssignments: 0, lastEventYear: null, upcomingEvent: null });
    const running = summarizeAssignments([assignment('a1', 'CONFIRMED', event('e', 'Camp', '2026-10-07T08:00:00Z', '2026-10-09T20:00:00Z'))], now);
    assert.equal(running.lastEventYear, 2026);
    assert.equal(running.upcomingEvent?.id, 'e');
});

test('the checklist names what is still missing from a profile', () => {
    const empty: ChecklistProfile = { stageName: null, bioShort: null, bioFull: null, countryCode: null, instagramUrl: null, websiteUrl: null, styles: [] };
    assert.deepEqual(profileChecklist(empty, { email: null }), ['stage_name', 'biography', 'styles', 'country', 'social_link', 'email']);
    const complete: ChecklistProfile = { stageName: 'Jojo', bioShort: null, bioFull: 'Full bio', countryCode: 'US', instagramUrl: 'https://instagram.com/jojo', websiteUrl: null, styles: ['heels'] };
    assert.deepEqual(profileChecklist(complete, { email: 'jojo@example.test' }), []);
});

test('profile input is normalised and only web links are accepted', () => {
    const parsed = updateChoreographerSchema.parse({ stageName: '  Jojo Gomez ', countryCode: 'us', styles: ['Heels', ' heels ', 'Frame  Up', ''], instagramUrl: 'https://instagram.com/jojo', websiteUrl: '', city: '' });
    assert.equal(parsed.stageName, 'Jojo Gomez');
    assert.equal(parsed.countryCode, 'US');
    assert.deepEqual(parsed.styles, ['heels', 'frame up']);
    assert.equal(parsed.websiteUrl, null);
    assert.equal(parsed.city, null);
    assert.deepEqual(normalizeLabels(['EN', 'en ', 'NL']), ['en', 'nl']);
    assert.throws(() => updateChoreographerSchema.parse({ instagramUrl: 'javascript:alert(1)' }));
    assert.throws(() => updateChoreographerSchema.parse({ countryCode: 'USA' }));
    assert.throws(() => updateChoreographerSchema.parse({ relationshipStatus: 'FRIEND' }));
    assert.throws(() => updateChoreographerSchema.parse({ legalName: 'x' }));
});

test('creating a profile needs an existing person id', () => {
    assert.equal(createChoreographerSchema.parse({ personId: '2c81a8b8-1556-47af-96fd-0be50e6d8561', stageName: 'Aliya' }).stageName, 'Aliya');
    assert.throws(() => createChoreographerSchema.parse({ stageName: 'Aliya' }));
});
