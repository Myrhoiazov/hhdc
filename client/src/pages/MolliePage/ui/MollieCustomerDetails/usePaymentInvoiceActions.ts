import { toast } from 'react-toastify';
import { $apiPrivate } from '@/shared/api/api';
import { MolliePayment } from '@/entities/MollieClient';

const loadPaymentInvoice = async (payment: MolliePayment) => {
    const response = await $apiPrivate.get(`/mollie/payments/${payment.id}/invoice.pdf`, {
        responseType: 'blob',
    });
    return URL.createObjectURL(response.data);
};

export const usePaymentInvoiceActions = () => {
    const previewPaymentInvoice = async (payment: MolliePayment) => {
        const previewWindow = window.open('', '_blank');
        if (previewWindow) {
            previewWindow.opener = null;
            previewWindow.document.title = 'Загрузка инвойса...';
        }
        try {
            const url = await loadPaymentInvoice(payment);
            if (previewWindow) {
                previewWindow.location.href = url;
            } else {
                window.open(url, '_blank', 'noopener,noreferrer');
            }
            window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
        } catch {
            previewWindow?.close();
            toast.error('Не удалось открыть инвойс платежа');
        }
    };

    const downloadPaymentInvoice = async (payment: MolliePayment) => {
        try {
            const url = await loadPaymentInvoice(payment);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${payment.mollieId || `mollie-payment-${payment.id}`}.pdf`;
            link.click();
            URL.revokeObjectURL(url);
        } catch {
            toast.error('Не удалось скачать инвойс платежа');
        }
    };

    return { previewPaymentInvoice, downloadPaymentInvoice };
};
