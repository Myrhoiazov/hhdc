import test from 'node:test';
import assert from 'node:assert/strict';
import { timingSafeEqualStrings } from './crypto';

test('timingSafeEqualStrings returns true for identical strings', () => {
    assert.equal(timingSafeEqualStrings('same-value', 'same-value'), true);
});

test('timingSafeEqualStrings returns false for different strings of equal length', () => {
    assert.equal(timingSafeEqualStrings('aaaaaaaaaa', 'bbbbbbbbbb'), false);
});

test('timingSafeEqualStrings returns false for strings of different length', () => {
    assert.equal(timingSafeEqualStrings('short', 'a-much-longer-value'), false);
});

test('timingSafeEqualStrings treats empty strings as equal to each other only', () => {
    assert.equal(timingSafeEqualStrings('', ''), true);
    assert.equal(timingSafeEqualStrings('', 'x'), false);
});
