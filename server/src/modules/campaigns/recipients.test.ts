import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveRecipients } from './recipients';

const granted = [{ type: 'MARKETING_EMAIL', status: 'GRANTED', withdrawnAt: null as Date | null }];

test('campaign recipients exclude people without consent or without an email', () => {
    const result = resolveRecipients([
        { id: 'a', email: 'a@example.test', language: 'en', consents: granted },
        { id: 'b', email: 'b@example.test', language: 'nl', consents: [] },
        { id: 'c', email: null, language: 'en', consents: granted },
        { id: 'd', email: 'd@example.test', language: null, consents: [{ type: 'MARKETING_EMAIL', status: 'GRANTED', withdrawnAt: new Date() }] },
        { id: 'e', email: 'e@example.test', language: null, consents: [{ type: 'PHOTO_VIDEO', status: 'GRANTED', withdrawnAt: null }] },
    ]);
    assert.deepEqual(result.recipients, [{ personId: 'a', destination: 'a@example.test', language: 'en' }]);
    assert.deepEqual(result.excluded, { noConsent: 3, missingEmail: 1 });
    assert.deepEqual(result.byLanguage, { en: 1 });
});
