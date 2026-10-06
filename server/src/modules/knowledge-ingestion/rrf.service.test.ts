import assert from 'node:assert/strict';
import test from 'node:test';
import { fuseRankedLists } from './rrf.service';

test('an item ranked highly in both lists beats one ranked highly in only one', () => {
    const a = { id: 'a' };
    const b = { id: 'b' };
    const c = { id: 'c' };
    // a: rank 0 in both lists. b: rank 1 in list1, absent from list2. c: absent from list1, rank 0 in list2.
    const fused = fuseRankedLists([a, b], [c, a]);
    assert.equal(fused[0].id, 'a');
});

test('a single ranked list is returned in its own order when the other is empty', () => {
    const a = { id: 'a' };
    const b = { id: 'b' };
    const fused = fuseRankedLists([a, b], []);
    assert.deepEqual(fused.map((item) => item.id), ['a', 'b']);
});

test('fusing two empty lists returns an empty list', () => {
    assert.deepEqual(fuseRankedLists([], []), []);
});

test('an item appearing in every list outranks one appearing in only one, even at a worse rank', () => {
    const onlyInOne = { id: 'top-of-one-list' };
    const inBoth = { id: 'mid-of-both-lists' };
    const fused = fuseRankedLists([onlyInOne, inBoth], [inBoth]);
    assert.equal(fused[0].id, 'mid-of-both-lists');
});

test('preserves the original item reference, not a copy', () => {
    const item = { id: 'x', extra: 'data' };
    const [fused] = fuseRankedLists([item], []);
    assert.equal(fused, item);
});
