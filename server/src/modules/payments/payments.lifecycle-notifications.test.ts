import assert from 'node:assert/strict';
import test from 'node:test';
import axios from 'axios';
import type { Request, Response } from 'express';
import { fromPartial } from '@total-typescript/shoehorn';
import prisma from '../../../prisma/prisma-client';
import * as mollieService from './payments.mollie.service';
import {
    deleteCustomerController,
    mollieCreateMandateController,
    mollieCreateMandateSubscriptionController,
    mollieDeleteSubscriptionByIdController,
    mollieRestartSubscriptionController,
    mollieRevokeMandateController,
    mollieUpdateSubscriptionController,
} from './payments.controller';
import { syncMollieMandates, syncMollieSubscriptions } from './payments.sync.service';
import { telegramNotificationSettingsRepository } from '../communication/telegram/notification-settings.service';
import type { StoredTelegramNotificationSetting } from '../communication/telegram/notification-settings.types';

const FUTURE_DATE = '2099-01-01';
const actor = { id: 7, email: 'manager@example.test' };
const localCustomer = { id: 1, mollieId: 'cst_1', payerName: 'Payer One' };
const mollieSubscription = {
    id: 'sub_new',
    mandateId: 'mdt_1',
    amount: { value: '45.00', currency: 'EUR' },
    interval: '1 month',
    startDate: FUTURE_DATE,
    description: 'Hip-hop',
    status: 'active',
};
const localSubscription = {
    id: 11,
    mollieId: 'sub_1',
    customerId: 1,
    amountValue: '45.00',
    amountCurrency: 'EUR',
    interval: '1 month',
    startDate: new Date('2026-01-01T00:00:00Z'),
    nextPaymentDate: new Date('2026-12-01T00:00:00Z'),
    description: 'Hip-hop',
    customer: localCustomer,
};

function stub(t: test.TestContext, delegate: object, method: string, impl: (...args: any[]) => unknown) {
    const target = delegate as Record<string, unknown>;
    const original = target[method];
    target[method] = impl;
    t.after(() => { target[method] = original; });
}

// Telegram is configured and every notification type is switched on.
const mockTelegram = (t: test.TestContext) => {
    const previousEnv = { token: process.env.TELEGRAM_TOKEN, chat: process.env.TELEGRAM_CHAT_ID };
    process.env.TELEGRAM_TOKEN = 'token';
    process.env.TELEGRAM_CHAT_ID = 'chat-id';
    t.after(() => {
        process.env.TELEGRAM_TOKEN = previousEnv.token;
        process.env.TELEGRAM_CHAT_ID = previousEnv.chat;
        if (previousEnv.token === undefined) delete process.env.TELEGRAM_TOKEN;
        if (previousEnv.chat === undefined) delete process.env.TELEGRAM_CHAT_ID;
    });
    t.mock.method(telegramNotificationSettingsRepository, 'findByKey', async (key: string): Promise<StoredTelegramNotificationSetting> => (
        { key, enabled: true, updatedAt: new Date(), updatedBy: null }
    ));
    return t.mock.method(axios, 'post', async () => ({ data: {} }));
};

const response = () => {
    const res: Response = fromPartial({
        statusCode: 200,
        status(code: number) { this.statusCode = code; return this; },
        json() { return this; },
    });
    return res;
};

const request = (params: Record<string, string>, body: unknown = {}): Request => fromPartial({ params, body, user: actor });
const flushNotifications = () => new Promise((resolve) => setImmediate(resolve));
const sentTexts = (postMock: { mock: { calls: Array<{ arguments: unknown[] }> } }) => (
    postMock.mock.calls.map((call) => (call.arguments[1] as { text: string }).text)
);

const stubSubscriptionSave = (t: test.TestContext) => {
    stub(t, prisma.mandate, 'findUnique', async () => ({ id: 3 }));
    stub(t, prisma.subscription, 'findUnique', async () => null);
    stub(t, prisma.subscription, 'upsert', async () => ({}));
};

test('deleting a Mollie customer announces the payer and the employee', async (t) => {
    const postMock = mockTelegram(t);
    stub(t, prisma.customer, 'findUnique', async () => localCustomer);
    stub(t, prisma.mandate, 'count', async () => 0);
    stub(t, prisma.subscription, 'count', async () => 0);
    stub(t, prisma, '$transaction', async () => [0, 0, 0, 0, 0, { id: 1 }]);
    t.mock.method(mollieService, 'deleteCustomerById', async () => true as never);
    const res = response();

    await deleteCustomerController(request({ customerId: '1' }), res);
    await flushNotifications();

    assert.equal(res.statusCode, 200);
    assert.match(sentTexts(postMock)[0], /Клиент Mollie удалён[\s\S]*Payer One[\s\S]*manager@example\.test/);
});

