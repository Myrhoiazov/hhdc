import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { buildKnowledgeDocumentV2 } from './kb-document';
import { isIgnoredKnowledgePath, loadKnowledgeBaseV2 } from './kb-loader';

const FIXTURE_ROOT = path.join(__dirname, '..', '..', 'ai', 'rag-v2', '__fixtures__', 'hhdc-kb');

test('the knowledge base loads with folder-prefixed paths and skips notes written for developers', async () => {
    const files = await loadKnowledgeBaseV2([FIXTURE_ROOT]);
    const paths = files.map(file => file.document.sourcePath);

    assert.ok(paths.includes('hhdc-kb/03_tickets_pricing/full-pass.md'));
    assert.ok(paths.every(file => !/README|_meta|14_intent_router|_bad-examples/.test(file)));
    const ids = files.map(file => file.document.metadata.id);
    assert.equal(new Set(ids).size, ids.length);
    assert.match(files[0].raw, /^(---|#)/);
});

test('ignore rules cover developer folders, READMEs, underscore files and non-markdown', () => {
    for (const file of ['README.md', '_meta/retrieval-guide.md', '12_sources/sources.md', '14_intent_router/intents.md', '15_evaluation/rubric.md', '16_test_dataset/golden-email-tests.csv', '10_response_examples/_bad-examples.md']) {
        assert.equal(isIgnoredKnowledgePath(file), true, file);
    }
    assert.equal(isIgnoredKnowledgePath('00_runtime/answerability.md'), false);
    assert.equal(isIgnoredKnowledgePath('03_tickets_pricing/full-pass.md'), false);
});

test('front matter supplies the event year and status; the body is kept without it', () => {
    const document = buildKnowledgeDocumentV2('kb/05_competition/legacy.md', '---\nid: competition_2026_legacy\ncategory: competition\ntopic: competition\nevent_year: 2026\npriority: factual\ndynamic: false\nlanguage: canonical\nstatus: legacy\nlast_verified: 2026-10-07\n---\n\n# Competition 2026\n\nSolo: €50');
    assert.equal(document.metadata.eventYear, 2026);
    assert.equal(document.metadata.status, 'legacy');
    assert.equal(document.metadata.lastVerified, '2026-10-07');
    assert.equal(document.title, 'Competition 2026');
    assert.doesNotMatch(document.content, /event_year/);
});

test('a file without front matter takes its layer from the folder', () => {
    const runtime = buildKnowledgeDocumentV2('hhdc-knowledge-v2/00_runtime/answerability.md', '# Answerability states\n\nText');
    assert.deepEqual([runtime.metadata.id, runtime.metadata.category, runtime.metadata.priority], ['answerability', 'rule', 'rules']);
    const crm = buildKnowledgeDocumentV2('hhdc-knowledge-v2/13_crm_contract/status-semantics.md', '# CRM status semantics');
    assert.deepEqual([crm.metadata.id, crm.metadata.topic], ['status_semantics', 'crm']);
    assert.equal(buildKnowledgeDocumentV2('notes/random.md', 'Text').metadata.category, 'meta');
});
