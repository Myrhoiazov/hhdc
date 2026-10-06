import config from './config/config';
import server from './app';
import prisma from '../prisma/prisma-client';
import { startInvoiceReminderCron } from './modules/invoices/invoices.reminders.service';
import { startEmailSyncCron } from './modules/communication/email/email-sync-cron.service';
import { startPaymentReminderCron } from './modules/payment-reminders/payment-reminders.cron.service';
import { startAuthSecurityCleanupCron } from './modules/auth/auth.security-cleanup.service';
import { startAiEmailClassificationCron, startAiEmailDraftCron, startAiEmailSendCron, startTelegramApprovalPolling } from './modules/ai-email-assistant';

const start = async () => {
    try {
        server.listen(config.port, (error?: Error) => {
            if (error) {
                console.error('Error starting server:', error);
                return;
            }
            console.log(`Server is running on port ${config.port}`);
            startInvoiceReminderCron();
            startEmailSyncCron();
            startPaymentReminderCron();
            startAuthSecurityCleanupCron();
            startAiEmailClassificationCron();
            startAiEmailDraftCron();
            startAiEmailSendCron();
            startTelegramApprovalPolling();
        });
    } catch (e) {
        console.error('error message:', e instanceof Error ? e.message : e);
        prisma.$disconnect();
        process.exit(1);
    }
};

start();
