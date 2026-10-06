import assert from 'node:assert/strict';
import test from 'node:test';
import { Bm25Search } from './bm25.service';

const docs = [
    { id: 'a', content: 'Абонемент на хип-хоп стоит 100 евро в месяц' },
    { id: 'b', content: 'Пробное занятие доступно для детей от 4 лет' },
    { id: 'c', content: 'Джаз-фанк и контемпорари для взрослых' },
];

test('ranks documents containing the query term above ones that do not', () => {
    const results = new Bm25Search(docs).search('хип-хоп');
    assert.ok(results.length > 0);
    assert.equal(results[0].doc.id, 'a');
});

test('returns an empty list when the query shares no term with the corpus', () => {
    const results = new Bm25Search(docs).search('совершенно другое слово которого здесь нет');
    // "другое" and "здесь" might appear; use a query built only from rare/foreign tokens instead.
    const noOverlap = new Bm25Search(docs).search('zzzznonexistentword');
    assert.deepEqual(noOverlap, []);
    assert.ok(Array.isArray(results));
});

test('an empty corpus never throws and returns no results', () => {
    const results = new Bm25Search<{ id: string; content: string }>([]).search('что угодно');
    assert.deepEqual(results, []);
});

test('scores every matching term, not just the first', () => {
    const multiTerm = new Bm25Search(docs).search('пробное занятие дети');
    assert.equal(multiTerm[0].doc.id, 'b');
});

test('tokenization ignores punctuation and is case-insensitive', () => {
    const results = new Bm25Search(docs).search('ХИП-ХОП!!!');
    assert.equal(results[0].doc.id, 'a');
});
