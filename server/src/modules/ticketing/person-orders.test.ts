import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isCheckedIn } from './person-orders';

test('a ticket is checked in when a Weeztix scanner used it or the CRM checked its registration in', () => {
    assert.equal(isCheckedIn({ status: 'USED', registration: null }), true);
    assert.equal(isCheckedIn({ status: 'VALID', registration: { status: 'CHECKED_IN' } }), true);
    assert.equal(isCheckedIn({ status: 'VALID', registration: { status: 'CONFIRMED' } }), false);
    assert.equal(isCheckedIn({ status: 'VALID', registration: null }), false);
});
