import test from 'node:test';
import assert from 'node:assert/strict';
import { buildKnowledgeDocumentV2 } from './kb-document';
import { chunkKnowledgeDocumentV2, cleanMarkdownText, splitOversizedText } from './markdown-chunker';

const FRONT_MATTER = '---\nid: faq_tickets\ncategory: faq\ntopic: ticket\nevent_year: 2027\npriority: faq\ndynamic: true\nlanguage: canonical\n---\n';
const FAQ = `${FRONT_MATTER}# Tickets FAQ\n\n## Can I transfer my pass?\n\nPasses are personal and\nnon-transferable.\n\n### Exception\n\nOnly with organizer permission.\n\n## Is accommodation included?\n\nNo, accommodation is not included.\n`;

test('each FAQ question/answer is one chunk and H3 stays inside its H2 parent', () => {
    const chunks = chunkKnowledgeDocumentV2(buildKnowledgeDocumentV2('kb/08_faq/tickets.md', FAQ));
    assert.deepEqual(chunks.map((chunk) => chunk.chunkId), ['faq_tickets#can_i_transfer_my_pass', 'faq_tickets#is_accommodation_included']);
    assert.equal(chunks[0].content, 'Tickets FAQ — Can I transfer my pass?\nPasses are personal and non-transferable.\n\nException:\nOnly with organizer permission.');
    assert.deepEqual(chunks[0].headingPath, ['Tickets FAQ', 'Can I transfer my pass?']);
});

test('chunks inherit document metadata plus document id, chunk id, section and source path', () => {
    const [chunk] = chunkKnowledgeDocumentV2(buildKnowledgeDocumentV2('kb/08_faq/tickets.md', FAQ));
    assert.equal(chunk.metadata.documentId, 'faq_tickets');
    assert.equal(chunk.metadata.chunkId, chunk.chunkId);
    assert.equal(chunk.metadata.section, 'can_i_transfer_my_pass');
    assert.equal(chunk.metadata.sourcePath, 'kb/08_faq/tickets.md');
    assert.equal(chunk.metadata.priority, 'faq');
    assert.equal(chunk.metadata.topic, 'ticket');
    assert.equal(chunk.metadata.eventYear, 2027);
});

test('a rule document without H2 sections stays one logical chunk', () => {
    const raw = '# Forbidden Assumptions\n\nDo not infer: - that a ticket is available because it appears in the\nprice list; - that old prices are current.\n';
    const chunks = chunkKnowledgeDocumentV2(buildKnowledgeDocumentV2('kb/09_business_rules/forbidden-assumptions.md', raw));
    assert.equal(chunks.length, 1);
    assert.equal(chunks[0].chunkId, 'forbidden_assumptions#main');
    assert.equal(chunks[0].content, 'Forbidden Assumptions\nDo not infer:\n- that a ticket is available because it appears in the price list;\n- that old prices are current.');
});

test('a response example is always a single chunk', () => {
    const raw = '---\nid: ex_early_bird_en\ncategory: example\ntopic: ticket\nlanguage: en\npriority: example\ndynamic: false\n---\n# Example\n\n## Greeting\n\nHi!\n\n## Answer\n\nThe Early Bird price is shown on our website.\n';
    const chunks = chunkKnowledgeDocumentV2(buildKnowledgeDocumentV2('kb/10_response_examples/tickets/early-bird-en.md', raw));
    assert.equal(chunks.length, 1);
    assert.equal(chunks[0].metadata.language, 'en');
    assert.match(chunks[0].content, /Greeting:\nHi![\s\S]*Answer:\nThe Early Bird price/);
});

test('oversized text splits only on paragraph boundaries', () => {
    const paragraphs = ['First paragraph about tickets.', 'Second paragraph about prices.', 'Third paragraph about refunds.'];
    const parts = splitOversizedText(paragraphs.join('\n\n'), 65);
    assert.deepEqual(parts, ['First paragraph about tickets.\n\nSecond paragraph about prices.', 'Third paragraph about refunds.']);
    assert.deepEqual(splitOversizedText('Short text.', 900), ['Short text.']);
});

test('cleanMarkdownText restores dashes, escaped brackets and inline lists', () => {
    assert.equal(cleanMarkdownText('TICKET \\[FULL PASS\\] --- 13 classes'), 'TICKET [FULL PASS] — 13 classes');
    assert.equal(cleanMarkdownText('Open 10:00--18:00'), 'Open 10:00–18:00');
    assert.equal(cleanMarkdownText('Prices: - Early Bird - Standard'), 'Prices:\n- Early Bird - Standard');
});
