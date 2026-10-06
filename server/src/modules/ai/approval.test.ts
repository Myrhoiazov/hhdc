import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertDraftCanSend } from './approval';

test('generated AI text cannot be sent without a human approval', () => {
    assert.throws(() => assertDraftCanSend({ status: 'GENERATED', approvedBy: null, approvedAt: null }), /approval/i);
});
