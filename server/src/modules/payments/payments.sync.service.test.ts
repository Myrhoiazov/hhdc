import assert from 'node:assert/strict';
import test from 'node:test';
import axios from 'axios';
import prisma from '../../../prisma/prisma-client';
import * as mollieService from './payments.mollie.service';
import { telegramNotificationSettingsRepository } from '../communication/telegram/notification-settings.service';
import type { StoredTelegramNotificationSetting } from '../communication/telegram/notification-settings.types';
import {
    syncMollieCustomer,
    syncMollieCustomers,
    resolveSyncStatus,
    buildMandateUpsertArgs,
    buildSubscriptionUpsertArgs,
} from './payments.sync.service';

test('resolveSyncStatus is skipped when the Mollie record has no id', () => {
    assert.equal(resolveSyncStatus(null, new Set()), 'skipped');
    assert.equal(resolveSyncStatus(undefined, new Set(['mdt_1'])), 'skipped');
});

test('resolveSyncStatus is created when the id is not in the existing set', () => {
    assert.equal(resolveSyncStatus('mdt_1', new Set(['mdt_2'])), 'created');
});

test('resolveSyncStatus is updated when the id is already in the existing set', () => {
    assert.equal(resolveSyncStatus('mdt_1', new Set(['mdt_1', 'mdt_2'])), 'updated');
});

test('buildMandateUpsertArgs shapes a valid upsert for a new mandate', () => {
    const args = buildMandateUpsertArgs(7, {
        id: 'mdt_1',
        status: 'valid',
        method: 'directdebit',
        signatureDate: '2026-01-01',
        mandateReference: 'ref-1',
    } as never);

    assert.deepEqual(args.where, { mollieId: 'mdt_1' });
    assert.equal(args.create.customerId, 7);
    assert.equal(args.create.mollieId, 'mdt_1');
    assert.equal(args.create.mandateReference, 'ref-1');
    assert.equal(args.update.customerId, 7);
    assert.equal(args.update.status, 'valid');
});

test('buildMandateUpsertArgs falls back to null mandateReference on create, undefined on update', () => {
    const args = buildMandateUpsertArgs(1, {
        id: 'mdt_2',
        status: 'valid',
        method: 'directdebit',
        signatureDate: null,
        mandateReference: null,
    } as never);

    assert.equal(args.create.mandateReference, null);
    assert.equal(args.update.mandateReference, undefined);
});

test('buildSubscriptionUpsertArgs carries the resolved local mandate id', () => {
    const args = buildSubscriptionUpsertArgs(3, {
        id: 'sub_1',
        description: 'Monthly plan',
        amount: { value: '50.00', currency: 'EUR' },
        interval: '1 month',
        metadata: null,
        startDate: '2026-01-01',
        nextPaymentDate: '2026-02-01',
        status: 'active',
        times: null,
        mandateId: 'mdt_1',
    } as never, 42);

    assert.equal(args.create.mandateId, 42);
    assert.equal(args.update.mandateId, 42);
    assert.equal(args.create.customerId, 3);
    assert.equal(args.create.amountValue, '50.00');
});

test('buildSubscriptionUpsertArgs falls back to null/undefined mandateId when unresolved', () => {
    const args = buildSubscriptionUpsertArgs(3, {
        id: 'sub_2',
        description: 'No mandate',
        amount: { value: '10.00', currency: 'EUR' },
        interval: '1 month',
        metadata: null,
        startDate: null,
        nextPaymentDate: null,
        status: 'active',
        times: null,
        mandateId: null,
    } as never, null);

    assert.equal(args.create.mandateId, null);
    assert.equal(args.update.mandateId, undefined);
});

// Prisma delegates are proxies, so t.mock.method cannot wrap them; swap the method instead
// (same helper as clients.controller.test.ts).
function stub(t: test.TestContext, delegate: object, method: string, impl: (...args: any[]) => unknown) {
    const target = delegate as Record<string, unknown>;
    const original = target[method];
    target[method] = impl;
    t.after(() => { target[method] = original; });
}

