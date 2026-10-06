import { useCallback } from 'react';
import { toast } from 'react-toastify';
import { $apiPrivate } from '@/shared/api/api';
import type { ClientPayment } from './types';

export const usePaymentLinkActions = (id: string, reload: () => void) => {
    const onCopyPaymentLink = useCallback(async (checkoutUrl?: string) => {
        if (!checkoutUrl) return;

        try {
            await navigator.clipboard.writeText(checkoutUrl);
            toast.success('Payment link скопирован');
        } catch {
            toast.error('Не удалось скопировать ссылку');
        }
    }, []);

    const onCancelPaymentLink = useCallback(async (payment: ClientPayment) => {
        if (!window.confirm('Отменить payment link? Плательщик больше не сможет им воспользоваться.')) {
            return;
        }

        try {
            await $apiPrivate.post(`/mollie/payments/${payment.id}/cancel`, { clientId: Number(id) });
            toast.success('Payment link отменён');
            reload();
        } catch {
            toast.error('Не удалось отменить payment link');
        }
    }, [id, reload]);

    return { onCopyPaymentLink, onCancelPaymentLink };
};
