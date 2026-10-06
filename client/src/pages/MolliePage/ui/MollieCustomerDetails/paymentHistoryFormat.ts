import { MolliePayment } from '@/entities/MollieClient';

export const paymentDate = (payment: MolliePayment) => payment.paidAt || payment.createdAt || payment.updatedAt;

export const formatDate = (value?: string) => {
    if (!value) {
        return 'Без даты';
    }

    return new Date(value).toLocaleDateString('nl-NL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
};

export const formatAmount = (payment: MolliePayment) => {
    const amount = Number(payment.amountValue ?? 0);
    const currency = payment.amountCurrency || 'EUR';

    return new Intl.NumberFormat('nl-NL', {
        style: 'currency',
        currency,
    }).format(Number.isFinite(amount) ? amount : 0);
};

export const paymentStatusLabel: Record<string, string> = {
    paid: 'Оплачено',
    canceled: 'Отменено',
    cancelled: 'Отменено',
    failed: 'Ошибка',
    expired: 'Истекло',
    pending: 'Ожидает',
    open: 'Открыто',
    charged_back: 'Chargeback',
    chargeback: 'Chargeback',
};

export const groupPaymentsByDate = (payments: MolliePayment[]) => {
    const sortedPayments = [...payments].sort((first, second) => {
        const firstDate = paymentDate(first) ? new Date(paymentDate(first) as string).getTime() : 0;
        const secondDate = paymentDate(second) ? new Date(paymentDate(second) as string).getTime() : 0;
        return secondDate - firstDate;
    });

    return sortedPayments.reduce<Record<string, MolliePayment[]>>((acc, payment) => {
        const date = formatDate(paymentDate(payment));
        acc[date] = acc[date] ? [...acc[date], payment] : [payment];
        return acc;
    }, {});
};
