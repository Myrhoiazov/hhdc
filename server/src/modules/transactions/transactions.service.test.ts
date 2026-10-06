import assert from 'node:assert/strict';
import test from 'node:test';
import { isCacheFresh } from './transactions.service';

test('isCacheFresh is false when there is no cache entry', () => {
    assert.equal(isCacheFresh(null, Date.now()), false);
});

test('isCacheFresh is true when the entry has not expired yet', () => {
    const now = 1000;
    assert.equal(isCacheFresh({ expiresAt: 1001 }, now), true);
});

test('isCacheFresh is false once the entry has expired', () => {
    const now = 1000;
    assert.equal(isCacheFresh({ expiresAt: 999 }, now), false);
    assert.equal(isCacheFresh({ expiresAt: 1000 }, now), false);
});
