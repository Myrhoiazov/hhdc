import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canSeeActivity, hiddenActivityPrefixes, ownAddresses, provenanceOf } from './relations.rules';
import { activityQuerySchema, linkSchema, unlinkSchema } from './relations.service';

test('a conversation is on the profile either as the person\'s own thread or through an explicit link', () => {
    assert.equal(provenanceOf({ id: 'c1', personId: 'p1' }, 'p1'), 'direct_person_email');
    assert.equal(provenanceOf({ id: 'c2', personId: 'manager' }, 'p1'), 'manual_link');
    assert.equal(provenanceOf({ id: 'c3', personId: null }, 'p1'), 'manual_link');
});

test('only the choreographer\'s own extra addresses suggest threads; a manager address never does', () => {
    const contacts = [
        { kind: 'SELF_SECONDARY', email: 'Jojo.Private@Example.test', isActive: true },
        { kind: 'SELF_SECONDARY', email: 'old@example.test', isActive: false },
        { kind: 'MANAGER', email: 'sam@agency.test', isActive: true },
        { kind: 'AGENT', email: 'agent@agency.test', isActive: true },
        { kind: 'SELF_SECONDARY', email: null, isActive: true },
    ];
    assert.deepEqual(ownAddresses(contacts), ['jojo.private@example.test']);
    assert.deepEqual(ownAddresses([{ kind: 'MANAGER', email: 'sam@agency.test', isActive: true }]), []);
});

test('finance and document activity is hidden from readers without those permissions', () => {
    assert.equal(canSeeActivity('CHOREOGRAPHER_PROFILE_UPDATED', []), true);
    assert.equal(canSeeActivity('CHOREOGRAPHER_FEE_AGREED', []), false);
    assert.equal(canSeeActivity('CHOREOGRAPHER_PAYMENT_CONFIRMED', ['choreographers.finance.read']), true);
    assert.equal(canSeeActivity('DOCUMENT_UPLOADED', []), false);
    assert.equal(canSeeActivity('DOCUMENT_UPLOADED', ['documents.read']), true);
    assert.deepEqual(hiddenActivityPrefixes(['choreographers.finance.read', 'documents.read']), []);
    assert.deepEqual(hiddenActivityPrefixes([]), ['CHOREOGRAPHER_FEE_', 'CHOREOGRAPHER_EXPENSE_', 'CHOREOGRAPHER_PAYMENT_', 'DOCUMENT_']);
});

test('linking and unlinking need a reason; activity filters accept type prefixes only', () => {
    assert.equal(linkSchema.parse({ note: ' Manager wrote about the 2027 fee ' }).note, 'Manager wrote about the 2027 fee');
    assert.throws(() => linkSchema.parse({ note: '' }));
    assert.throws(() => linkSchema.parse({}));
    assert.throws(() => unlinkSchema.parse({ note: 'x' }));
    assert.equal(activityQuerySchema.parse({ type: 'CHOREOGRAPHER_PHOTO' }).type, 'CHOREOGRAPHER_PHOTO');
    assert.throws(() => activityQuerySchema.parse({ type: "x' OR 1=1" }));
});
