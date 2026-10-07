import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { DraftContext } from './email-draft.types';
import { buildDraftBodyPrompt, formatCurrentDate } from './email-llm';
import { DEFAULT_PROMPT_CONTENT } from './email-prompts';
import { classified } from './rag-v2/rag-v2.testHelpers';
import type { QueryUnderstanding } from './rag-v2/rag-v2.types';

const now = new Date('2026-10-07T21:30:00.000Z');
const context: DraftContext = {
    email: { fromAddress: 'anna@example.test', subject: 'Question', normalizedBody: 'Is the Early Bird still on?' },
    classification: classified('pricing', { replyLanguage: 'ru' }), contact: null, knowledge: [],
};

test('the current date is given in the event time zone, readable and as an ISO date', () => {
    assert.equal(formatCurrentDate(now), 'Wednesday, 7 October 2026 (2026-10-07)');
    // 23:30 UTC is already the next day in Amsterdam.
    assert.equal(formatCurrentDate(new Date('2026-10-07T23:30:00.000Z')), 'Thursday, 8 October 2026 (2026-10-08)');
});

test('the reply prompt has the date and the reply language filled in', () => {
    const prompt = buildDraftBodyPrompt(DEFAULT_PROMPT_CONTENT.email_draft_body, context, now);
    assert.match(prompt, /Today is Wednesday, 7 October 2026 \(2026-10-07\)\./);
    assert.match(prompt, /Always reply in Russian\./);
    assert.doesNotMatch(prompt, /\{\{(current_date|replyLanguage)\}\}/);
});

test('a saved prompt places the date itself; one without the placeholder still gets it', () => {
    assert.match(buildDraftBodyPrompt('Date: {{current_date}}. Answer briefly.', context, now), /^Date: Wednesday, 7 October 2026 \(2026-10-07\)\. Answer briefly\./);
    assert.match(buildDraftBodyPrompt('Answer briefly.', context, now), /^Answer briefly\.\nToday is Wednesday, 7 October 2026 \(2026-10-07\)\./);
});

test('the built-in reply prompt places the email, thread, CRM data and knowledge in its own blocks', () => {
    const understanding: QueryUnderstanding = { language: 'ru', intent: 'pricing', secondaryIntents: [], needsReply: true, entities: { eventYear: null, ticketProduct: null }, eventYear: 2027, historical: false, asksAvailability: false, needsCRM: true, needsKnowledge: true, needsHumanAction: true, urgency: 'normal' };
    const prompt = buildDraftBodyPrompt(DEFAULT_PROMPT_CONTENT.email_draft_body, {
        ...context, email: { ...context.email, thread: '[2026-10-01 · customer] Earlier question' },
        ragV2: { understanding, knowledge: { rules: [], facts: [], faq: [], examples: [] }, characterBudget: 60_000, crmData: '{"payments":[]}', correction: 'it stated a price that is not in CURRENT FACTS' },
    }, now);

    assert.match(prompt, /<customer_email>\nIs the Early Bird still on\?\n<\/customer_email>/);
    assert.match(prompt, /<email_thread>\n\[2026-10-01 · customer\] Earlier question\n<\/email_thread>/);
    assert.match(prompt, /<crm_data>\n\{"payments":\[\]\}\n<\/crm_data>/);
    assert.match(prompt, /<knowledge>\nBUSINESS RULES\n\(none\)\n\nCURRENT FACTS \(authoritative\)\n\(none\)\n<\/knowledge>/);
    // Each block appears once, and only the per-email notes follow the prompt's own rulebook.
    assert.equal(prompt.split('<customer_email>').length, 2);
    assert.match(prompt, /REQUEST NOTES\n- Reply in Russian\.\n- The customer asks about event year 2027[\s\S]*needs staff action[\s\S]*CORRECTION: your previous draft was rejected/);
    assert.doesNotMatch(prompt, /\{\{|\nTASK\n/);
});
