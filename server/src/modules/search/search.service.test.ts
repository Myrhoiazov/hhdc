import assert from 'node:assert/strict';
import test from 'node:test';
import { UserRole } from '@prisma/client';
import { paymentCustomerName, rankAndLimit, shouldIncludeTransactions } from './search.service';

test('rankAndLimit ranks exact match above startsWith above contains', () => {
    const rows = [
        { id: 1, name: 'Bogdan Ivanovsky' }, // contains "ivan" mid-string
        { id: 2, name: 'Ivanov' }, // starts with "ivan"
        { id: 3, name: 'Ivan' }, // exact match
    ];

    const result = rankAndLimit(rows, 'ivan', (row) => [row.name]);

    assert.deepEqual(result.map((row) => row.id), [3, 2, 1]);
});

test('rankAndLimit is case-insensitive', () => {
    const rows = [{ id: 1, name: 'IVAN' }];

    const result = rankAndLimit(rows, 'ivan', (row) => [row.name]);

    assert.deepEqual(result.map((row) => row.id), [1]);
});

test('rankAndLimit skips null/undefined fields without crashing and ranks by whichever field matches', () => {
    const rows: Array<{ id: number; first: string | null | undefined; second: string | null }> = [
        { id: 1, first: null, second: 'Ivan' }, // matches only via second field, exact
        { id: 2, first: 'Ivan Petrov', second: null }, // matches only via first field, startsWith
    ];

    const result = rankAndLimit(rows, 'ivan', (row) => [row.first, row.second]);

    assert.deepEqual(result.map((row) => row.id), [1, 2]);
});

test('rankAndLimit respects the limit after sorting by relevance', () => {
    const rows = Array.from({ length: 10 }, (_, index) => ({ id: index, name: `Ivan #${index}` }));

    const result = rankAndLimit(rows, 'ivan', (row) => [row.name], 3);

    assert.equal(result.length, 3);
});

test('paymentCustomerName prefers payerName, then given+family name, then email', () => {
    assert.equal(
        paymentCustomerName({ payerName: 'Krystyna Arpaci', givenName: 'Karina', familyName: 'Arpaci', email: 'k@x.com' }),
        'Krystyna Arpaci',
    );
    assert.equal(
        paymentCustomerName({ payerName: null, givenName: 'Karina', familyName: 'Arpaci', email: 'k@x.com' }),
        'Karina Arpaci',
    );
    assert.equal(
        paymentCustomerName({ payerName: null, givenName: null, familyName: null, email: 'k@x.com' }),
        'k@x.com',
    );
    assert.equal(
        paymentCustomerName({ payerName: null, givenName: null, familyName: null, email: null }),
        null,
    );
    assert.equal(paymentCustomerName(null), null);
});

test('shouldIncludeTransactions is true only for ADMIN role', () => {
    assert.equal(shouldIncludeTransactions(UserRole.ADMIN), true);
    assert.equal(shouldIncludeTransactions(UserRole.MANAGER), false);
    assert.equal(shouldIncludeTransactions(UserRole.DOCTOR), false);
});
