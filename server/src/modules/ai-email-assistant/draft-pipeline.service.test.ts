import assert from 'node:assert/strict';
import test from 'node:test';
import { createPrismaDraftPipelineRepository, runDraftPipeline, type DraftPipelineRepository } from './draft-pipeline.service';
import prisma from '../../../prisma/prisma-client';

test('draft pipeline classifies context, persists a version, and notifies approval sequentially', async () => {
    const events: string[] = [];
    const repository: DraftPipelineRepository = {
        async findDraftCandidates() { return [{ id: 9, sender: 'a@example.com', subject: 'Question', normalizedBody: 'Can I join?', classification: { spam: false, needsReply: true, language: 'en', intent: 'registration', confidence: 0.9, reason: 'question' } }]; },
        async createNextVersion() { events.push('persist'); return { id: 4, version: 1 }; },
    };
    const result = await runDraftPipeline(repository, {
        async findContactByEmail() { events.push('crm'); return { id: 1, email: 'a@example.com', firstName: 'Ada', lastName: 'Lovelace', status: 'active' }; },
    }, {
        async generateDraft() { events.push('llm'); return { replyLanguage: 'en', subject: 'Re: Question', body: 'Yes.', confidence: 0.8, needsManualAnswer: false, usedKnowledgeIds: ['kb-1'] }; },
    }, {
        knowledgeProvider: { async retrieve() { events.push('rag'); return [{ id: 'kb-1', sourceUrl: 'https://example.com', content: 'Yes', score: 0.9 }]; } },
        limit: 1,
        notify: async () => { events.push('notify'); return true; },
    });
    assert.deepEqual(result, { processed: 1, skipped: 0, failed: 0 });
    assert.deepEqual(events, ['rag', 'crm', 'llm', 'persist', 'crm', 'notify']);
});

// Regression test for a starvation bug: with a small `limit` (AI_MAX_CONCURRENCY throttles
// concurrent Ollama calls, default 1) and `orderBy: receivedAt asc`, an older email that will
// permanently never need a draft (spam or !needsReply) occupied the query's only result slot
// forever, so a real, newer needs-reply candidate was never even selected. Mocks the Prisma
// delegate directly (same pattern as telegram-miniapp-identity.service.test.ts) rather than
// hitting a real DB.
test('findDraftCandidates skips an older no-reply-needed email instead of starving a newer real candidate', async (t) => {
    const original = prisma.aiEmailMessage.findMany;
    const calls: unknown[] = [];
    (prisma.aiEmailMessage as unknown as { findMany: unknown }).findMany = async (args: unknown) => {
        calls.push(args);
        return [
            {
                id: 1, sender: 'noreply@example.com', subject: 'No reply needed', normalizedBody: 'FYI only',
                classifications: [{ spam: false, needsReply: false, language: 'en', intent: 'other', confidence: 1, reason: 'fyi' }],
            },
            {
                id: 2, sender: 'parent@example.com', subject: 'Question about schedule', normalizedBody: 'When is the next class?',
                classifications: [{ spam: false, needsReply: true, language: 'en', intent: 'registration', confidence: 1, reason: 'question' }],
            },
        ];
    };
    t.after(() => { (prisma.aiEmailMessage as unknown as { findMany: unknown }).findMany = original; });

    const repository = createPrismaDraftPipelineRepository();
    const candidates = await repository.findDraftCandidates(1);

    assert.equal(candidates.length, 1);
    assert.equal(candidates[0].id, 2);
    // The DB-level `take` must look past `limit` so a permanently-skipped older row can't
    // occupy the only slot — the actual concurrency limit is enforced by the `.slice(0, limit)`
    // afterward, not by the query's `take`.
    const { take } = calls[0] as { take: number };
    assert.ok(take > 1, `expected take to look past limit=1, got ${take}`);
});

test('RAG v2 path persists the rag trace and notifies with document sources and warnings', async () => {
    const persisted: Array<Record<string, unknown>> = [];
    const notified: Array<Record<string, unknown>> = [];
    const repository: DraftPipelineRepository = {
        async findDraftCandidates() { return [{ id: 11, sender: 'p@example.com', subject: 'Вопрос', normalizedBody: 'Где вы находитесь в Роттердаме?', classification: { spam: false, needsReply: true, language: 'ru', intent: 'location', confidence: 0.9, reason: '' } }]; },
        async createNextVersion(record) { persisted.push(record as unknown as Record<string, unknown>); return { id: 5, version: 1 }; },
    };
    const fact = { id: 'kb_v2:location_rotterdam#address', chunkId: 'location_rotterdam#address', documentId: 'location_rotterdam', content: 'Rotterdam — Address\nVan Alkemadehof 51, 3031 PB', score: 2, semanticScore: 0.6, metadata: { id: 'location_rotterdam', documentId: 'location_rotterdam', chunkId: 'location_rotterdam#address', section: 'address', sourcePath: '02_locations/rotterdam.md', category: 'location', priority: 'factual', language: 'canonical', dynamic: true, city: 'rotterdam', lastVerified: '2026-09-20' } } as const;
    const result = await runDraftPipeline(repository, { async findContactByEmail() { return null; } }, {
        async generateDraft(context) { assert.ok(context.ragV2, 'v2 context expected'); return { replyLanguage: 'ru', subject: 'Re: Вопрос', body: 'Добрый день! Адрес: Van Alkemadehof 51, 3031 PB.', confidence: 0.5, needsManualAnswer: true, usedKnowledgeIds: [] }; },
    }, {
        ragV2: { retrieve: async () => ({ rules: [], facts: [fact], faq: [], examples: [] }), limits: { rules: 3, facts: 4, faq: 2, examples: 2 }, characterBudget: 8000, log: () => undefined },
        limit: 1,
        notify: async (input) => { notified.push(input as unknown as Record<string, unknown>); return true; },
    });
    assert.deepEqual(result, { processed: 1, skipped: 0, failed: 0 });
    assert.equal(persisted[0].promptVersion, 'draft-rag-v2');
    assert.equal((persisted[0].ragTrace as { intent: string }).intent, 'location');
    assert.deepEqual(persisted[0].knowledge, [{ id: 'kb_v2:location_rotterdam#address', sourceUrl: 'kb-v2://02_locations/rotterdam.md', score: 2 }]);
    assert.deepEqual(notified[0].sources, ['location_rotterdam']);
    assert.deepEqual(notified[0].warnings, []);
    assert.equal(notified[0].intent, 'location / location_question');
    assert.equal(notified[0].needsManualAnswer, false);
});
