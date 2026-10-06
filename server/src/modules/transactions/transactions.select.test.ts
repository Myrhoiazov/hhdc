import assert from 'node:assert/strict';
import test from 'node:test';
import { manualTransactionSelect, molliePaymentTransactionSelect } from './transactions.select';

test('manualTransactionSelect projects the financial transaction fields', () => {
    assert.deepEqual(manualTransactionSelect, {
        id: true,
        type: true,
        amount: true,
        category: true,
        description: true,
        date: true,
        createdAt: true,
        updatedAt: true,
        paymentMethod: true,
    });
});

test('molliePaymentTransactionSelect keeps payment projection narrow', () => {
    assert.deepEqual(molliePaymentTransactionSelect, {
        id: true,
        mollieId: true,
        amountValue: true,
        amountCurrency: true,
        refundedAmount: true,
        chargedBackAmount: true,
        adjustmentAt: true,
        description: true,
        method: true,
        status: true,
        paidAt: true,
        createdAt: true,
        updatedAt: true,
        customer: {
            select: {
                givenName: true,
                familyName: true,
                consumerName: true,
                email: true,
            },
        },
    });
});

test('mollie payment projection does not include unrelated relations or checkout data', () => {
    assert.equal('checkoutUrl' in molliePaymentTransactionSelect, false);
    assert.equal('subscription' in molliePaymentTransactionSelect, false);
    assert.equal('invoice' in molliePaymentTransactionSelect, false);
});
