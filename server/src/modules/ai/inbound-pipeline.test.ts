import { test } from 'node:test';
import assert from 'node:assert/strict';
import { autoDraftEnabled, skipReason } from './inbound-pipeline';

const now = Date.parse('2026-10-07T12:00:00.000Z');
const fresh = { direction: 'INBOUND', receivedAt: new Date('2026-10-07T11:00:00.000Z'), classification: null as unknown, hasDraft: false };

test('a fresh incoming email gets a draft prepared', () => {
    assert.equal(skipReason(fresh, now, true), null);
});

test('imported history, handled messages and existing drafts are left alone', () => {
    assert.equal(skipReason({ ...fresh, receivedAt: new Date('2026-09-01T11:00:00.000Z') }, now, true), 'not_fresh');
    assert.equal(skipReason({ ...fresh, classification: { spam: false } }, now, true), 'already_classified');
    assert.equal(skipReason({ ...fresh, hasDraft: true }, now, true), 'draft_exists');
    assert.equal(skipReason({ ...fresh, direction: 'OUTBOUND' }, now, true), 'not_inbound');
    assert.equal(skipReason(null, now, true), 'not_inbound');
});

test('the background pipeline can be switched off', () => {
    assert.equal(skipReason(fresh, now, false), 'disabled');
});

test('background drafting needs both the classification and the draft switch', () => {
    assert.equal(autoDraftEnabled({ AI_EMAIL_CLASSIFICATION_ENABLED: 'true', AI_EMAIL_DRAFT_ENABLED: 'true' }), true);
    assert.equal(autoDraftEnabled({ AI_EMAIL_CLASSIFICATION_ENABLED: 'true', AI_EMAIL_DRAFT_ENABLED: 'false' }), false);
    assert.equal(autoDraftEnabled({}), false);
});
