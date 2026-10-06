import cron from 'node-cron';
import { getPaymentReminderSettings, runPaymentReminders } from './payment-reminders.service';

// Ticks every minute and compares against the configured sendHour/sendMinute, since the send
// time is stored in the DB and can change at runtime — a fixed cron expression can't react to
// that. No explicit timezone is passed, matching service.InvoiceReminders.ts/service.EmailSyncCron.ts,
// which both rely on the server's local timezone.
export const startPaymentReminderCron = () => {
    cron.schedule('* * * * *', async () => {
        const settings = await getPaymentReminderSettings();
        if (!settings.enabled) return;

        const now = new Date();
        if (now.getHours() !== settings.sendHour || now.getMinutes() !== settings.sendMinute) return;

        console.log('[Cron] Sending payment reminders...');
        try {
            const result = await runPaymentReminders();
            console.log(`[Cron] Payment reminders: sent=${result.sent} skipped=${result.skipped} failed=${result.failed} alreadyQueued=${result.alreadyQueued}`);
        } catch (error) {
            console.error('[Cron] Payment reminders run failed:', error);
        }
    });
};
