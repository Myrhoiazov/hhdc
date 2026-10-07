import { ApiError } from '../../common/http';

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
