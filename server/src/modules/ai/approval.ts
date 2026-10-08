import { ApiError } from '../../common/http';

// A draft a person can still act on.
export const OPEN_DRAFT_STATUSES = ['GENERATED', 'EDITED'] as const;

// Discarding is safe to repeat: a draft that is already discarded stays discarded. A draft that
// was approved or sent is part of the correspondence and cannot be thrown away.
export const discardOutcome = (status: string): 'discard' | 'already_discarded' => {
    if ((OPEN_DRAFT_STATUSES as readonly string[]).includes(status)) return 'discard';
    if (status === 'REJECTED' || status === 'FAILED') return 'already_discarded';
    throw new ApiError(409, 'INVALID_DRAFT_STATUS', 'An approved or sent draft cannot be discarded');
};

export const assertDraftCanApprove = (status: string) => {
    if (!['GENERATED', 'EDITED'].includes(status)) {
        throw new ApiError(409, 'INVALID_DRAFT_STATUS', 'Draft cannot be approved');
    }
};

export const assertDraftCanSend = (draft: { status: string; approvedBy: string | null; approvedAt: Date | null }) => {
    if (draft.status !== 'APPROVED' || !draft.approvedBy || !draft.approvedAt) {
        throw new ApiError(409, 'DRAFT_APPROVAL_REQUIRED', 'Human approval is required before sending');
    }
};
