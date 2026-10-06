import assert from 'node:assert/strict';
import test from 'node:test';
import { persistDraft, type DraftRecord } from './draft.persistence';

const record: DraftRecord = {
    emailId: 11,
    draft: {
        replyLanguage: 'nl', subject: 'Re: Vraag', body: 'Bedankt voor uw bericht.', confidence: 0.8,
        needsManualAnswer: false, usedKnowledgeIds: ['kb-1'],
    },
    knowledge: [{ id: 'kb-1', sourceUrl: 'https://example.com/faq', score: 0.91 }],
};

test('persistDraft validates the draft before handing it to persistence', async () => {
    let received: DraftRecord | undefined;
    const result = await persistDraft({
        async createNextVersion(input) {
            received = input;
            return { id: 4, version: 1 };
        },
    }, record);
    assert.deepEqual(result, { id: 4, version: 1 });
    assert.equal(received?.draft.body, record.draft.body);
});

test('persistDraft rejects malformed model output', async () => {
    let error: unknown;
    try {
        await persistDraft({
            async createNextVersion() { return { id: 1, version: 1 }; },
        }, { ...record, draft: { ...record.draft, confidence: 2 } });
    } catch (caught) {
        error = caught;
    }
    assert.equal((error as { name?: string })?.name, 'ZodError');
});
