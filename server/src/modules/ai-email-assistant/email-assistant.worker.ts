import { aiConfig } from '../../config/ai.config';
import { logger } from '../../common/logger';
import {
    createPrismaAiEmailRepository,
    persistClassification,
    type AiEmailRepository,
} from './email-assistant.persistence';
import { classifyEmail, type LlmClient } from './email-assistant.service';
import { OllamaLlmClient } from './ollama.client';

export interface ClassificationRunResult {
    processed: number;
    failed: number;
}

export const classifyPendingAiEmails = async (
    repository: AiEmailRepository = createPrismaAiEmailRepository(),
    llmClient: LlmClient = new OllamaLlmClient(),
    limit = aiConfig.maxConcurrency,
): Promise<ClassificationRunResult> => {
    const pending = await repository.findPendingEmails(Math.max(1, limit));
    const result: ClassificationRunResult = { processed: 0, failed: 0 };

    for (const email of pending) {
        try {
            const classified = await classifyEmail({
                fromAddress: email.sender,
                subject: email.subject,
                text: email.normalizedBody,
            }, llmClient);
            await persistClassification(repository, email.id, classified.classification);
            result.processed += 1;
        } catch (error) {
            await repository.markFailed(email.id);
            result.failed += 1;
            logger.error(`[AiEmailClassification] Failed email=${email.id}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    return result;
};
