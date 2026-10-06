import assert from 'node:assert/strict';
import test from 'node:test';
import { Locale } from '@mollie/api-client';
import {
    buildMollieWebhookDedupeKey,
    createCsv,
    getMollieTokenExpiresAt,
    getWebhookAttentionLevel,
    mapClientLanguageToMollieLocale,
    normalizePaymentStatus,
    parseIncidentKey,
} from './payments.utils.service';

test('webhook classifies paid, incident and neutral payment statuses', () => {
    assert.equal(getWebhookAttentionLevel('paid'), 'success');
    assert.equal(getWebhookAttentionLevel('charged_back'), 'attention');
    assert.equal(getWebhookAttentionLevel('chargeback'), 'attention');
    assert.equal(getWebhookAttentionLevel('pending'), 'info');
});

test('payment status normalizes Mollie chargeback aliases', () => {
    assert.equal(normalizePaymentStatus('chargeback'), 'charged_back');
    assert.equal(normalizePaymentStatus('charged_back'), 'charged_back');
    assert.equal(normalizePaymentStatus('paid'), 'paid');
});

test('client language maps to Mollie locale, RU omitted since Mollie has no ru_RU', () => {
    assert.equal(mapClientLanguageToMollieLocale('EN'), Locale.en_US);
    assert.equal(mapClientLanguageToMollieLocale('NL'), Locale.nl_NL);
    assert.equal(mapClientLanguageToMollieLocale('RU'), undefined);
    assert.equal(mapClientLanguageToMollieLocale(null), undefined);
    assert.equal(mapClientLanguageToMollieLocale(undefined), undefined);
});

test('webhook dedupe key changes only when the financial payment state changes', () => {
    const payment = {
        id: 'tr_test',
        status: 'paid',
        paidAt: '2026-06-13T10:00:00.000Z',
        amountRefunded: { value: '0.00' },
        amountChargedBack: { value: '0.00' },
    };

    assert.equal(buildMollieWebhookDedupeKey(payment), buildMollieWebhookDedupeKey({ ...payment }));
    assert.notEqual(
        buildMollieWebhookDedupeKey(payment),
        buildMollieWebhookDedupeKey({ ...payment, amountRefunded: { value: '10.00' } }),
    );
});

test('OAuth token expiration supports expires_in and absolute expires_at', () => {
    const now = Date.parse('2026-06-06T12:00:00.000Z');

    assert.equal(
        getMollieTokenExpiresAt({ expires_in: 1800 }, now).toISOString(),
        '2026-06-06T12:30:00.000Z',
    );
    assert.equal(
        getMollieTokenExpiresAt({ expires_at: '2026-06-06T13:00:00.000Z' }, now).toISOString(),
        '2026-06-06T13:00:00.000Z',
    );
});

test('incident keys are parsed only for supported incident types', () => {
    assert.deepEqual(parseIncidentKey('payment-42'), { incidentType: 'payment', sourceId: 42 });
    assert.deepEqual(parseIncidentKey('subscription-9'), { incidentType: 'subscription', sourceId: 9 });
    assert.equal(parseIncidentKey('invoice-42'), null);
});

test('CSV export escapes quotes, commas and includes UTF-8 BOM', () => {
    const csv = createCsv(['Name', 'Note'], [['Natasha', 'paid, "today"']]);

    assert.equal(csv, '\uFEFF"Name","Note"\n"Natasha","paid, ""today"""');
});
