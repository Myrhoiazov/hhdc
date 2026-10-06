import assert from 'node:assert/strict';
import test from 'node:test';
import type { Request, Response } from 'express';
import { fromPartial } from '@total-typescript/shoehorn';
import prisma from '../../../prisma/prisma-client';
import * as mollieService from './payments.mollie.service';
import { updateCustomerController } from './payments.controller';
import { planCustomerUpdate } from './payments.customer-update.service';

const stored = {
    id: 1,
    mollieId: 'cst_1',
    email: 'payer@example.test',
    givenName: 'Valentyna',
    familyName: 'Valentyna',
    payerName: 'Valentyna Valentyna',
};

function stub(t: test.TestContext, delegate: object, method: string, impl: (...args: any[]) => unknown) {
    const target = delegate as Record<string, unknown>;
    const original = target[method];
    target[method] = impl;
    t.after(() => { target[method] = original; });
}

const response = () => {
    const res: Response = fromPartial({
        statusCode: 200,
        status(code: number) { this.statusCode = code; return this; },
        json() { return this; },
    });
    return res;
};

const request = (body: unknown): Request => fromPartial({ params: { customerId: '1' }, body });

// The stored customer is found and every local update succeeds, echoing what was written.
const stubCustomerStore = (t: test.TestContext, existing: object | null = stored) => {
    const updates: Array<Record<string, unknown>> = [];
    stub(t, prisma.customer, 'findUnique', async () => existing);
    stub(t, prisma.customer, 'update', async ({ data }: { data: Record<string, unknown> }) => {
        updates.push(data);
        return { ...existing, ...data };
    });
    return updates;
};

test('planCustomerUpdate makes the payer name follow a changed family name and pushes it to Mollie', () => {
    const plan = planCustomerUpdate(stored, { familyName: 'Osadchenko', payerName: 'Valentyna Valentyna' });

    assert.equal(plan.data.payerName, 'Valentyna Osadchenko');
    assert.deepEqual(plan.mollieUpdate, { name: 'Valentyna Osadchenko', email: 'payer@example.test' });
});

test('planCustomerUpdate repairs a payer name that an earlier local-only edit left behind', () => {
    const plan = planCustomerUpdate({ ...stored, familyName: 'Osadchenko' }, { givenName: 'Valentyna', familyName: 'Osadchenko' });

    assert.equal(plan.data.payerName, 'Valentyna Osadchenko');
    assert.deepEqual(plan.mollieUpdate, { name: 'Valentyna Osadchenko', email: 'payer@example.test' });
});

test('planCustomerUpdate keeps a payer name that was edited explicitly', () => {
    const plan = planCustomerUpdate(stored, { familyName: 'Osadchenko', payerName: 'Mother of Valentyna' });

    assert.equal(plan.data.payerName, 'Mother of Valentyna');
    assert.equal(plan.mollieUpdate?.name, 'Mother of Valentyna');
});

test('planCustomerUpdate pushes a changed email to Mollie', () => {
    const plan = planCustomerUpdate(stored, { email: 'new@example.test' });

    assert.deepEqual(plan.mollieUpdate, { name: 'Valentyna Valentyna', email: 'new@example.test' });
});

test('planCustomerUpdate does not call Mollie when neither the name nor the email changes', () => {
    const plan = planCustomerUpdate(stored, { city: 'Arnhem', givenName: 'Valentyna', familyName: 'Valentyna' });

    assert.equal(plan.mollieUpdate, null);
    assert.equal(plan.data.payerName, undefined);
    assert.equal(plan.data.city, 'Arnhem');
});

test('planCustomerUpdate does not call Mollie for a customer that has no Mollie id', () => {
    const plan = planCustomerUpdate({ ...stored, mollieId: null }, { familyName: 'Osadchenko' });

    assert.equal(plan.mollieUpdate, null);
    assert.equal(plan.data.payerName, 'Valentyna Osadchenko');
});

test('updating a customer renames it in Mollie and stores the new payer name', async (t) => {
    const updates = stubCustomerStore(t);
    const mollieUpdate = t.mock.method(mollieService, 'updateCustomerById', async () => ({}) as never);
    const res = response();

    await updateCustomerController(request({ givenName: 'Valentyna', familyName: 'Osadchenko' }), res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(mollieUpdate.mock.calls[0].arguments, ['cst_1', { name: 'Valentyna Osadchenko', email: 'payer@example.test' }]);
    assert.equal(updates[0].payerName, 'Valentyna Osadchenko');
});

test('a Mollie failure leaves the customer unchanged in the CRM and answers 502', async (t) => {
    const updates = stubCustomerStore(t);
    t.mock.method(console, 'error', () => {});
    t.mock.method(mollieService, 'updateCustomerById', async () => { throw new Error('Mollie is down'); });
    const res = response();

    await updateCustomerController(request({ familyName: 'Osadchenko' }), res);

    assert.equal(res.statusCode, 502);
    assert.equal(updates.length, 0);
});

test('updating an unknown customer answers 404 without calling Mollie', async (t) => {
    stubCustomerStore(t, null);
    const mollieUpdate = t.mock.method(mollieService, 'updateCustomerById', async () => ({}) as never);
    const res = response();

    await updateCustomerController(request({ familyName: 'Osadchenko' }), res);

    assert.equal(res.statusCode, 404);
    assert.equal(mollieUpdate.mock.callCount(), 0);
});
