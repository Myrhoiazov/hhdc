import cron from 'node-cron';
import { logger } from '../../common/logger';
import { runSendPipeline } from './send-pipeline.service';
import { createEmailSmtpSender, createPrismaSendPipelineRepository } from './send.persistence';

export const startAiEmailSendCron = (): boolean => {
    if (process.env.AI_EMAIL_SEND_ENABLED !== 'true') return false;
    cron.schedule('*/5 * * * *', async () => {
        try {
            const result = await runSendPipeline(createPrismaSendPipelineRepository(), createEmailSmtpSender());
            logger.info(`[AiEmailSend] processed=${result.processed}, skipped=${result.skipped}, failed=${result.failed}`);
        } catch (error) {
            logger.error(`[AiEmailSend] batch failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    });
    return true;
};
