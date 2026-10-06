import { toast } from 'react-toastify';
import { $apiPrivate } from '@/shared/api/api';
import { Invoice } from '../../model/types';

const errorMessage = (error: any, fallback: string) => error?.response?.data?.message ?? fallback;

export const useInvoiceDelivery = (fetchInvoices: () => Promise<void>) => {
    const createMolliePaymentLink = async (invoice: Invoice) => {
        try {
            const response = await $apiPrivate.post<{ checkoutUrl: string }>(`/invoices/${invoice.id}/mollie-payment-link`);
            window.open(response.data.checkoutUrl, '_blank', 'noopener,noreferrer');
            toast.success('Ссылка Mollie готова');
            fetchInvoices();
        } catch (error) {
            toast.error(errorMessage(error, 'Не удалось создать ссылку Mollie'));
        }
    };

    const sendEmail = async (invoice: Invoice) => {
        const resend = invoice.deliveries.some((delivery) => delivery.status === 'SENT');
        try {
            await $apiPrivate.post(`/invoices/${invoice.id}/send`, { resend });
            toast.success(resend ? 'Инвойс отправлен повторно' : 'Инвойс отправлен');
        } catch (error) {
            toast.error(errorMessage(error, 'Не удалось отправить инвойс'));
        } finally {
            fetchInvoices();
        }
    };

    return { createMolliePaymentLink, sendEmail };
};
