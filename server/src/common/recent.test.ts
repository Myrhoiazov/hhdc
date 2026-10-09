import { test } from 'node:test';
import assert from 'node:assert/strict';
import { happenedRecently } from './recent';

test('only what happened within a day is news', () => {
    const now = Date.parse('2026-10-07T12:00:00.000Z');

    assert.equal(happenedRecently('2026-10-07T11:00:00.000Z', now), true);
    assert.equal(happenedRecently(new Date('2026-10-06T12:30:00.000Z'), now), true);
    assert.equal(happenedRecently('2026-09-01T12:00:00.000Z', now), false);
    assert.equal(happenedRecently(undefined, now), false);
    assert.equal(happenedRecently('not a date', now), false);
});
