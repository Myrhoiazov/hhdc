import cron from 'node-cron';
import prisma from '../../../prisma/prisma-client';

export const AUTH_SECURITY_EVENT_RETENTION_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;

export const authSecurityEventCutoffDate = (now: Date = new Date()): Date => (
    new Date(now.getTime() - AUTH_SECURITY_EVENT_RETENTION_DAYS * DAY_MS)
);

const cleanupAuthSecurityEvents = async () => {
    const result = await prisma.authSecurityEvent.deleteMany({
        where: { createdAt: { lt: authSecurityEventCutoffDate() } },
    });
    return { deleted: result.count };
};

// Nightly, off-peak — matches the daily cadence of service.InvoiceReminders.ts.
export const startAuthSecurityCleanupCron = () => {
    cron.schedule('30 3 * * *', async () => {
        console.log('[Cron] Cleaning up expired auth security events...');
        try {
            const result = await cleanupAuthSecurityEvents();
            console.log(`[Cron] Auth security event cleanup: deleted=${result.deleted}`);
        } catch (error) {
            console.error('[Cron] Auth security event cleanup failed:', error);
        }
    });
};
