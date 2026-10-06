import test from 'node:test';
import assert from 'node:assert/strict';
import {
    buildCustomerDeleteDependencyWhere,
    parseSubscriptionCustomerId,
} from './payments.controller';

test('parseSubscriptionCustomerId accepts positive integer ids from requests', () => {
    assert.equal(parseSubscriptionCustomerId(26), 26);
    assert.equal(parseSubscriptionCustomerId('26'), 26);
});

test('parseSubscriptionCustomerId rejects missing, invalid, and non-positive ids', () => {
    assert.equal(parseSubscriptionCustomerId(undefined), null);
    assert.equal(parseSubscriptionCustomerId(null), null);
    assert.equal(parseSubscriptionCustomerId('abc'), null);
    assert.equal(parseSubscriptionCustomerId(''), null);
    assert.equal(parseSubscriptionCustomerId('0'), null);
});

test('buildCustomerDeleteDependencyWhere blocks only live mandates and subscriptions', () => {
    assert.deepEqual(buildCustomerDeleteDependencyWhere(7), {
        mandates: {
            customerId: 7,
            status: { in: ['valid', 'pending'] },
        },
        subscriptions: {
            customerId: 7,
            status: { in: ['active', 'pending', 'suspended'] },
        },
    });
});
