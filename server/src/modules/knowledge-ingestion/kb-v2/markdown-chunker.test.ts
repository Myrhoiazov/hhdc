import test from 'node:test';
import assert from 'node:assert/strict';
import { buildKnowledgeDocumentV2 } from './kb-document';
import { chunkKnowledgeDocumentV2, cleanMarkdownText, splitOversizedText } from './markdown-chunker';

const FAQ = '# FAQ --- Teenagers\n\n## Can I start with no experience?\n\nYes. DDC welcomes\nbeginners.\n\n### Follow-up\n\nAsk about age.\n\n## I am 11, can I join a 12+ group?\n\nDo not automatically confirm an age exception.\n';

test('each FAQ question/answer is one chunk and H3 stays inside its H2 parent', () => {
    const chunks = chunkKnowledgeDocumentV2(buildKnowledgeDocumentV2('08_faq/teenagers.md', FAQ));
    assert.deepEqual(chunks.map((chunk) => chunk.chunkId), ['faq_teenagers#can_i_start_with_no_experience', 'faq_teenagers#i_am_11_can_i_join_a_12_group']);
    assert.equal(chunks[0].content, 'FAQ — Teenagers — Can I start with no experience?\nYes. DDC welcomes beginners.\n\nFollow-up:\nAsk about age.');
    assert.deepEqual(chunks[0].headingPath, ['FAQ — Teenagers', 'Can I start with no experience?']);
});

test('chunks inherit document metadata plus document_id/chunk_id/section/source_path', () => {
    const [chunk] = chunkKnowledgeDocumentV2(buildKnowledgeDocumentV2('08_faq/teenagers.md', FAQ));
    assert.equal(chunk.metadata.documentId, 'faq_teenagers');
    assert.equal(chunk.metadata.chunkId, chunk.chunkId);
    assert.equal(chunk.metadata.section, 'can_i_start_with_no_experience');
    assert.equal(chunk.metadata.sourcePath, '08_faq/teenagers.md');
    assert.equal(chunk.metadata.priority, 'faq');
    assert.equal(chunk.metadata.topic, 'teenagers');
});

test('a rule document without H2 sections stays one logical chunk', () => {
    const raw = '# Forbidden Assumptions\n\nDo not infer: - that a class has free places because it appears in the\nschedule; - that old prices/examples are current.\n';
    const chunks = chunkKnowledgeDocumentV2(buildKnowledgeDocumentV2('10_business_rules/forbidden-assumptions.md', raw));
    assert.equal(chunks.length, 1);
    assert.equal(chunks[0].content, 'Forbidden Assumptions\nDo not infer:\n- that a class has free places because it appears in the schedule;\n- that old prices/examples are current.');
});

test('city-agnostic schedule chunks inherit the city from their H2 heading; Source sections are dropped', () => {
    const raw = '---\nid: schedule_current\ncategory: schedule\nlanguage: canonical\npriority: factual\ndynamic: true\nlast_verified: 2026-09-20\n---\n# Current Public Schedule\n\n> Time-sensitive data.\n\n## Den Haag\n\nWednesday: - 18:00--19:00 --- Kids group --- 7--11 - 19:00--20:00 --- High\nHeels --- 18+\n\n## Rotterdam\n\nMonday: - 17:00--18:00 --- Street\nJazz / Hip-Hop --- 12+\n\n## Source\n\nhttps://talentcenterddc.nl/schedule/\n';
    const chunks = chunkKnowledgeDocumentV2(buildKnowledgeDocumentV2('05_schedule/current-schedule.md', raw));
    assert.deepEqual(chunks.map((chunk) => [chunk.chunkId, chunk.metadata.city]), [['schedule_current#den_haag', 'den_haag'], ['schedule_current#rotterdam', 'rotterdam']]);
    assert.equal(chunks[0].content, 'Current Public Schedule — Den Haag\nWednesday:\n- 18:00–19:00 — Kids group — 7–11\n- 19:00–20:00 — High Heels — 18+');
    assert.equal(chunks[1].metadata.lastVerified, '2026-09-20');
});

test('a response example is always a single chunk', () => {
    const raw = '# Example --- beginner\n\n## Required facts\n\nRetrieve group.\n\n## Good response pattern\n\nДобрый день! 😊\n\n[ГРУППА]\n';
    const chunks = chunkKnowledgeDocumentV2(buildKnowledgeDocumentV2('11_response_examples/trial/beginner-ru.md', raw));
    assert.equal(chunks.length, 1);
    assert.equal(chunks[0].chunkId, 'ex_trial_beginner_ru#main');
    assert.match(chunks[0].content, /Good response pattern:\nДобрый день! 😊\n\n\[ГРУППА\]/);
});

test('oversized sections split only on paragraph boundaries', () => {
    const paragraphs = ['a'.repeat(50), 'b'.repeat(50), 'c'.repeat(50)];
    assert.deepEqual(splitOversizedText(paragraphs.join('\n\n'), 110), [`${paragraphs[0]}\n\n${paragraphs[1]}`, paragraphs[2]]);
    const raw = `# Big\n\n## Part\n\n${paragraphs.join('\n\n')}\n\n## Tail\n\nshort tail section`;
    const chunks = chunkKnowledgeDocumentV2(buildKnowledgeDocumentV2('04_classes/big.md', raw), 110);
    assert.deepEqual(chunks.map((chunk) => chunk.chunkId), ['class_big#part_p1', 'class_big#part_p2', 'class_big#tail']);
});

test('cleanMarkdownText restores pandoc dashes, escaped brackets and inline lists', () => {
    assert.equal(cleanMarkdownText('Наши занятия в \\[ГОРОД\\] --- ok'), 'Наши занятия в [ГОРОД] — ok');
    assert.equal(cleanMarkdownText('Friday: - 20:00--21:30 --- High Heels --- 18+'), 'Friday:\n- 20:00–21:30 — High Heels — 18+');
    assert.equal(cleanMarkdownText('### Monday\n\n-   16:00--17:00'), 'Monday:\n- 16:00–17:00');
    assert.equal(cleanMarkdownText('Comfortable clothes, indoor\nsneakers and water.\n\nNext paragraph'), 'Comfortable clothes, indoor sneakers and water.\n\nNext paragraph');
});

test('a document with a single H2 section keeps the heading and the entity it implies', () => {
    const chunks = chunkKnowledgeDocumentV2(buildKnowledgeDocumentV2('05_schedule/current-schedule.md', '# Schedule\n\n## Rotterdam\n\nWednesday: - 18:00--19:00 --- Hip-Hop --- 12+\n'));
    assert.deepEqual(chunks.map((chunk) => [chunk.chunkId, chunk.metadata.city]), [['schedule_current_schedule#rotterdam', 'rotterdam']]);
});
