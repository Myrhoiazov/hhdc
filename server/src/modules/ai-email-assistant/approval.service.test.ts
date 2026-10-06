import assert from 'node:assert/strict';
import test from 'node:test';
import { applyDraftAction, parseAllowedTelegramActors, type DraftApprovalRepository } from './approval.service';

const target = { id: 5, version: 2, status: 'GENERATED' as const };
const repository = (calls: string[]): DraftApprovalRepository => ({
    async findDraftVersion() { return target; },
    async transitionDraft(_id, _version, status) { calls.push(`transition:${status}`); },
    async recordApproval(input) { calls.push(`audit:${input.action}:${input.actorId}`); },
});

test('approval requires an allowlisted actor and immutable draft version', async () => {
    const calls: string[] = [];
    const result = await applyDraftAction({ draftId: 5, draftVersion: 2, action: 'approve', actorId: 'chat-1' }, repository(calls), parseAllowedTelegramActors('chat-1,chat-2'));
    assert.equal(result.status, 'APPROVED');
    assert.deepEqual(calls, ['transition:APPROVED', 'audit:APPROVE:chat-1']);
});

test('edit requires a body and stale or completed drafts cannot be acted on', async () => {
    await assert.rejects(() => applyDraftAction({ draftId: 5, draftVersion: 2, action: 'edit', actorId: 'chat-1' }, repository([]), new Set(['chat-1'])), /editedBody/);
    await assert.rejects(() => applyDraftAction({ draftId: 5, draftVersion: 2, action: 'approve', actorId: 'other' }, repository([]), new Set(['chat-1'])), /not authorized/);
    const completed: DraftApprovalRepository = { ...repository([]), async findDraftVersion() { return { ...target, status: 'APPROVED' }; } };
    await assert.rejects(() => applyDraftAction({ draftId: 5, draftVersion: 2, action: 'approve', actorId: 'chat-1' }, completed, new Set(['chat-1'])), /no longer actionable/);
});
