import { useMemo } from 'react';
import { usePaymentHistoryData } from './usePaymentHistoryData';
import { usePaymentInvoiceActions } from './usePaymentInvoiceActions';
import { groupPaymentsByDate } from './paymentHistoryFormat';

export { paymentDate, formatDate, formatAmount, paymentStatusLabel } from './paymentHistoryFormat';

export const usePaymentHistory = (customerId: string) => {
    const { payments, isLoading, error } = usePaymentHistoryData(customerId);
    const { previewPaymentInvoice, downloadPaymentInvoice } = usePaymentInvoiceActions();

    const groupedPayments = useMemo(() => groupPaymentsByDate(payments), [payments]);

    return {
        payments,
        isLoading,
        error,
        groupedPayments,
        previewPaymentInvoice,
        downloadPaymentInvoice,
    };
};
