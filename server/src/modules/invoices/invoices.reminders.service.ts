import cron from 'node-cron';
import { sendDueInvoiceReminders } from './invoices.delivery.service';

export const startInvoiceReminderCron = () => {
    cron.schedule('0 9 * * *', async () => {
        console.log('[Cron] Sending invoice reminders...');
        await sendDueInvoiceReminders();
    });
};
