import { useEffect, useState } from 'react';
import { $apiPrivate } from '@/shared/api/api';

export interface UpcomingSubscription {
    id: number;
    mollieId?: string;
    description: string;
    amountValue: string | number;
    amountCurrency: string;
    interval: string;
    nextPaymentDate: string;
    mandate?: {
        mollieId?: string;
        status: string;
        method: string;
    } | null;
    customer: {
        id: number;
        payerName?: string;
        givenName?: string;
        familyName?: string;
        email?: string;
        client?: { id: number; firstName?: string; lastName?: string } | null;
        clientLinks?: Array<{ client?: { id: number; firstName?: string; lastName?: string } | null }>;
    };
}

export interface UpcomingSubscriptionsResponse {
    items: UpcomingSubscription[];
    total: number;
    amount: number;
    currency: string;
}

export const useUpcomingSubscriptions = (upcomingMonth: string, reloadKey: number) => {
    const [upcoming, setUpcoming] = useState<UpcomingSubscriptionsResponse>();
    const [isUpcomingLoading, setIsUpcomingLoading] = useState(false);

    useEffect(() => {
        const loadUpcoming = async () => {
            const [year, month] = upcomingMonth.split('-').map(Number);
            if (!year || !month) return;

            setIsUpcomingLoading(true);
            const dateFrom = `${upcomingMonth}-01`;
            const dateTo = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);

            try {
                const response = await $apiPrivate.get<UpcomingSubscriptionsResponse>('/mollie/subscriptions/upcoming', {
                    params: { dateFrom, dateTo },
                });
                setUpcoming(response.data);
            } catch {
                setUpcoming(undefined);
            } finally {
                setIsUpcomingLoading(false);
            }
        };

        loadUpcoming();
    }, [upcomingMonth, reloadKey]);

    return { upcoming, isUpcomingLoading };
};
