import test from 'node:test';
import assert from 'node:assert/strict';
import { parseFrontMatter } from './front-matter';
import { buildKnowledgeDocumentV2 } from './kb-document';
import { inferPathMetadata } from './path-metadata';
import { findAliases, normalizeEntityValue, CITY_ALIASES, STYLE_ALIASES } from './entity-aliases';

test('parseFrontMatter splits YAML metadata from the markdown body', () => {
    const result = parseFrontMatter('---\nid: location_rotterdam\ndynamic: true\nlast_verified: 2026-09-20\n---\n\n# Rotterdam\n');
    assert.equal(result.hasFrontMatter, true);
    assert.equal(result.error, undefined);
    assert.deepEqual(result.data, { id: 'location_rotterdam', dynamic: true, last_verified: '2026-09-20' });
    assert.equal(result.body.trim(), '# Rotterdam');
});

test('parseFrontMatter treats a file without a leading --- block as body only', () => {
    const result = parseFrontMatter('# FAQ\n\n---\nnot: front matter\n---\n');
    assert.equal(result.hasFrontMatter, false);
    assert.deepEqual(result.data, {});
    assert.match(result.body, /not: front matter/);
});

test('parseFrontMatter reports invalid YAML and non-mapping blocks instead of indexing them as prose', () => {
    assert.ok(parseFrontMatter('---\nid: [unclosed\n---\nbody').error);
    assert.equal(parseFrontMatter('---\n- a\n- b\n---\nbody').error, 'front matter must be a YAML mapping');
});

test('front matter wins over path inference, YAML never reaches the content, keys are camelCased', () => {
    const raw = '---\nid: location_rotterdam\ncategory: location\ncity: Rotterdam\nage_group: 12_plus\nlanguage: canonical\npriority: factual\ndynamic: true\nlast_verified: 2026-09-20\nsource: website\n---\n\n# Rotterdam\n\n## Address\n\nVan Alkemadehof 51, 3031 PB\n\n## Source\n\nhttps://talentcenterddc.nl/schedule/\n';
    const document = buildKnowledgeDocumentV2('02_locations/rotterdam.md', raw);
    assert.equal(document.metadata.id, 'location_rotterdam');
    assert.equal(document.metadata.city, 'rotterdam');
    assert.equal(document.metadata.ageGroup, '12_plus');
    assert.equal(document.metadata.lastVerified, '2026-09-20');
    assert.equal(document.metadata.topic, 'location');
    assert.equal(document.title, 'Rotterdam');
    assert.equal(document.sourceUrl, 'https://talentcenterddc.nl/schedule/');
    assert.doesNotMatch(document.content, /last_verified|priority:/);
    assert.equal(document.contentHash.length, 64);
});

test('documents without front matter get safe defaults from their folder and file name', () => {
    assert.deepEqual(inferPathMetadata('08_faq/teenagers.md'), { id: 'faq_teenagers', category: 'faq', priority: 'faq', dynamic: false, language: 'canonical', topic: 'teenagers' });
    assert.equal(inferPathMetadata('02_locations/den-haag.md').city, 'den_haag');
    assert.equal(inferPathMetadata('03_dance_styles/hip-hop.md').style, 'hip_hop');
    assert.equal(inferPathMetadata('10_business_rules/schedule-rules.md').priority, 'rules');
    assert.equal(inferPathMetadata('08_lito_dance_camp/pricing.md').dynamic, true);
    assert.equal(inferPathMetadata('08_lito_dance_camp/overview.md').dynamic, false);
});

test('response examples infer topic, subtopic and language from their path', () => {
    assert.deepEqual(inferPathMetadata('11_response_examples/trial/beginner-ru.md'), {
        id: 'ex_trial_beginner_ru', category: 'example', priority: 'example', dynamic: false, language: 'ru', topic: 'trial', subtopic: 'beginner',
    });
    assert.equal(inferPathMetadata('11_response_examples/registration/teenager-location-uk.md').language, 'uk');
});

test('Unicode RU/UK/NL content is preserved byte for byte', () => {
    const body = '# Приклад\n\nДобрий день! Заняття в Роттердамі — ґанок, їжак, є.\n\nHallo! Proefles bij ons 💛';
    const document = buildKnowledgeDocumentV2('11_response_examples/trial/beginner-uk.md', body);
    assert.equal(document.title, 'Приклад');
    assert.match(document.content, /ґанок, їжак, є/);
    assert.match(document.content, /Proefles bij ons 💛/);
});

test('entity aliases resolve case endings, spelling variants and scripts to canonical ids', () => {
    assert.deepEqual(findAliases('Где вы находитесь в Роттердаме?', CITY_ALIASES), ['rotterdam']);
    assert.deepEqual(findAliases('Is er les in Den Haag of Amsterdam?', CITY_ALIASES), ['amsterdam', 'den_haag']);
    assert.deepEqual(findAliases('хочу на хип хоп', STYLE_ALIASES), ['hip_hop']);
    assert.deepEqual(findAliases('Hip-Hop or hiphop', STYLE_ALIASES), ['hip_hop']);
    assert.equal(normalizeEntityValue('den-haag', CITY_ALIASES), 'den_haag');
    assert.deepEqual(findAliases('Rotterdamse school', CITY_ALIASES), ['rotterdam']);
    assert.deepEqual(findAliases('ротор и дамба', CITY_ALIASES), []);
});