test('a blocked Mollie customer deletion announces nothing', async (t) => {
    const postMock = mockTelegram(t);
    stub(t, prisma.customer, 'findUnique', async () => localCustomer);
    stub(t, prisma.mandate, 'count', async () => 1);
    stub(t, prisma.subscription, 'count', async () => 0);
    const res = response();

    await deleteCustomerController(request({ customerId: '1' }), res);
    await flushNotifications();

    assert.equal(res.statusCode, 409);
    assert.equal(postMock.mock.callCount(), 0);
});

test('creating a mandate in the CRM announces it without the IBAN', async (t) => {
    const postMock = mockTelegram(t);
    const savedMandate = { mollieId: 'mdt_1', status: 'valid', method: 'directdebit' };
    stub(t, prisma.customer, 'findUnique', async () => localCustomer);
    stub(t, prisma.mandate, 'findUnique', async () => savedMandate);
    stub(t, prisma.mandate, 'upsert', async () => savedMandate);
    t.mock.method(mollieService, 'createMandate', async () => ({ id: 'mdt_1', status: 'valid', method: 'directdebit' }) as never);
    const res = response();

    await mollieCreateMandateController(request({}, {
        customerId: 'cst_1',
        consumerName: 'Payer One',
        consumerAccount: 'NL91ABNA0417164300',
        signatureDate: '2026-01-01',
    }) as never, res);
    await flushNotifications();

    assert.equal(res.statusCode, 201);
    const [text] = sentTexts(postMock);
    assert.match(text, /Мандат Mollie создан[\s\S]*Payer One[\s\S]*создан в CRM[\s\S]*manager@example\.test/);
    assert.doesNotMatch(text, /NL91ABNA/);
});

test('revoking a mandate announces it with the number of cancelled subscriptions', async (t) => {
    const postMock = mockTelegram(t);
    stub(t, prisma.mandate, 'findFirst', async () => ({ id: 3, mollieId: 'mdt_1', method: 'directdebit', customer: localCustomer }));
    stub(t, prisma, '$transaction', async () => [{}, { count: 2 }]);
    t.mock.method(mollieService, 'getMandateById', async () => ({ status: 'valid' }) as never);
    t.mock.method(mollieService, 'revokeMandateById', async () => true as never);
    const res = response();

    await mollieRevokeMandateController(request({ customerId: '1', mandateId: 'mdt_1' }), res);
    await flushNotifications();

    assert.equal(res.statusCode, 200);
    assert.match(sentTexts(postMock)[0], /Мандат Mollie отозван[\s\S]*Payer One[\s\S]*Отменено подписок:<\/b> 2/);
});

test('reconciling a mandate that Mollie already invalidated announces nothing', async (t) => {
    const postMock = mockTelegram(t);
    stub(t, prisma.mandate, 'findFirst', async () => ({ id: 3, mollieId: 'mdt_1', method: 'directdebit', customer: localCustomer }));
    stub(t, prisma.mandate, 'update', async () => ({}));
    t.mock.method(mollieService, 'getMandateById', async () => ({ status: 'invalid' }) as never);

    await mollieRevokeMandateController(request({ customerId: '1', mandateId: 'mdt_1' }), response());
    await flushNotifications();

    assert.equal(postMock.mock.callCount(), 0);
});

test('creating a subscription in the CRM announces amount, interval and start date', async (t) => {
    const postMock = mockTelegram(t);
    stub(t, prisma.customer, 'findUnique', async () => ({ ...localCustomer, mandates: [{ id: 3 }] }));
    stubSubscriptionSave(t);
    t.mock.method(mollieService, 'createMandateSubscription', async () => mollieSubscription as never);
    const res = response();

    await mollieCreateMandateSubscriptionController(request({ customerId: 'cst_1' }, {
        mandateId: 'mdt_1',
        amount: { value: '45.00' },
        interval: '1 month',
        startDate: FUTURE_DATE,
        description: 'Hip-hop',
    }), res);
    await flushNotifications();

    assert.equal(res.statusCode, 201);
    assert.match(sentTexts(postMock)[0], /Подписка Mollie создана[\s\S]*Payer One[\s\S]*45\.00 EUR[\s\S]*1 month[\s\S]*2099-01-01/);
});

test('cancelling a subscription announces it', async (t) => {
    const postMock = mockTelegram(t);
    stub(t, prisma.subscription, 'findFirst', async () => localSubscription);
    stub(t, prisma.subscription, 'update', async () => ({}));
    t.mock.method(mollieService, 'deleteSubscriptionById', async () => ({ status: 'canceled' }) as never);
    const res = response();

    await mollieDeleteSubscriptionByIdController(request({ subscriptionId: 'sub_1' }, { customerId: 1 }), res);
    await flushNotifications();

    assert.equal(res.statusCode, 200);
    assert.match(sentTexts(postMock)[0], /Подписка Mollie отменена[\s\S]*Payer One[\s\S]*45\.00 EUR[\s\S]*manager@example\.test/);
});

