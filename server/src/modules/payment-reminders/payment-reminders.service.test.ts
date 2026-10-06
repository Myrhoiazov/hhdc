import assert from 'node:assert/strict';
import test from 'node:test';
import { ClientLanguage } from '@prisma/client';
import {
    computeReminderWindow, isMandateEligibleForReminder, isUniqueConstraintViolation, resolveReminderLanguage,
} from './payment-reminders.service';
import { buildReminderEmail, renderReminderTemplate } from './payment-reminders.content.service';

test('reminder window covers today through today+offsetDays, day-inclusive', () => {
    const now = new Date(2026, 7, 5, 14, 30, 0);

    const threeDay = computeReminderWindow(3, now);
    assert.equal(threeDay.windowStart.toDateString(), new Date(2026, 7, 5).toDateString());
    assert.equal(threeDay.windowEnd.toDateString(), new Date(2026, 7, 8).toDateString());
    assert.equal(threeDay.windowStart.getHours(), 0);
    assert.equal(threeDay.windowEnd.getHours(), 23);

    const sevenDay = computeReminderWindow(7, now);
    assert.equal(sevenDay.windowEnd.toDateString(), new Date(2026, 7, 12).toDateString());
});

test('only a valid (non-invalid) mandate is eligible for a reminder', () => {
    assert.equal(isMandateEligibleForReminder('valid'), true);
    assert.equal(isMandateEligibleForReminder('pending'), true);
    assert.equal(isMandateEligibleForReminder(undefined), true);
    assert.equal(isMandateEligibleForReminder(null), true);
    assert.equal(isMandateEligibleForReminder('invalid'), false);
});

test('unique constraint violations are recognized so duplicate reminders are skipped, not thrown', () => {
    assert.equal(isUniqueConstraintViolation(new Error('some other db error')), false);
    assert.equal(isUniqueConstraintViolation(null), false);
});

test('resolveReminderLanguage prefers the Mollie customer language over the linked client', () => {
    assert.equal(resolveReminderLanguage(ClientLanguage.NL, ClientLanguage.EN), ClientLanguage.NL);
});

test('resolveReminderLanguage falls back to the client language when the customer has none', () => {
    assert.equal(resolveReminderLanguage(null, ClientLanguage.EN), ClientLanguage.EN);
});

test('resolveReminderLanguage falls back to Russian when neither customer nor client has a language', () => {
    assert.equal(resolveReminderLanguage(null, null), ClientLanguage.RU);
    assert.equal(resolveReminderLanguage(undefined, undefined), ClientLanguage.RU);
});

const sampleStudio = {
    name: 'Talent Center DDC',
    email: 'info@talentcenterddc.nl',
    website: 'https://talentcenterddc.nl/',
    logoUrl: 'https://hhdc.denys-myr.com/upload/brands/logo.png',
    legalLine: 'Talent Center DDC · KVK 90720814',
};

test('reminder email is built per language with no payment link (auto-debit, informational only)', () => {
    const paymentDate = new Date(2026, 7, 8);
    const base = { clientName: 'Иван', amountValue: '80.00', currency: 'EUR', paymentDate, studio: sampleStudio };

    const ru = buildReminderEmail('RU', base);
    assert.match(ru.subject, /Напоминание/);
    assert.doesNotMatch(ru.html, /pay|оплатить|Pay with/i);

    const en = buildReminderEmail('EN', { ...base, clientName: 'John' });
    assert.match(en.subject, /Payment reminder/);
    assert.match(en.html, /John/);

    const nl = buildReminderEmail('NL', { ...base, clientName: 'Jan' });
    assert.match(nl.subject, /Betalingsherinnering/);
    assert.match(nl.html, /Jan/);
});

test('reminder email is signed with the studio name, logo, website, contact and legal line', () => {
    const paymentDate = new Date(2026, 7, 8);
    const result = buildReminderEmail('EN', {
        clientName: 'John', amountValue: '80.00', currency: 'EUR', paymentDate, studio: sampleStudio,
    });

    assert.match(result.html, /Talent Center DDC/);
    assert.match(result.html, /<img src="https:\/\/hhdc\.denys-myr\.com\/upload\/brands\/logo\.png"/);
    assert.match(result.html, /href="https:\/\/talentcenterddc\.nl\/"/);
    assert.match(result.html, /info@talentcenterddc\.nl/);
    assert.match(result.html, /KVK 90720814/);
});

test('a studio without a logo renders no broken image tag', () => {
    const paymentDate = new Date(2026, 7, 8);
    const result = buildReminderEmail('EN', {
        clientName: 'John',
        amountValue: '80.00',
        currency: 'EUR',
        paymentDate,
        studio: { ...sampleStudio, logoUrl: '' },
    });

    assert.doesNotMatch(result.html, /<img/);
});

test('unknown language falls back to Russian copy', () => {
    const paymentDate = new Date(2026, 7, 8);
    // @ts-expect-error deliberately passing an invalid language to check the fallback
    const result = buildReminderEmail('XX', { clientName: 'Test', amountValue: '10.00', currency: 'EUR', paymentDate, studio: sampleStudio });
    assert.match(result.subject, /Напоминание/);
});

test('an admin-edited custom template overrides the built-in copy and substitutes placeholders', () => {
    const paymentDate = new Date(2026, 7, 8);
    const customTemplate = {
        subject: 'Custom subject for {{clientName}} — {{date}}',
        bodyHtml: '<p>Pay {{amount}} by {{date}}, {{clientName}}.</p>',
    };

    const result = buildReminderEmail('EN', {
        clientName: 'Alice',
        amountValue: '42.50',
        currency: 'EUR',
        paymentDate,
        studio: sampleStudio,
    }, customTemplate);

    assert.equal(result.subject, 'Custom subject for Alice — August 8, 2026');
    assert.match(result.html, /Pay €42\.50 by August 8, 2026, Alice\./);
});

test('template rendering escapes client name to prevent HTML injection from a stored name', () => {
    const paymentDate = new Date(2026, 7, 8);
    const result = renderReminderTemplate(
        { subject: 'Hi {{clientName}}', bodyHtml: '<p>{{clientName}}</p>' },
        'EN',
        { clientName: '<script>alert(1)</script>', amountValue: '10.00', currency: 'EUR', paymentDate, studio: sampleStudio },
    );

    assert.doesNotMatch(result.bodyHtml, /<script>/);
    assert.match(result.bodyHtml, /&lt;script&gt;/);
});

test('logo, signature and legal line survive even when the message body is edited (they are never routed through the rich-text editor)', () => {
    const paymentDate = new Date(2026, 7, 8);
    const editedTemplate = {
        subject: 'Edited subject {{date}}',
        // Simulates what a Tiptap round-trip actually produces: plain paragraphs only,
        // no outer div/img — the letterhead must still show up because it's added separately.
        bodyHtml: '<p>Custom edited message for {{clientName}}.</p>',
    };

    const result = buildReminderEmail('RU', {
        clientName: 'Иван', amountValue: '80.00', currency: 'EUR', paymentDate, studio: sampleStudio,
    }, editedTemplate);

    assert.match(result.html, /Custom edited message for Иван\./);
    assert.match(result.html, /<img src="https:\/\/hhdc\.denys-myr\.com\/upload\/brands\/logo\.png"/);
    assert.match(result.html, /Talent Center DDC/);
    assert.match(result.html, /KVK 90720814/);
});
