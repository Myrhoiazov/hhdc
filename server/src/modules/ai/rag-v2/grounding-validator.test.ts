import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findActionClaims, findAvailabilityClaims, validateGrounding } from './grounding-validator';

const facts = 'TICKET [FULL PASS] 13 CLASSES\n- €390 – Early Bird\nDates: 21–23 May 2027. Venue: Apollohal, Amsterdam.';
const codes = (draft: string, language: 'en' | 'ru' = 'en') => validateGrounding({ draft, factsText: facts, language }).warnings.map(warning => warning.code);

test('values copied from the facts pass; invented ones are reported', () => {
    assert.deepEqual(codes('Hi! The Early Bird price is €390.'), []);
    assert.deepEqual(codes('Hi! The price is €450 and doors open at 09:30.'), ['ungrounded_price', 'ungrounded_time']);
});

test('completed-action and availability promises are rejected unless they are conditional', () => {
    assert.deepEqual(findActionClaims('Your ticket has been refunded.'), ['has been refunded']);
    assert.deepEqual(findActionClaims('Мы уже вернули вам оплату.').length, 1);
    assert.deepEqual(findActionClaims('Our team will check whether it can be refunded.'), []);
    assert.equal(findAvailabilityClaims('You are registered for the camp.').length, 1);
    assert.deepEqual(codes('Hi! Your order has been cancelled.'), ['unsupported_action_claim']);
});

test('a reply in the wrong language, a placeholder or a looping draft is rejected', () => {
    assert.deepEqual(codes('Hi! The Early Bird price is €390.', 'ru'), ['language_mismatch']);
    assert.deepEqual(codes('Hi [Name], the Early Bird price is €390.'), ['unresolved_placeholder']);
    assert.deepEqual(codes(Array(4).fill('The team will check this for you.').join('\n')), ['degenerate_repetition']);
});
