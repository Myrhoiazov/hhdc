import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertDraftCanApprove, assertDraftCanSend } from './approval';

test('generated AI text cannot be sent without a human approval', () => {
    assert.throws(() => assertDraftCanSend({ status: 'GENERATED', approvedBy: null, approvedAt: null }), /approval/i);
});

test('a generated or edited draft can be approved, but a rejected draft cannot', () => {
    assert.doesNotThrow(() => assertDraftCanApprove('GENERATED'));
    assert.doesNotThrow(() => assertDraftCanApprove('EDITED'));
    assert.throws(() => assertDraftCanApprove('REJECTED'), /cannot be approved/i);
});