test('restarting a subscription announces it as restarted', async (t) => {
    const postMock = mockTelegram(t);
    stub(t, prisma.subscription, 'findFirst', async () => localSubscription);
    stub(t, prisma.mandate, 'findFirst', async () => ({ id: 3 }));
    stubSubscriptionSave(t);
    t.mock.method(mollieService, 'createMandateSubscription', async () => mollieSubscription as never);
    const res = response();

    await mollieRestartSubscriptionController(
        request({ subscriptionId: 'sub_1' }, { customerId: 1, mandateId: 'mdt_1', startDate: FUTURE_DATE }),
        res,
    );
    await flushNotifications();

    assert.equal(res.statusCode, 201);
    assert.match(sentTexts(postMock)[0], /Подписка Mollie перезапущена[\s\S]*Payer One/);
});

test('editing a subscription by replacing it on Mollie announces neither a cancellation nor a creation', async (t) => {
    const postMock = mockTelegram(t);
    stub(t, prisma.subscription, 'findFirst', async () => localSubscription);
    stub(t, prisma.mandate, 'findFirst', async () => ({ id: 3 }));
    stub(t, prisma.subscription, 'update', async () => ({}));
    stubSubscriptionSave(t);
    t.mock.method(mollieService, 'deleteSubscriptionById', async () => ({ status: 'canceled' }) as never);
    t.mock.method(mollieService, 'createMandateSubscription', async () => mollieSubscription as never);
    const res = response();

    await mollieUpdateSubscriptionController(request({ subscriptionId: 'sub_1' }, {
        customerId: 1,
        mandateId: 'mdt_1',
        amountValue: 45,
        interval: '1 month',
        startDate: FUTURE_DATE,
        description: 'Hip-hop',
    }), res);
    await flushNotifications();

    assert.equal(res.statusCode, 201);
    assert.equal(postMock.mock.callCount(), 0);
});

const stubMandateSync = (t: test.TestContext, mandateCount: number, existingMollieIds: string[] = []) => {
    const mandates = Array.from({ length: mandateCount }, (_, index) => ({ id: `mdt_${index + 1}`, status: 'valid', method: 'directdebit' }));
    stub(t, prisma.customer, 'findMany', async () => [localCustomer]);
    stub(t, prisma.mandate, 'findMany', async () => existingMollieIds.map((mollieId) => ({ mollieId })));
    stub(t, prisma.mandate, 'upsert', async () => ({}));
    t.mock.method(mollieService, 'getMandateByCustomerId', async () => mandates as never);
};

test('syncMollieMandates announces each mandate that is new to the CRM, naming the sync as the source', async (t) => {
    const postMock = mockTelegram(t);
    stubMandateSync(t, 2, ['mdt_1']);

    const result = await syncMollieMandates();
    await flushNotifications();

    assert.equal(result.created, 1);
    const texts = sentTexts(postMock);
    assert.equal(texts.length, 1);
    assert.match(texts[0], /Мандат Mollie создан[\s\S]*Payer One[\s\S]*синхронизация с Mollie/);
});

test('syncMollieMandates sends one summary when a run brings more than three new mandates', async (t) => {
    const postMock = mockTelegram(t);
    stubMandateSync(t, 5);

    await syncMollieMandates();
    await flushNotifications();

    const texts = sentTexts(postMock);
    assert.equal(texts.length, 1);
    assert.match(texts[0], /Новые мандаты Mollie[\s\S]*5/);
});

test('syncMollieSubscriptions announces a subscription that is new to the CRM and skips known ones', async (t) => {
    const postMock = mockTelegram(t);
    stub(t, prisma.customer, 'findMany', async () => [localCustomer]);
    stub(t, prisma.subscription, 'findMany', async () => [{ mollieId: 'sub_known' }]);
    stub(t, prisma.mandate, 'findMany', async () => [{ id: 3, mollieId: 'mdt_1' }]);
    stub(t, prisma.subscription, 'upsert', async () => ({}));
    t.mock.method(mollieService, 'getSubscriptionsByCustomerId', async () => [
        mollieSubscription,
        { ...mollieSubscription, id: 'sub_known' },
    ] as never);

    const result = await syncMollieSubscriptions();
    await flushNotifications();

    assert.equal(result.created, 1);
    const texts = sentTexts(postMock);
    assert.equal(texts.length, 1);
    assert.match(texts[0], /Подписка Mollie создана[\s\S]*45\.00 EUR[\s\S]*синхронизация с Mollie/);
});
