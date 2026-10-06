import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePagination } from '../../common/http';
import { csrfForSession } from '../auth/auth.service';
import { hasPermission } from '../auth/auth.middleware';

test('a viewer cannot write people and an owner needs an explicit permission', () => {
    assert.equal(hasPermission(['people.read'], 'people.write'), false);
    assert.equal(hasPermission(['people.write'], 'people.write'), true);
});

test('pagination rejects requests that could load an unbounded collection', () => {
    assert.throws(() => normalizePagination({ pageSize: '10000' }));
    assert.deepEqual(normalizePagination({}), { page: 1, pageSize: 25, skip: 0 });
});

test('csrf tokens are bound to the authenticated session', () => {
    assert.notEqual(csrfForSession('first', 'secret'), csrfForSession('second', 'secret'));
});
