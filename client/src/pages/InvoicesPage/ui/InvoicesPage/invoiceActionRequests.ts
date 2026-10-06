import { $apiPrivate } from '@/shared/api/api';
import { ActionResult } from '../InvoiceActionModal/InvoiceActionModal';

// Maps a confirmed InvoiceActionModal result to the request that carries it
// out and the toast to show on success — isolates the branching so callers
// stay a plain try/await/catch.
export const buildInvoiceActionRequest = (invoiceId: number, result: ActionResult): {
    run: () => Promise<unknown>;
    successMessage: string;
} => {
    switch (result.type) {
        case 'record-payment':
            return {
                run: () => $apiPrivate.post(`/invoices/${invoiceId}/payments`, result.data),
                successMessage: 'Оплата зарегистрирована',
            };
        case 'confirm-paid':
            return {
                run: () => $apiPrivate.post(`/invoices/${invoiceId}/confirm-paid`, result.data),
                successMessage: 'Черновик подтверждён как оплаченный',
            };
        case 'create-credit':
            return {
                run: () => $apiPrivate.post(`/invoices/${invoiceId}/adjustments`, { kind: 'CREDIT', ...result.data }),
                successMessage: 'Кредит-нота создана',
            };
        case 'create-debit':
            return {
                run: () => $apiPrivate.post(`/invoices/${invoiceId}/adjustments`, { kind: 'DEBIT', ...result.data }),
                successMessage: 'Корректировка создана',
            };
        case 'cancel':
            return {
                run: () => $apiPrivate.patch(`/invoices/${invoiceId}/status`, { status: 'CANCELLED' }),
                successMessage: 'Инвойс и активные платежи Mollie отменены',
            };
        default:
            throw new Error(`Unknown invoice action type: ${(result as { type: string }).type}`);
    }
};
