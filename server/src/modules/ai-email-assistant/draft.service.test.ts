import assert from 'node:assert/strict';
import test from 'node:test';
import { generateEmailDraft, type DraftContext } from './draft.service';

const email = { fromAddress: 'person@example.com', subject: 'Trial', normalizedBody: 'Can I book a trial?' };
const classification = {
    spam: false, needsReply: true, language: 'en' as const, intent: 'trial_lesson' as const,
    confidence: 0.9, reason: 'A direct question needs a reply',
};

test('draft generation passes only a minimal CRM projection and bounded knowledge context', async () => {
    let received: DraftContext | undefined;
    const draft = await generateEmailDraft(email, classification, {
        async findContactByEmail(address) {
            assert.equal(address, email.fromAddress);
            return { id: 7, email: address, firstName: 'Ada', lastName: 'Lovelace', status: 'active' };
        },
    }, {
        async generateDraft(context) {
            received = context;
            return {
                replyLanguage: 'en', subject: 'Re: Trial', body: 'Yes, we can help.', confidence: 0.8,
                needsManualAnswer: false, usedKnowledgeIds: ['kb-1'],
            };
        },
    }, Array.from({ length: 6 }, (_, index) => ({
        id: `kb-${index}`, sourceUrl: `https://example.com/${index}`, content: 'fact', score: 0.9,
    })));

    assert.equal(draft?.subject, 'Re: Trial');
    assert.equal(received?.contact?.id, 7);
    assert.equal(received?.knowledge.length, 4);
});

test('spam and no-reply classifications never call CRM or draft generation', async () => {
    let calls = 0;
    const crm = { async findContactByEmail(): Promise<null> { calls += 1; return null; } };
    const client = { async generateDraft() { calls += 1; throw new Error('must not run'); } };
    assert.equal(await generateEmailDraft(email, { ...classification, spam: true }, crm, client), null);
    assert.equal(await generateEmailDraft(email, { ...classification, needsReply: false }, crm, client), null);
    assert.equal(calls, 0);
});
