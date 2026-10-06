import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { $apiPrivate } from '@/shared/api/api';
import { ReminderLanguage } from './useReminderTemplates';

export type DeliveryStatus = 'PENDING' | 'SENT' | 'FAILED' | 'SKIPPED';

export interface ReminderDelivery {
    id: number;
    targetPaymentDate: string;
    status: DeliveryStatus;
    language: ReminderLanguage;
    recipientEmail: string;
    errorMessage?: string | null;
    createdAt: string;
    subscription?: {
        description: string;
        customer?: {
            client?: { firstName?: string | null; lastName?: string | null } | null;
        } | null;
    };
}

export const useReminderDeliveries = () => {
    const [deliveries, setDeliveries] = useState<ReminderDelivery[]>([]);
    const [deliveriesStatusFilter, setDeliveriesStatusFilter] = useState('');
    const [isDeliveriesLoading, setIsDeliveriesLoading] = useState(true);

    const loadDeliveries = useCallback((status: string) => {
        setIsDeliveriesLoading(true);
        return $apiPrivate.get<ReminderDelivery[]>('/payment-reminders/deliveries', { params: status ? { status } : undefined })
            .then(({ data }) => setDeliveries(data))
            .catch(() => toast.error('Не удалось загрузить историю рассылки'))
            .finally(() => setIsDeliveriesLoading(false));
    }, []);

    useEffect(() => { loadDeliveries(deliveriesStatusFilter); }, [loadDeliveries, deliveriesStatusFilter]);

    return {
        deliveries, deliveriesStatusFilter, setDeliveriesStatusFilter, isDeliveriesLoading, loadDeliveries,
    };
};
