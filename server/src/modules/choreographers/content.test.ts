import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ApiError } from '../../common/http';
import { bioVersionSchema } from './bio.service';
import { createContactSchema, updateContactSchema } from './contacts.service';
import { assertVariantAllowed } from './content.routes';
import { canAddPhoto, isCompleteOrder, MAX_ACTIVE_PHOTOS, nextCoverId } from './media.rules';
import { mediaOrderSchema, mediaUpdateSchema } from './media.service';

test('a choreographer can have ten photos and not an eleventh', () => {
    assert.equal(MAX_ACTIVE_PHOTOS, 10);
    assert.equal(canAddPhoto(9), true);
    assert.equal(canAddPhoto(10), false);
});

test('a reorder must name every photo exactly once', () => {
    assert.equal(isCompleteOrder(['a', 'b', 'c'], ['c', 'a', 'b']), true);
    assert.equal(isCompleteOrder(['a', 'b', 'c'], ['a', 'b']), false);
    assert.equal(isCompleteOrder(['a', 'b', 'c'], ['a', 'a', 'b']), false);
    assert.equal(isCompleteOrder(['a', 'b'], ['a', 'x']), false);
    assert.throws(() => mediaOrderSchema.parse({ ids: [] }));
});

test('when the cover is removed the first remaining photo becomes the cover', () => {
    assert.equal(nextCoverId([{ id: 'b', position: 2, isCover: false }, { id: 'a', position: 1, isCover: false }]), 'a');
    assert.equal(nextCoverId([{ id: 'a', position: 1, isCover: true }, { id: 'b', position: 2, isCover: false }]), null);
    assert.equal(nextCoverId([]), null);
});

test('a photo can be made the cover but not un-made, so one cover always exists', () => {
    assert.equal(mediaUpdateSchema.parse({ isCover: true, rightsStatus: 'PERMITTED', caption: ' Stage ' }).caption, 'Stage');
    assert.throws(() => mediaUpdateSchema.parse({ isCover: false }));
    assert.throws(() => mediaUpdateSchema.parse({ rightsStatus: 'PUBLIC' }));
});

test('only people who manage media may fetch the original file', () => {
    assert.doesNotThrow(() => assertVariantAllowed('display', ['choreographers.read']));
    assert.doesNotThrow(() => assertVariantAllowed('original', ['choreographers.media.manage']));
    assert.throws(() => assertVariantAllowed('original', ['choreographers.read']), (error: unknown) => error instanceof ApiError && error.status === 403);
});

test('a contact needs a way to reach someone; its email is normalised', () => {
    const manager = createContactSchema.parse({ kind: 'MANAGER', name: 'Sam Lee', email: ' Sam@Agency.TEST ', validFrom: '2026-01-01', organization: '' });
    assert.equal(manager.email, 'sam@agency.test');
    assert.equal(manager.organization, null);
    assert.throws(() => createContactSchema.parse({ kind: 'MANAGER', organization: 'Agency' }));
    assert.throws(() => createContactSchema.parse({ kind: 'FRIEND', name: 'x' }));
    assert.throws(() => createContactSchema.parse({ kind: 'AGENT', name: 'x', validFrom: '01/01/2026' }));
    assert.deepEqual(updateContactSchema.parse({ isActive: false }), { isActive: false });
});

test('a biography version is plain text in a named language', () => {
    assert.deepEqual(bioVersionSchema.parse({ locale: 'NL', kind: 'PROMO', content: '  Tekst  ' }), { locale: 'nl', kind: 'PROMO', content: 'Tekst' });
    assert.throws(() => bioVersionSchema.parse({ locale: 'dutch', kind: 'PROMO', content: 'x' }));
    assert.throws(() => bioVersionSchema.parse({ locale: 'nl', kind: 'PROMO', content: '  ' }));
});
