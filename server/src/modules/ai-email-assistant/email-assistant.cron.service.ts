import cron from 'node-cron';
import { logger } from '../../common/logger';
import { classifyPendingAiEmails } from './email-assistant.worker';

export const startAiEmailClassificationCron = (): boolean => {
    if (process.env.AI_EMAIL_CLASSIFICATION_ENABLED !== 'true') return false;

    cron.schedule('*/5 * * * *', async () => {
        try {
            const result = await classifyPendingAiEmails();
            logger.info(`[AiEmailClassification] processed=${result.processed}, failed=${result.failed}`);
        } catch (error) {
            logger.error(`[AiEmailClassification] batch failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    });
    return true;
};
