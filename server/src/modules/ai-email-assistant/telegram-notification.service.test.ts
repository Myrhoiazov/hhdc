import assert from 'node:assert/strict';
import test from 'node:test';
import { buildDraftApprovalNotification } from './telegram-notification.service';

test('draft notification escapes content and uses version-bound action buttons', () => {
    const notification = buildDraftApprovalNotification({
        draftId: 8, version: 4, sender: 'a<b>@example.com', subject: '<script>', body: 'Hello & welcome',
        language: 'en', intent: 'pricing', contactName: null,
        knowledgeSourceUrls: ['https://example.com/faq'], needsManualAnswer: true,
    });
    assert.match(notification.text, /a&lt;b&gt;@example.com/);
    assert.match(notification.text, /&lt;script&gt;/);
    assert.match(notification.text, /Hello &amp; welcome/);
    assert.equal(notification.inlineKeyboard[0][0].callback_data, 'ai:draft:8:4:approve');
    assert.equal(notification.inlineKeyboard[1][1].callback_data, 'ai:draft:8:4:spam');
});

const BASE = { draftId: 8, version: 1, sender: 'p@example.com', subject: 'Вопрос', body: 'Добрый день!', language: 'ru', intent: 'registration / teenager_location', contactName: null as string | null, needsManualAnswer: false };

test('v1 notifications keep the original layout (no Sources/Warnings block)', () => {
    const { text } = buildDraftApprovalNotification({ ...BASE, knowledgeSourceUrls: ['https://example.com/faq'] });
    assert.match(text, /<b>Источники:<\/b>\n• https:\/\/example.com\/faq$/);
    assert.doesNotMatch(text, /Warnings/);
});

test('v2 notifications list knowledge document ids and warnings, never raw chunks', () => {
    const clean = buildDraftApprovalNotification({ ...BASE, knowledgeSourceUrls: [], sources: ['location_rotterdam', 'schedule_current'], warnings: [] }).text;
    assert.match(clean, /<b>Язык \/ intent:<\/b> ru \/ registration \/ teenager_location/);
    assert.match(clean, /<b>Sources:<\/b>\n• location_rotterdam\n• schedule_current\n<b>Warnings:<\/b>\nnone$/);
    const flagged = buildDraftApprovalNotification({ ...BASE, knowledgeSourceUrls: [], sources: [], warnings: ['unsupported_availability:места есть', 'staff_confirmation_topic'], needsManualAnswer: true }).text;
    assert.match(flagged, /<b>Manual review:<\/b> да/);
    assert.match(flagged, /<b>Sources:<\/b>\n—\n<b>Warnings:<\/b>\n• unsupported_availability:места есть\n• staff_confirmation_topic$/);
});
