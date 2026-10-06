import assert from 'node:assert/strict';
import test from 'node:test';
import { ClientLanguage } from '@prisma/client';
import {
    DEFAULT_REMINDER_TEMPLATES,
    ReminderTemplate,
    StudioInfo,
    buildReminderEmail,
    renderReminderTemplate,
    wrapReminderEmailHtml,
} from './payment-reminders.content.service';

const studio: StudioInfo = {
    name: 'DDC Studio',
    email: 'info@ddc.example',
    website: 'https://ddc.example',
    logoUrl: 'https://ddc.example/logo.png',
    legalLine: 'DDC Studio B.V., KVK 12345678',
};

const template: ReminderTemplate = {
    subject: 'Reminder for {{clientName}} — {{date}}',
    bodyHtml: '<p>{{clientName}} owes {{amount}} on {{date}}</p>',
};

test('renderReminderTemplate substitutes clientName, amount and date', () => {
    const result = renderReminderTemplate(template, ClientLanguage.EN, {
        clientName: 'Ada Lovelace',
        amountValue: '42.50',
        currency: 'EUR',
        paymentDate: new Date('2026-09-15T00:00:00.000Z'),
        studio,
    });

    assert.equal(result.subject, 'Reminder for Ada Lovelace — September 15, 2026');
    assert.equal(result.bodyHtml, '<p>Ada Lovelace owes €42.50 on September 15, 2026</p>');
});

test('renderReminderTemplate formats amount and date per language locale', () => {
    const data = {
        clientName: 'Ivan',
        amountValue: '10',
        currency: 'EUR',
        paymentDate: new Date('2026-01-05T00:00:00.000Z'),
        studio,
    };

    const ru = renderReminderTemplate(template, ClientLanguage.RU, data);
    const nl = renderReminderTemplate(template, ClientLanguage.NL, data);

    assert.match(ru.bodyHtml, /5 января 2026 г\./);
    assert.match(nl.bodyHtml, /5 januari 2026/);
});

test('renderReminderTemplate HTML-escapes the client name to prevent injection', () => {
    const result = renderReminderTemplate(template, ClientLanguage.EN, {
        clientName: '<script>alert(1)</script>',
        amountValue: '10',
        currency: 'EUR',
        paymentDate: new Date('2026-01-05T00:00:00.000Z'),
        studio,
    });

    assert.doesNotMatch(result.bodyHtml, /<script>/);
    assert.match(result.bodyHtml, /&lt;script&gt;/);
});

test('renderReminderTemplate replaces an unknown placeholder with an empty string', () => {
    const result = renderReminderTemplate(
        { subject: 'Hi {{unknownPlaceholder}}', bodyHtml: '' },
        ClientLanguage.EN,
        {
            clientName: 'Ivan',
            amountValue: '10',
            currency: 'EUR',
            paymentDate: new Date('2026-01-05T00:00:00.000Z'),
            studio,
        },
    );

    assert.equal(result.subject, 'Hi ');
});

test('wrapReminderEmailHtml includes logo, email, website and legal line when present', () => {
    const html = wrapReminderEmailHtml(ClientLanguage.EN, '<p>body</p>', studio);

    assert.match(html, /<img src="https:\/\/ddc\.example\/logo\.png"/);
    assert.match(html, /info@ddc\.example/);
    assert.match(html, /href="https:\/\/ddc\.example"/);
    assert.match(html, /DDC Studio B\.V\., KVK 12345678/);
    assert.match(html, /Kind regards,/);
});

test('wrapReminderEmailHtml omits logo, email, website and legal line when absent', () => {
    const bareStudio: StudioInfo = { name: 'DDC Studio', email: '', website: '', logoUrl: '', legalLine: '' };
    const html = wrapReminderEmailHtml(ClientLanguage.EN, '<p>body</p>', bareStudio);

    assert.doesNotMatch(html, /<img/);
    assert.doesNotMatch(html, /✉️/);
    assert.doesNotMatch(html, /🌐/);
    assert.doesNotMatch(html, /border-top/);
});

test('wrapReminderEmailHtml HTML-escapes studio fields to prevent injection', () => {
    const maliciousStudio: StudioInfo = {
        name: '<img src=x onerror=alert(1)>',
        email: '',
        website: '',
        logoUrl: '',
        legalLine: '',
    };
    const html = wrapReminderEmailHtml(ClientLanguage.EN, '<p>body</p>', maliciousStudio);

    assert.doesNotMatch(html, /<img src=x onerror/);
    assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
});

test('wrapReminderEmailHtml uses the Russian signature for RU and falls back to it for unmapped languages', () => {
    const ru = wrapReminderEmailHtml(ClientLanguage.RU, '<p>body</p>', studio);
    assert.match(ru, /С уважением,/);
});

test('buildReminderEmail uses the default template for the given language when no custom template is provided', () => {
    const { subject, html } = buildReminderEmail(ClientLanguage.EN, {
        clientName: 'Ada',
        amountValue: '10',
        currency: 'EUR',
        paymentDate: new Date('2026-01-05T00:00:00.000Z'),
        studio,
    });

    assert.match(subject, /Payment reminder for your subscription/);
    assert.match(html, /Hello Ada,/);
});

test('buildReminderEmail uses the custom template when provided, overriding the default', () => {
    const { subject, html } = buildReminderEmail(
        ClientLanguage.EN,
        {
            clientName: 'Ada',
            amountValue: '10',
            currency: 'EUR',
            paymentDate: new Date('2026-01-05T00:00:00.000Z'),
            studio,
        },
        { subject: 'Custom subject for {{clientName}}', bodyHtml: '<p>Custom body</p>' },
    );

    assert.equal(subject, 'Custom subject for Ada');
    assert.match(html, /Custom body/);
    assert.doesNotMatch(html, /Hello Ada,/);
});

test('DEFAULT_REMINDER_TEMPLATES has a template for every supported language', () => {
    for (const lang of Object.values(ClientLanguage)) {
        assert.ok(DEFAULT_REMINDER_TEMPLATES[lang], `missing default template for ${lang}`);
    }
});
