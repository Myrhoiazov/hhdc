import { test } from 'node:test';
import assert from 'node:assert/strict';
import { blockedMessage, removalFor, type RemovalFacts } from './person-removal';

const facts = (overrides: Partial<RemovalFacts> = {}): RemovalFacts => ({
    source: 'EMAIL', linkedToWeeztix: false, purchases: 0, events: 0, expenses: 0, choreographer: false, mailings: 0, ...overrides,
});

test('a contact that only a mailbox created can be deleted', () => {
    assert.deepEqual(removalFor(facts()), { allowed: true, blockers: [] });
});

test('a contact imported from Weeztix is kept', () => {
    assert.deepEqual(removalFor(facts({ source: 'WEEZTIX' })), { allowed: false, blockers: ['WEEZTIX'] });
});

test('a mail contact that was later matched to a Weeztix buyer is kept', () => {
    assert.deepEqual(removalFor(facts({ linkedToWeeztix: true, purchases: 2 })).blockers, ['WEEZTIX', 'PURCHASES']);
});

test('events, expenses and a choreographer profile each keep the contact', () => {
    assert.deepEqual(removalFor(facts({ events: 1 })).blockers, ['EVENTS']);
    assert.deepEqual(removalFor(facts({ expenses: 1 })).blockers, ['FINANCE']);
    assert.deepEqual(removalFor(facts({ choreographer: true })).blockers, ['CHOREOGRAPHER']);
});

test('a contact with a consent or letters of a campaign is kept, so an opt-out is not lost', () => {
    assert.deepEqual(removalFor(facts({ mailings: 1 })).blockers, ['MAILINGS']);
});

test('a contact added by hand or by an import is not a mail contact', () => {
    assert.deepEqual(removalFor(facts({ source: 'MANUAL' })).blockers, ['NOT_FROM_EMAIL']);
    assert.equal(removalFor(facts({ source: 'IMPORT' })).allowed, false);
});

test('the refusal names every reason', () => {
    assert.equal(blockedMessage(['WEEZTIX', 'PURCHASES']), 'This contact cannot be deleted: it is linked to Weeztix, it has purchases');
});
