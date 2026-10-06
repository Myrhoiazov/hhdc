import test from 'node:test';
import assert from 'node:assert/strict';
import { describeWarnings, extractPrices, extractTimes, findAvailabilityClaims, validateGrounding } from './grounding-validator';

const ROTTERDAM_FACTS = 'Rotterdam — Address\nVan Alkemadehof 51, 3031 PB\n\nRotterdam — Schedule\nWednesday:\n- 18:00–19:00 — Street Jazz / Hip-Hop — 12+';
const codes = (draft: string, factsText = ROTTERDAM_FACTS, language: 'ru' | 'uk' | 'nl' | 'en' = 'ru') => validateGrounding({ draft, factsText, language }).warnings.map((warning) => `${warning.code}:${warning.value ?? ''}`);

test('a draft that only restates current facts passes', () => {
    const draft = 'Добрый день! Наши занятия в Роттердаме проходят по адресу Van Alkemadehof 51, 3031 PB. Для 13 лет подходит Street Jazz / Hip-Hop по средам, 18:00–19:00. Напишите нам — поможем записаться!';
    assert.deepEqual(codes(draft), []);
});

test('old example schedule (Monday 17:00) is rejected when current facts say Wednesday 18:00', () => {
    const draft = 'Добрый день! Занятия проходят в понедельник в 17:00.';
    assert.deepEqual(codes(draft), ['ungrounded_time:17:00', 'ungrounded_weekday:monday']);
});

test('a hallucinated price is blocked; a price present in facts is accepted', () => {
    assert.deepEqual(codes('Пробное занятие стоит 15 €.'), ['ungrounded_price:15']);
    assert.deepEqual(codes('Пробное занятие стоит €15,00.'), ['ungrounded_price:15']);
    assert.deepEqual(codes('The deposit is €450.', 'Deposit: €450. REGULAR €1390', 'en'), []);
    assert.deepEqual(codes('Regular price: 1 390 euro.', 'REGULAR €1390', 'en'), []);
});

test('unsupported availability claims are blocked in all four languages', () => {
    assert.deepEqual(codes('Да, место в группе есть, ждём вас!'), ['unsupported_availability:место в группе есть']);
    assert.deepEqual(findAvailabilityClaims('Да, места ещё есть.'), ['места ещё есть']);
    assert.ok(findAvailabilityClaims('Так, є вільні місця.').length > 0);
    assert.ok(findAvailabilityClaims('Ja, er is nog plek in de groep.').length > 0);
    assert.ok(findAvailabilityClaims('Good news: there are still spots in the group.').length > 0);
    assert.ok(findAvailabilityClaims("Great, you're booked for the class!").length > 0);
});

test('conditional or negated availability wording is not treated as a promise', () => {
    assert.deepEqual(findAvailabilityClaims('Мы уточним, есть ли свободные места, и сообщим.'), []);
    assert.deepEqual(findAvailabilityClaims('Если есть свободные места, администратор подтвердит.'), []);
    assert.deepEqual(findAvailabilityClaims("We'll check whether there is space in the group."), []);
    assert.deepEqual(findAvailabilityClaims('Of er nog plek is, laten we je weten.'), []);
});

test('an address not in facts is blocked; the real one passes', () => {
    assert.deepEqual(codes('Мы находимся по адресу Coolsingel 40, 3011 AD.'), ['ungrounded_address:3011AD', 'ungrounded_address:coolsingel 40']);
    assert.deepEqual(codes('Adres: Van Alkemadehof 51, 3031PB.', ROTTERDAM_FACTS, 'nl').filter((code) => code.startsWith('ungrounded_address')), []);
});

test('dates must occur in facts', () => {
    assert.deepEqual(codes('Лагерь начинается 12 июля.'), ['ungrounded_date:12 июля']);
    assert.deepEqual(codes('Лагерь начинается 12 июля.', 'Camp dates: 12 июля – 19 июля'), []);
});

test('language mismatch and copied template placeholders are flagged', () => {
    assert.deepEqual(codes('Hello! Our classes are on Wednesday at 18:00.'), ['language_mismatch:en']);
    assert.deepEqual(codes('Привет! Наш адрес: [АКТУАЛЬНЫЙ АДРЕС].'), ['unresolved_placeholder:[АКТУАЛЬНЫЙ АДРЕС]']);
});

test('extractors normalize formats', () => {
    assert.deepEqual(extractTimes('18.30 и 9:05, 16:00–17:00'), ['18:30', '09:05', '16:00', '17:00']);
    assert.deepEqual(extractPrices('€1190 · 1.390 € · 12,50 euro · EUR 450'), ['1190', '1390', '12.50', '450']);
});

test('describeWarnings builds a single correction line for the regeneration attempt', () => {
    const line = describeWarnings([{ code: 'ungrounded_price', value: '15' }, { code: 'unsupported_availability', value: 'места есть' }]);
    assert.equal(line, 'it stated a price that is not in CURRENT FACTS ("15"); it promised a free place or a confirmed booking, which CURRENT FACTS do not confirm ("места есть")');
});
