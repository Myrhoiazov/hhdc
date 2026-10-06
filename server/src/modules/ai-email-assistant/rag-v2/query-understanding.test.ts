import test from 'node:test';
import assert from 'node:assert/strict';
import { extractAge, extractTime } from './entity-extraction';
import { detectLanguage, understandQuery } from './query-understanding';
import type { EmailClassification } from '../email-assistant.service';

const understand = (body: string, language: EmailClassification['language'] = 'ru', intent: EmailClassification['intent'] = 'other') => (
    understandQuery({ subject: '', body, classification: { language, intent, needsReply: true } })
);

test('spec example: registration + Rotterdam location question', () => {
    const result = understand('я хочу записаться на танцы, но хочу узнать где вы находитесь в Роттердаме', 'ru', 'registration');
    assert.equal(result.intent, 'registration');
    assert.deepEqual(result.secondaryIntents, ['location']);
    assert.equal(result.entities.city, 'rotterdam');
    assert.equal(result.subintent, 'location_question');
    assert.deepEqual([result.needsCurrentFacts, result.needsBusinessRules, result.needsExamples], [true, true, true]);
});

test('a teenager with a city resolves to teenager_location with the normalized age', () => {
    const result = understand('Мне 13 лет, хочу танцевать в Роттердаме', 'ru', 'registration');
    assert.deepEqual([result.intent, result.subintent, result.entities.age, result.entities.city], ['registration', 'teenager_location', 13, 'rotterdam']);
});

test('LLM intent is kept; keywords fill in only when the LLM said "other"', () => {
    assert.equal(understand('Сколько стоит пробное занятие?', 'ru', 'pricing').intent, 'pricing');
    assert.equal(understand('Сколько стоит пробное занятие?', 'ru', 'other').intent, 'pricing');
    assert.equal(understand('Сколько стоит пробное занятие?', 'ru', 'pricing').subintent, 'trial_price');
    assert.equal(understand('Wat moet ik meenemen naar de les?', 'nl', 'other').intent, 'clothing');
});

test('a camp mention always routes to camp, even when the LLM saw a pricing question', () => {
    const result = understand('Скільки коштує LITO табір і чи є автобус?', 'ua', 'pricing');
    assert.deepEqual([result.language, result.intent, result.entities.campTopic], ['uk', 'camp', 'price']);
});

test('an availability question is flagged and treated as a schedule question', () => {
    const result = understand('Есть ли место в группе?');
    assert.deepEqual([result.intent, result.subintent, result.asksAvailability], ['schedule', 'availability', true]);
});

test('payment, subscription and complaint subtopics are extracted per intent family only', () => {
    assert.equal(understand('Деньги списали дважды за сентябрь', 'ru', 'payment').subintent, 'payment_problem');
    assert.equal(understand('Хочу заморозить абонемент на месяц', 'ru', 'subscription').entities.subscriptionTopic, 'freeze');
    assert.equal(understand('Сколько стоит?', 'ru', 'pricing').entities.campTopic, null);
    assert.equal(understand('Преподаватель не уделяет внимания моей дочке, я недовольна', 'ru', 'complaint').subintent, 'teacher_attention');
});

test('style aliases normalize and a bare style mention is a dance_style question', () => {
    const result = understand('хочу на хип хоп');
    assert.deepEqual([result.intent, result.entities.style], ['dance_style', 'hip_hop']);
    assert.equal(understand('Hip-Hop for my son', 'en').entities.style, 'hip_hop');
});

test('age extraction handles RU/UK/NL/EN phrasing and never reads a time as an age', () => {
    assert.equal(extractAge('Моей дочке 9 лет'), 9);
    assert.equal(extractAge('Мені 15 років'), 15);
    assert.equal(extractAge('mijn zoon is 10 jaar'), 10);
    assert.equal(extractAge("I'm 14 and want to join"), 14);
    assert.equal(extractAge('13-летний сын'), 13);
    assert.equal(extractAge('Is 18:00 still free?'), null);
    assert.equal(extractAge('Group 2025'), null);
    assert.equal(extractTime('Можно в 18.30?'), '18:30');
});

test('language: ua maps to uk; unknown falls back to a script/stop-word heuristic', () => {
    assert.equal(understand('Привіт', 'ua').language, 'uk');
    assert.equal(detectLanguage('Чи є заняття в Утрехті?'), 'uk');
    assert.equal(detectLanguage('Есть ли занятия?'), 'ru');
    assert.equal(detectLanguage('Hoe laat is de les in Den Haag?'), 'nl');
    assert.equal(detectLanguage('What time is the class?'), 'en');
});
