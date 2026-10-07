import { test } from 'node:test';
import assert from 'node:assert/strict';
import { documentChunks, kbV2Path, kbV2SourceUrl } from './kb-chunks';

const manual = { id: 'doc-1', sourceType: 'MANUAL', sourceUrl: null as string | null };

test('an imported knowledge file is chunked with the metadata of its front matter', () => {
    const content = '---\nid: event_2027_venue\ncategory: event\ntopic: venue\nevent_year: 2027\npriority: factual\ndynamic: true\nlanguage: canonical\n---\n# Venue\n\n## Address\n\nApollohal, Amsterdam';
    const chunks = documentChunks({ id: 'doc-2', sourceType: 'KB_V2', sourceUrl: kbV2SourceUrl('hhdc-knowledge-v1/02_event_2027/venue.md'), content });
    assert.ok(chunks.length >= 1);
    assert.equal(chunks[0].metadata.kb, 'v2');
    assert.equal(chunks[0].metadata.category, 'event');
    assert.equal(chunks[0].metadata.priority, 'factual');
    assert.equal(chunks[0].metadata.eventYear, 2027);
    assert.equal(chunks[0].metadata.sourcePath, 'hhdc-knowledge-v1/02_event_2027/venue.md');
});

test('a document written in the CRM joins RAG v2 only when it declares front matter', () => {
    const plain = documentChunks({ ...manual, content: 'Plain note about parking.' });
    assert.deepEqual(plain, [{ content: 'Plain note about parking.', metadata: {} }]);
    assert.equal(kbV2Path({ ...manual, content: 'Plain note' }), null);

    const declared = documentChunks({ ...manual, content: '---\nid: rule_refunds\ncategory: rule\npriority: rules\nlanguage: canonical\ndynamic: false\ntopic: payment\n---\n# Refunds\n\nNever promise a refund.' });
    assert.equal(declared[0].metadata.kb, 'v2');
    assert.equal(declared[0].metadata.priority, 'rules');
    assert.equal(declared[0].metadata.topic, 'payment');
    assert.doesNotMatch(declared[0].content, /priority: rules/);
});
