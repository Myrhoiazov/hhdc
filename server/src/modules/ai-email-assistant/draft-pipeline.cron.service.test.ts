import assert from 'node:assert/strict';
import test from 'node:test';
import cron from 'node-cron';
import * as pipeline from './draft-pipeline.service';
import { buildKnowledgeOptions, startAiEmailDraftCron } from './draft-pipeline.cron.service';
import { MysqlKnowledgeRepository, OllamaEmbeddingClient } from '../knowledge-ingestion';

test('scheduled drafts receive knowledge retrieved from the persistent store', async (t) => {
    const previous = process.env.AI_EMAIL_DRAFT_ENABLED;
    process.env.AI_EMAIL_DRAFT_ENABLED = 'true';
    t.after(() => { if (previous === undefined) delete process.env.AI_EMAIL_DRAFT_ENABLED; else process.env.AI_EMAIL_DRAFT_ENABLED = previous; });
    let tick: () => Promise<void> = async () => { throw new Error('Schedule not registered'); };
    t.mock.method(cron, 'schedule', (_expression: string, callback: () => Promise<void>) => { tick = callback; });
    t.mock.method(OllamaEmbeddingClient.prototype, 'embed', async (query: string) => {
        assert.equal(query, 'Can I book a trial lesson?');
        return [1, 0];
    });
    t.mock.method(MysqlKnowledgeRepository.prototype, 'search', async () => [{ id: 'trial-1', documentId: 'trial', contentHash: 'v1', ordinal: 0, content: 'Contact the administrator to book a trial.', sourceUrl: 'https://example.com/trial', score: 0.95 }]);
    let checked = false;
    t.mock.method(pipeline, 'runDraftPipeline', async (_repository: unknown, _crm: unknown, _llm: unknown, options?: pipeline.RunDraftPipelineOptions) => {
        const knowledge = options?.knowledgeProvider;
        assert.ok(knowledge, 'Scheduled pipeline must receive a knowledge provider');
        const results = await knowledge.retrieve('Can I book a trial lesson?');
        assert.equal(results[0].id, 'trial-1');
        assert.equal(results[0].sourceUrl, 'https://example.com/trial');
        checked = true;
        return { processed: 1, skipped: 0, failed: 0 };
    });
    assert.equal(startAiEmailDraftCron(), true);
    await tick();
    assert.equal(checked, true);
});

test('RAG_VERSION selects the knowledge path: v1 keeps the flat provider, v2 switches to layered deps', () => {
    const v1 = buildKnowledgeOptions('v1');
    assert.ok(v1.knowledgeProvider);
    assert.equal(v1.ragV2, undefined);
    const v2 = buildKnowledgeOptions('v2');
    assert.equal(v2.knowledgeProvider, undefined);
    assert.deepEqual(v2.ragV2?.limits, { rules: 3, facts: 4, faq: 2, examples: 2 });
});
