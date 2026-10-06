import { useReminderSettings, ReminderSettings, EmailAccountOption } from './useReminderSettings';
import { useReminderTemplates, ReminderLanguage, ReminderTemplate } from './useReminderTemplates';
import { useReminderDeliveries, DeliveryStatus, ReminderDelivery } from './useReminderDeliveries';
import { useReminderRun, RunResult } from './useReminderRun';

export type { ReminderLanguage, DeliveryStatus, ReminderSettings, EmailAccountOption, ReminderTemplate, ReminderDelivery, RunResult };

export const usePaymentReminders = () => {
    const settings = useReminderSettings();
    const templates = useReminderTemplates();
    const deliveries = useReminderDeliveries();
    const run = useReminderRun(() => deliveries.loadDeliveries(deliveries.deliveriesStatusFilter));

    return {
        ...settings,
        ...templates,
        ...deliveries,
        ...run,
    };
};
