import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { WeeztixContact } from '../../integrations/ticketing/weeztix/weeztix.contacts';
import { fillMissing, importContactsSchema } from './weeztix-contacts.service';

const contact: WeeztixContact = {
    email: 'anna@example.test', firstName: 'Anna', lastName: 'Berg', language: 'de', phone: '+31600000001', country: 'Nederland',
    marketing: true, marketingAt: '2025-03-01T10:00:00+01:00', firstOrderAt: '2025-03-01T10:00:00+01:00', orderGuids: ['o-1'],
};

test('a contact known only by its address gets the name and details of the buyer', () => {
    const fromMailbox = { firstName: '', lastName: '', displayName: 'Anna@Example.test', email: 'anna@example.test', phone: null as string | null, language: null as string | null, country: null as string | null };
    assert.deepEqual(fillMissing(fromMailbox, contact), {
        firstName: 'Anna', lastName: 'Berg', displayName: 'Anna Berg', phone: '+31600000001', language: 'de', country: 'Nederland',
    });
});

test('details already in the CRM are kept, and an empty answer fills nothing', () => {
    const edited = { firstName: 'Ann', lastName: 'B.', displayName: 'Ann B.', email: 'anna@example.test', phone: '+49', language: 'en', country: null as string | null };
    assert.deepEqual(fillMissing(edited, { ...contact, country: '' }), {});
    assert.deepEqual(fillMissing(edited, contact), { country: 'Nederland' });
});

test('the import is a preview unless it is asked for, and accepts nothing else', () => {
    assert.equal(importContactsSchema.parse({}).dryRun, true);
    assert.equal(importContactsSchema.parse({ dryRun: false }).dryRun, false);
    assert.throws(() => importContactsSchema.parse({ dryRun: false, companyGuid: 'x' }));
});
