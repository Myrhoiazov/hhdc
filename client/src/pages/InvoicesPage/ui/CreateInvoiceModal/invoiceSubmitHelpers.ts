import { $apiPrivate } from '@/shared/api/api';
import { toast } from 'react-toastify';
import { Invoice, InvoiceStatus } from '../../model/types';
import type { FormItem } from './useCreateInvoiceModal';

export const validateInvoiceSubmission = (
    billToName: string, items: FormItem[], paidMode: boolean, totalCents: number,
): string | null => {
    if (!billToName.trim() || items.some((item) => !item.description.trim())) {
        return 'Укажите получателя и описание каждой строки';
    }
    if (paidMode && totalCents <= 0) {
        return 'Сумма черновика должна быть больше нуля';
    }
    return null;
};

export interface InvoiceSubmitFields {
    clientId: string;
    businessBrandId: string;
    billToName: string;
    billToEmail: string;
    issueDate: string;
    dueDate: string;
    status: Extract<InvoiceStatus, 'DRAFT' | 'ISSUED'>;
    issuerName: string;
    issuerAddress: string;
    issuerEmail: string;
    bankName: string;
    iban: string;
    note: string;
    showPaymentButton: boolean;
    showPaymentQr: boolean;
    items: FormItem[];
    paidMode: boolean;
}

export const buildInvoicePayload = (fields: InvoiceSubmitFields) => ({
    clientId: fields.clientId ? Number(fields.clientId) : null,
    businessBrandId: fields.businessBrandId ? Number(fields.businessBrandId) : null,
    billToName: fields.billToName, billToEmail: fields.billToEmail, issueDate: fields.issueDate,
    dueDate: fields.paidMode ? null : fields.dueDate || null,
    status: fields.status, issuerName: fields.issuerName, issuerAddress: fields.issuerAddress,
    issuerEmail: fields.issuerEmail, bankName: fields.bankName, iban: fields.iban,
    note: fields.note || null,
    showPaymentButton: fields.paidMode ? false : fields.showPaymentButton,
    showPaymentQr: fields.paidMode ? false : fields.showPaymentQr,
    items: fields.items.map((item) => ({
        groupId: item.groupId ? Number(item.groupId) : null,
        description: item.description,
        period: item.period || null,
        quantity: item.quantity,
        unitPriceCents: Math.round(Number(item.price || 0) * 100),
    })),
});

export const persistInvoicePayload = async (
    payload: ReturnType<typeof buildInvoicePayload>, editInvoice: Invoice | null | undefined, paidMode: boolean,
) => {
    if (editInvoice) {
        await $apiPrivate.put(`/invoices/${editInvoice.id}`, payload);
        toast.success('Инвойс обновлён');
        return;
    }
    if (paidMode) {
        await $apiPrivate.post('/invoices', {
            ...payload, status: 'DRAFT', dueDate: null, showPaymentButton: false, showPaymentQr: false,
        });
        toast.success('Черновик сохранён. Проверьте его и подтвердите оплату в списке.');
        return;
    }
    await $apiPrivate.post('/invoices', payload);
    toast.success('Инвойс создан');
};
