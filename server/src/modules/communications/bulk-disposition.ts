import { z } from 'zod';
import { ApiError } from '../../common/http';
import { logger } from '../../common/logger';
import { applyConversationDisposition } from './disposition';

export const MAX_BULK_CONVERSATIONS = 100;

export const bulkDispositionSchema = z.object({
    ids: z.array(z.string().uuid()).min(1).max(MAX_BULK_CONVERSATIONS),
    disposition: z.enum(['SPAM', 'TRASH']),
}).strict();

export type BulkDispositionInput = z.infer<typeof bulkDispositionSchema>;

export interface BulkDispositionResult {
    applied: string[];
    failed: { id: string; code: string }[];
}

type ApplyOne = (conversationId: string, disposition: BulkDispositionInput['disposition'], actorUserId: string) => Promise<unknown>;

// Only the code of an expected refusal reaches the client; anything else stays in the server log.
const failureCode = (conversationId: string, cause: unknown): string => {
    if (cause instanceof ApiError) return cause.code;
    logger.error(`[bulk-disposition] conversation=${conversationId} ${cause instanceof Error ? cause.message : String(cause)}`);
    return 'DISPOSITION_FAILED';
};

// One at a time: a mailbox that refuses one conversation must not stop the others,
// and the mailbox provider is not flooded with parallel requests.
export const applyBulkDisposition = async (
    input: BulkDispositionInput,
    actorUserId: string,
    applyOne: ApplyOne = applyConversationDisposition,
): Promise<BulkDispositionResult> => {
    const result: BulkDispositionResult = { applied: [], failed: [] };
    for (const id of new Set(input.ids)) {
        try {
            await applyOne(id, input.disposition, actorUserId);
            result.applied.push(id);
        } catch (cause) {
            result.failed.push({ id, code: failureCode(id, cause) });
        }
    }
    return result;
};
