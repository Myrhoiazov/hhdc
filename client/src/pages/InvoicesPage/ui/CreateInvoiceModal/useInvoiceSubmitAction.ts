import { useCallback, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Invoice } from '../../model/types';
import { buildInvoicePayload, persistInvoicePayload, validateInvoiceSubmission } from './invoiceSubmitHelpers';
import type { useInvoiceFormState } from './useCreateInvoiceModal';

export const useInvoiceSubmitAction = (
    formState: ReturnType<typeof useInvoiceFormState>,
    editInvoice: Invoice | null | undefined,
    paidMode: boolean,
    onSaved: () => void,
    onClose: () => void,
) => {
    const {
        businessBrandId, clientId, billToName, billToEmail, issueDate, dueDate,
        status, issuerName, issuerAddress, issuerEmail, bankName, iban, note,
        showPaymentButton, showPaymentQr, items, setSaving,
    } = formState;

    const totalCents = useMemo(() => items.reduce((sum, item) => (
        sum + Math.round(Number(item.price || 0) * 100) * Number(item.quantity || 0)
    ), 0), [items]);

    const submit = useCallback(async () => {
        const validationError = validateInvoiceSubmission(billToName, items, paidMode, totalCents);
        if (validationError) {
            toast.error(validationError);
            return;
        }
        setSaving(true);
        try {
            const payload = buildInvoicePayload({
                clientId, businessBrandId, billToName, billToEmail, issueDate, dueDate,
                status, issuerName, issuerAddress, issuerEmail, bankName, iban, note,
                showPaymentButton, showPaymentQr, items, paidMode,
            });
            await persistInvoicePayload(payload, editInvoice, paidMode);
            onSaved();
            onClose();
        } catch (error) {
            const message = axios.isAxiosError(error) ? error.response?.data?.message : undefined;
            toast.error(message || 'Не удалось сохранить инвойс');
        } finally {
            setSaving(false);
        }
    }, [
        billToName, items, paidMode, totalCents, clientId, businessBrandId, billToEmail,
        issueDate, dueDate, status, issuerName, issuerAddress, issuerEmail, bankName,
        iban, note, showPaymentButton, showPaymentQr, editInvoice, onSaved, onClose, setSaving,
    ]);

    return { totalCents, submit };
};
