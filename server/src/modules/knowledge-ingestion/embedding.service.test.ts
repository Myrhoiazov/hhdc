import assert from 'node:assert/strict';
import test from 'node:test';
import { chunkKnowledgeDocument, cosineSimilarity, InMemoryKnowledgeRepository, OllamaEmbeddingClient } from './embedding.service';

const document = {
    sourceType: 'website' as const,
    sourceId: 'faq',
    sourceUrl: 'https://talentcenter.nl/faq',
    title: 'FAQ', language: 'nl', contentHash: 'hash',
    content: 'Heading\n\nThis is the first section.\n\nThis is the second section.',
    lastCheckedAt: new Date(), active: true,
};

test('chunking keeps semantic sections and stable source attribution', () => {
    const chunks = chunkKnowledgeDocument(document, 40, 0);
    assert.equal(chunks.length, 2);
    assert.equal(chunks[0].id, 'faq:hash:0');
    assert.equal(chunks[1].sourceUrl, document.sourceUrl);
    assert.ok(chunks.every((chunk) => chunk.content.length <= 40));
});

test('chunking overlaps consecutive chunks by the configured amount', () => {
    const longDocument = { ...document, content: 'First section text here.\n\nSecond section text here.\n\nThird section text here.' };
    const noOverlap = chunkKnowledgeDocument(longDocument, 30, 0);
    const withOverlap = chunkKnowledgeDocument(longDocument, 30, 10);
    assert.ok(noOverlap.length >= 2);
    assert.equal(withOverlap.length, noOverlap.length, 'overlap does not change chunk count');
    assert.equal(withOverlap[0].content, noOverlap[0].content, 'the first chunk has nothing to overlap with');
    for (let i = 1; i < withOverlap.length; i += 1) {
        const previousTail = noOverlap[i - 1].content.slice(-10);
        assert.ok(withOverlap[i].content.startsWith(previousTail), `chunk ${i} should start with the previous chunk's tail`);
    }
});

test('chunking clamps overlap to less than maxCharacters to avoid runaway growth', () => {
    const chunks = chunkKnowledgeDocument(document, 20, 1000);
    assert.ok(chunks.every((chunk) => chunk.content.length < 20 + 20), 'overlap never exceeds maxCharacters even when configured larger');
});

test('cosine search ranks matching vectors and limits results', async () => {
    const repository = new InMemoryKnowledgeRepository();
    await repository.upsertChunks([
        { id: 'a', documentId: 'a', sourceUrl: 'a', contentHash: 'a', ordinal: 0, content: 'a', embedding: [1, 0] },
        { id: 'b', documentId: 'b', sourceUrl: 'b', contentHash: 'b', ordinal: 0, content: 'b', embedding: [0, 1] },
    ]);
    assert.equal(cosineSimilarity([1, 0], [1, 0]), 1);
    assert.deepEqual((await repository.search([0.9, 0.1], 1)).map((chunk) => chunk.id), ['a']);
});

test('Ollama embedding client uses configured model and validates vectors', async () => {
    let request: Record<string, unknown> | undefined;
    const client = new OllamaEmbeddingClient({
        url: 'http://ollama:11434/', model: 'multilingual-test', fetchImpl: async (_url, init) => {
            request = JSON.parse(String(init?.body));
            return new Response(JSON.stringify({ embeddings: [[0.1, 0.2]] }), { status: 200 });
        },
    });
    assert.deepEqual(await client.embed('Hallo'), [0.1, 0.2]);
    assert.equal(request?.model, 'multilingual-test');
});
