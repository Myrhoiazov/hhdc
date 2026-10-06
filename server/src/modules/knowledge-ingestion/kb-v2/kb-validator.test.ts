import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { buildKnowledgeDocumentV2 } from './kb-document';
import { isIgnoredKnowledgePath, loadKnowledgeBaseV2 } from './kb-loader';
import { validateKnowledgeBaseV2 } from './kb-validator';

const FIXTURE_ROOT = path.join(__dirname, '__fixtures__', 'kb');
const NOW = new Date('2026-10-01T00:00:00Z');

const codes = (documents: ReturnType<typeof buildKnowledgeDocumentV2>[]) => {
    const result = validateKnowledgeBaseV2(documents, NOW);
    return { errors: result.errors.map((issue) => issue.code), warnings: result.warnings.map((issue) => issue.code), ok: result.ok };
};

test('the committed fixture knowledge base loads, skips non-knowledge files and validates cleanly', async () => {
    const knowledgeBase = await loadKnowledgeBaseV2(FIXTURE_ROOT);
    assert.ok(knowledgeBase.documents.length >= 30);
    assert.deepEqual(knowledgeBase.ignored.sort(), ['07_faq/general.md', 'README.md', '_meta/retrieval-guide.md', '11_response_examples/_bad-examples.md'].sort());
    const result = validateKnowledgeBaseV2(knowledgeBase.documents, NOW);
    assert.deepEqual(result.errors, []);
    assert.ok(result.warnings.every((issue) => issue.code === 'dynamic_without_last_verified'));
});

test('ignore rules cover developer docs, v1 leftover folders and underscore files', () => {
    assert.equal(isIgnoredKnowledgePath('RAG_V2_IMPLEMENTATION_SPEC.md'), true);
    assert.equal(isIgnoredKnowledgePath('09_business_rules/assistant-rules.md'), true);
    assert.equal(isIgnoredKnowledgePath('10_sources/sources.md'), true);
    assert.equal(isIgnoredKnowledgePath('02_locations/.DS_Store'), true);
    assert.equal(isIgnoredKnowledgePath('10_business_rules/assistant-rules.md'), false);
    assert.equal(isIgnoredKnowledgePath('13_sources/website.md'), false);
});

test('duplicate ids are rejected for every file that uses them', () => {
    const raw = '---\nid: shared_id\n---\n# A\n\nText';
    const result = validateKnowledgeBaseV2([buildKnowledgeDocumentV2('08_faq/a.md', raw), buildKnowledgeDocumentV2('08_faq/b.md', raw)], NOW);
    assert.deepEqual(result.errors.map((issue) => [issue.code, issue.sourcePath]), [['duplicate_id', '08_faq/a.md'], ['duplicate_id', '08_faq/b.md']]);
});

test('invalid YAML, priority, language and id are errors', () => {
    assert.deepEqual(codes([buildKnowledgeDocumentV2('08_faq/a.md', '---\nid: [x\n---\n# A\n\nText')]).errors, ['invalid_yaml']);
    assert.deepEqual(codes([buildKnowledgeDocumentV2('08_faq/a.md', '---\npriority: urgent\nlanguage: de\nid: Bad-Id\n---\n# A\n\nText')]).errors, ['invalid_id', 'invalid_priority', 'invalid_language']);
});

test('missing required metadata and empty content are errors', () => {
    const missing = codes([buildKnowledgeDocumentV2('unknown_folder/a.md', '---\nid: ""\ncategory: ""\n---\n# A\n\nText')]);
    assert.deepEqual(missing.errors, ['missing_metadata']);
    assert.deepEqual(codes([buildKnowledgeDocumentV2('08_faq/empty.md', '# Only a title\n\n## Source\n\nhttps://x\n')]).errors, ['empty_content']);
});

test('declared dynamic without last_verified is an error; folder-inferred dynamic is a warning; stale facts warn', () => {
    assert.deepEqual(codes([buildKnowledgeDocumentV2('08_faq/a.md', '---\ndynamic: true\n---\n# A\n\nText')]).errors, ['dynamic_without_last_verified']);
    assert.deepEqual(codes([buildKnowledgeDocumentV2('05_schedule/x.md', '# A\n\nText')]).warnings, ['dynamic_without_last_verified']);
    assert.deepEqual(codes([buildKnowledgeDocumentV2('05_schedule/x.md', '---\nlast_verified: 2026-01-01\n---\n# A\n\nText')]).warnings, ['stale_dynamic_fact']);
    assert.deepEqual(codes([buildKnowledgeDocumentV2('05_schedule/x.md', '---\nlast_verified: 01.10.2026\n---\n# A\n\nText')]).errors, ['invalid_last_verified']);
});

test('unknown front matter keys and language-less examples are warnings, not errors', () => {
    const result = codes([buildKnowledgeDocumentV2('11_response_examples/trial/generic.md', '---\nauthor: admin\n---\n# Example\n\nHi')]);
    assert.equal(result.ok, true);
    assert.deepEqual(result.warnings, ['unknown_metadata_key', 'example_without_language']);
});
