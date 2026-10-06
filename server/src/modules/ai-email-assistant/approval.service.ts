import { z } from 'zod';

export const draftActionSchema = z.object({
    draftId: z.number().int().positive(),
    draftVersion: z.number().int().positive(),
    action: z.enum(['approve', 'edit', 'reject', 'spam']),
    actorId: z.string().trim().min(1).max(191),
    editedBody: z.string().trim().min(1).max(6_000).optional(),
}).strict();

export type DraftAction = z.infer<typeof draftActionSchema>;
export type DraftApprovalStatus = 'GENERATED' | 'EDITED' | 'APPROVED' | 'REJECTED' | 'SPAM';

export interface DraftApprovalTarget {
    id: number;
    version: number;
    status: DraftApprovalStatus;
}

export interface DraftApprovalRepository {
    findDraftVersion(draftId: number, version: number): Promise<DraftApprovalTarget | null>;
    transitionDraft(draftId: number, version: number, status: Exclude<DraftApprovalStatus, 'GENERATED'>, editedBody?: string): Promise<void>;
    recordApproval(input: { draftId: number; draftVersion: number; action: Uppercase<DraftAction['action']>; actorId: string; editedBody?: string }): Promise<void>;
}

export const parseAllowedTelegramActors = (value: string | undefined): Set<string> => new Set(
    (value ?? '').split(',').map((item) => item.trim()).filter(Boolean),
);

export const applyDraftAction = async (
    input: DraftAction,
    repository: DraftApprovalRepository,
    allowedActors: ReadonlySet<string>,
) => {
    const action = draftActionSchema.parse(input);
    if (!allowedActors.has(action.actorId)) throw new Error('Telegram actor is not authorized');
    if (action.action === 'edit' && !action.editedBody) throw new Error('editedBody is required for edit');

    const target = await repository.findDraftVersion(action.draftId, action.draftVersion);
    if (!target) throw new Error('Draft version not found');
    if (!['GENERATED', 'EDITED'].includes(target.status)) throw new Error('Draft version is no longer actionable');

    const status = action.action === 'approve' ? 'APPROVED'
        : action.action === 'edit' ? 'EDITED'
            : action.action === 'reject' ? 'REJECTED' : 'SPAM';
    await repository.transitionDraft(action.draftId, action.draftVersion, status, action.editedBody);
    await repository.recordApproval({
        draftId: action.draftId,
        draftVersion: action.draftVersion,
        action: action.action.toUpperCase() as Uppercase<DraftAction['action']>,
        actorId: action.actorId,
        editedBody: action.editedBody,
    });
    return { ...target, status };
};