type MollieCustomerStub = { id: string; name: string; email: string };

// The new-customer Telegram notification is switched on. Every Mollie customer is new to the
// CRM unless `existingCustomer` is given, in which case the sync finds and updates that row.
const stubCustomerSync = (t: test.TestContext, mollieCustomers: MollieCustomerStub[], existingCustomer: object | null = null) => {
    const previousEnv = { token: process.env.TELEGRAM_TOKEN, chat: process.env.TELEGRAM_CHAT_ID };
    process.env.TELEGRAM_TOKEN = 'token';
    process.env.TELEGRAM_CHAT_ID = 'chat-id';
    t.after(() => {
        process.env.TELEGRAM_TOKEN = previousEnv.token;
        process.env.TELEGRAM_CHAT_ID = previousEnv.chat;
        if (previousEnv.token === undefined) delete process.env.TELEGRAM_TOKEN;
        if (previousEnv.chat === undefined) delete process.env.TELEGRAM_CHAT_ID;
    });
    let nextId = 1;
    t.mock.method(mollieService, 'getAllCustomers', async () => mollieCustomers as never);
    stub(t, prisma.client, 'findFirst', async () => null);
    stub(t, prisma.customer, 'findFirst', async () => existingCustomer);
    stub(t, prisma.customer, 'update', async () => existingCustomer);
    stub(t, prisma.customer, 'create', async () => ({ id: nextId++ }));
    t.mock.method(telegramNotificationSettingsRepository, 'findByKey', async (key: string): Promise<StoredTelegramNotificationSetting> => (
        { key, enabled: true, updatedAt: new Date(), updatedBy: null }
    ));
    return t.mock.method(axios, 'post', async () => ({ data: {} }));
};

const mollieCustomer = (index: number) => ({ id: `cst_${index}`, name: `Payer ${index}`, email: `payer${index}@example.test` });
const flushNotifications = () => new Promise((resolve) => setImmediate(resolve));
const sentText = (postMock: { mock: { calls: Array<{ arguments: unknown[] }> } }, index: number) => (
    (postMock.mock.calls[index].arguments[1] as { text: string }).text
);

test('syncMollieCustomers announces each new customer when a run creates up to three', async (t) => {
    const postMock = stubCustomerSync(t, [mollieCustomer(1), mollieCustomer(2)]);

    const result = await syncMollieCustomers();
    await flushNotifications();

    assert.equal(result.created, 2);
    assert.equal(postMock.mock.callCount(), 2);
    assert.match(sentText(postMock, 0), /Payer 1/);
    assert.match(sentText(postMock, 0), /синхронизация с Mollie/);
});

test('syncMollieCustomers sends one summary when a run creates more than three customers', async (t) => {
    const postMock = stubCustomerSync(t, [1, 2, 3, 4, 5].map(mollieCustomer));

    const result = await syncMollieCustomers();
    await flushNotifications();

    assert.equal(result.created, 5);
    assert.equal(postMock.mock.callCount(), 1);
    assert.match(sentText(postMock, 0), /5/);
});

test('syncMollieCustomers announces nothing when the run only updates existing customers', async (t) => {
    const postMock = stubCustomerSync(t, [mollieCustomer(1)], { id: 9, payerRelation: 'unknown', linkSource: 'unlinked' });

    const result = await syncMollieCustomers();
    await flushNotifications();

    assert.equal(result.updated, 1);
    assert.equal(postMock.mock.callCount(), 0);
});

test('syncMollieCustomer announces a single customer created outside a full run', async (t) => {
    const postMock = stubCustomerSync(t, []);

    assert.equal(await syncMollieCustomer(mollieCustomer(7) as never), 'created');
    await flushNotifications();

    assert.equal(postMock.mock.callCount(), 1);
    assert.match(sentText(postMock, 0), /Payer 7/);
});
