import assert from 'node:assert/strict';
import test from 'node:test';
import axios from 'axios';
import prisma from '../../../prisma/prisma-client';
import { deleteClient, normalizeClientData } from './clients.service';
import { telegramNotificationSettingsRepository } from '../communication/telegram/notification-settings.service';
import type { StoredTelegramNotificationSetting } from '../communication/telegram/notification-settings.types';

test('strips protected/computed fields to prevent mass-assignment', () => {
    const result = normalizeClientData({
        id: 99,
        status: 'ACTIVE',
        createdAt: new Date('2020-01-01'),
        expiresAt: new Date('2026-01-01'),
        image_3d: true,
        document: true,
        anamnesis: 'peanut allergy',
        description: 'internal note',
        firstName: 'Ada',
    } as never);

    assert.equal('id' in result, false);
    assert.equal('status' in result, false);
    assert.equal('createdAt' in result, false);
    assert.equal('expiresAt' in result, false);
    assert.equal('image_3d' in result, false);
    assert.equal('document' in result, false);
    assert.equal('anamnesis' in result, false);
    assert.equal('description' in result, false);
    assert.equal(result.firstName, 'Ada');
});

test('normalizes a valid positive branchId string to a number', () => {
    const result = normalizeClientData({ branchId: '3' } as never);
    assert.equal(result.branchId, 3);
});

test('normalizes an invalid, zero, or negative branchId to null', () => {
    assert.equal(normalizeClientData({ branchId: '0' } as never).branchId, null);
    assert.equal(normalizeClientData({ branchId: '-5' } as never).branchId, null);
    assert.equal(normalizeClientData({ branchId: 'not-a-number' } as never).branchId, null);
});

test('leaves branchId untouched when not present in the payload', () => {
    const result = normalizeClientData({ firstName: 'Ada' } as never);
    assert.equal('branchId' in result, false);
});

test('trims whitespace from string fields', () => {
    const result = normalizeClientData({
        firstName: '  Ada  ',
        lastName: '  Lovelace ',
        phoneNumber: ' +31 6 12345678 ',
    } as never);

    assert.equal(result.firstName, 'Ada');
    assert.equal(result.lastName, 'Lovelace');
    assert.equal(result.phoneNumber, '+31 6 12345678');
});

test('normalizes an empty or whitespace-only string field to null', () => {
    const result = normalizeClientData({ email: '   ' } as never);
    assert.equal(result.email, null);
});

test('leaves a string field untouched when not present in the payload', () => {
    const result = normalizeClientData({ firstName: 'Ada' } as never);
    assert.equal('lastName' in result, false);
});

// Telegram is configured and the student-deleted notification is switched on.
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

const stubClientDelete = (t: test.TestContext, impl: () => Promise<unknown>) => {
    const delegate = prisma.client as unknown as Record<string, unknown>;
    const original = delegate.delete;
    delegate.delete = impl;
    t.after(() => { delegate.delete = original; });
};

const flushNotifications = () => new Promise((resolve) => setImmediate(resolve));

test('deleteClient announces the deleted student with the branch and the employee', async (t) => {
    const postMock = mockTelegram(t);
    stubClientDelete(t, async () => ({ id: 55, firstName: 'Anna', lastName: 'Jansen', branch: { name: 'Arnhem' } }));

    const deleted = await deleteClient(55, { deletedByEmail: 'manager@example.test' });
    await flushNotifications();

    assert.equal(deleted.id, 55);
    const { text } = postMock.mock.calls[0].arguments[1] as { text: string };
    assert.match(text, /Ученик удалён[\s\S]*Anna Jansen[\s\S]*Arnhem[\s\S]*manager@example\.test/);
});

test('deleteClient announces nothing when the deletion fails', async (t) => {
    const postMock = mockTelegram(t);
    stubClientDelete(t, async () => { throw new Error('Record to delete does not exist'); });

    await assert.rejects(deleteClient(55));
    await flushNotifications();

    assert.equal(postMock.mock.callCount(), 0);
});
