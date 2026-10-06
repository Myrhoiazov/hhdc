import { useState } from 'react';
import { MollieSubscription } from '@/entities/MollieSubscription';
import { today } from './subscriptionDropdownConst';

export interface SubscriptionFormState {
    mandateId: string;
    amountValue: string;
    interval: string;
    startDate: string;
    description: string;
    times: string;
}

export const useSubscriptionForm = (subscription: MollieSubscription, defaultMandateId: string) => {
    const [form, setForm] = useState<SubscriptionFormState>({
        mandateId: subscription.mandateId ?? defaultMandateId,
        amountValue: subscription.amount?.value ?? '',
        interval: subscription.interval ?? '1 month',
        startDate: subscription.nextPaymentDate?.slice(0, 10) ?? today,
        description: subscription.description ?? '',
        times: subscription.times ? String(subscription.times) : '',
    });
    const [restartDate, setRestartDate] = useState(today);

    return {
        form, setForm, restartDate, setRestartDate,
    };
};
