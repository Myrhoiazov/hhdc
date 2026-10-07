import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emailClassificationSchema } from '../email-classification';
import { extractEventYear } from './entity-extraction';
import { understandQuery } from './query-understanding';
import { classified, CURRENT_EVENT_YEAR } from './rag-v2.testHelpers';

const understand = (body: string, classification = classified('other')) => understandQuery({ subject: '', body, classification, currentEventYear: CURRENT_EVENT_YEAR });

test('a refund request always needs the CRM and a person, whatever the classifier flagged', () => {
    const result = understand('Ik wil mijn ticket annuleren en mijn geld terug.', classified('refund', { replyLanguage: 'nl' }));
    assert.equal(result.intent, 'refund');
    assert.equal(result.language, 'nl');
    assert.equal(result.needsCRM, true);
    assert.equal(result.needsHumanAction, true);
    assert.ok(result.secondaryIntents.includes('cancellation'));
});

test('a pricing question is answered from knowledge without the CRM', () => {
    const result = understand('How much is the Early Bird ticket for HHDC 2027?', classified('pricing'));
    assert.equal(result.needsCRM, false);
    assert.equal(result.needsHumanAction, false);
    assert.equal(result.eventYear, 2027);
    assert.equal(result.historical, false);
});

test('a question about a past edition is historical; without a year the current event is meant', () => {
    const past = understand('What were the Solo fees in 2026?', classified('competition'));
    assert.equal(past.eventYear, 2026);
    assert.equal(past.historical, true);
    const current = understand('How much is Solo competition?', classified('competition'));
    assert.equal(current.eventYear, 2027);
    assert.equal(current.historical, false);
    assert.equal(understand('Did Zacc Milne teach at previous HHDC events?', classified('choreographer')).historical, true);
});

test('keywords supply the intent and language when the classifier had nothing', () => {
    const result = understand('Где будет проходить HHDC 2027?', classified('other', { replyLanguage: 'unknown' }));
    assert.equal(result.intent, 'venue');
    assert.equal(result.language, 'ru');
    assert.equal(understand('Скільки коштує квиток?', classified('other', { replyLanguage: 'unknown' })).language, 'uk');
});

test('an availability question is routed to staff and a named product is recognised', () => {
    const result = understand('Is the €330 Super Early Bird still available for the Full Pass?', classified('pricing'));
    assert.equal(result.asksAvailability, true);
    assert.equal(result.needsHumanAction, true);
    assert.equal(result.entities.ticketProduct, 'full_pass');
});

test('the event year is read from a year or an edition tag', () => {
    assert.equal(extractEventYear('Is Jojo Gomez coming in 2027?'), 2027);
    assert.equal(extractEventYear('See you at #HHDC26'), 2026);
    assert.equal(extractEventYear('What time does check-in open?'), null);
});

test('classifier output is accepted with missing optional flags and repaired where harmless', () => {
    const parsed = emailClassificationSchema.parse({ needsReply: true, replyLanguage: 'ua', intent: 'made_up', secondaryIntents: ['payment', 'nonsense'], confidence: 0.8 });
    assert.equal(parsed.replyLanguage, 'uk');
    assert.equal(parsed.intent, 'other');
    assert.deepEqual(parsed.secondaryIntents, ['payment']);
    assert.equal(parsed.needsCRM, false);
    assert.equal(parsed.spam, false);
    assert.throws(() => emailClassificationSchema.parse({ replyLanguage: 'en', intent: 'payment', confidence: 0.8 }));
});
