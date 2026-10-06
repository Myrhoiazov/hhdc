import { useState } from 'react';
import { toast } from 'react-toastify';
import { $apiPrivate } from '@/shared/api/api';
import { Invoice, InvoiceStatus } from '../../model/types';
import { InvoiceAction, ActionResult } from '../InvoiceActionModal/InvoiceActionModal';
import { buildInvoiceActionRequest } from './invoiceActionRequests';

const errorMessage = (error: any, fallback: string) => error?.response?.data?.message ?? fallback;

export const useInvoiceActions = (fetchInvoices: () => Promise<void>) => {
    const [activeAction, setActiveAction] = useState<InvoiceAction | null>(null);

    const updateStatus = async (invoice: Invoice, nextStatus: Extract<InvoiceStatus, 'ISSUED' | 'CANCELLED'>) => {
        try {
            await $apiPrivate.patch(`/invoices/${invoice.id}/status`, { status: nextStatus });
            toast.success(nextStatus === 'CANCELLED' ? 'Инвойс и активные платежи Mollie отменены' : 'Статус обновлён');
            fetchInvoices();
        } catch (error) {
            toast.error(errorMessage(error, 'Не удалось обновить статус'));
        }
    };

    const handleActionConfirm = async (result: ActionResult) => {
        if (!activeAction) return;
        const { invoice } = activeAction;
        setActiveAction(null);

        try {
            const { run, successMessage } = buildInvoiceActionRequest(invoice.id, result);
            await run();
            toast.success(successMessage);
            fetchInvoices();
        } catch (error) {
            toast.error(errorMessage(error, 'Не удалось выполнить действие'));
        }
    };

    return {
        activeAction, setActiveAction, updateStatus, handleActionConfirm,
    };
};
