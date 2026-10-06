import type { PaymentCustomer } from './types';

export const issueStatuses = ['failed', 'canceled', 'expired', 'charged_back', 'chargeback'];

export const restartableSubscriptionStatuses = ['canceled', 'cancelled', 'completed'];

export const today = new Date().toISOString().slice(0, 10);

export const formatAmount = (value?: string | number, currency = 'EUR') => (
    new Intl.NumberFormat('nl-NL', {
        style: 'currency',
        currency,
    }).format(Number(value ?? 0))
);

export const formatDate = (value?: string) => {
    if (!value) {
        return '—';
    }

    return new Date(value).toLocaleDateString('nl-NL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
};

export const getPayerName = (customer?: PaymentCustomer | null) => (
    customer?.payerName
    || [customer?.givenName, customer?.familyName].filter(Boolean).join(' ')
    || customer?.email
    || customer?.mollieId
    || 'Плательщик'
);
