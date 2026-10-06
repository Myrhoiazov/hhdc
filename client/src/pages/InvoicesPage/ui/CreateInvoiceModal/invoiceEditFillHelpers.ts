import { Invoice } from '../../model/types';
import { dateInputValue, emptyItem, inFiveBusinessDays, today, type useInvoiceFormState } from './useCreateInvoiceModal';

type InvoiceFormState = ReturnType<typeof useInvoiceFormState>;

export const fillFormFromInvoice = (formState: InvoiceFormState, editInvoice: Invoice) => {
    formState.setClientId(editInvoice.client?.id ? String(editInvoice.client.id) : '');
    formState.setBusinessBrandId(editInvoice.businessBrandId ? String(editInvoice.businessBrandId) : '');
    formState.setAddressSource('manual');
    formState.setBillToName(editInvoice.billToName);
    formState.setBillToEmail(editInvoice.billToEmail ?? '');
    formState.setIssueDate(dateInputValue(editInvoice.issueDate));
    formState.setDueDate(dateInputValue(editInvoice.dueDate));
    formState.setStatus(editInvoice.status === 'DRAFT' ? 'DRAFT' : 'ISSUED');
    formState.setIssuerName(editInvoice.issuerName);
    formState.setIssuerAddress(editInvoice.issuerAddress ?? '');
    formState.setIssuerEmail(editInvoice.issuerEmail ?? '');
    formState.setBankName(editInvoice.bankName ?? '');
    formState.setIban(editInvoice.iban ?? '');
    formState.setNote(editInvoice.note ?? '');
    formState.setShowPaymentButton(editInvoice.showPaymentButton);
    formState.setShowPaymentQr(editInvoice.showPaymentQr);
    formState.setItems(editInvoice.items.map((item) => ({
        groupId: item.group?.id ? String(item.group.id) : '',
        description: item.description,
        period: item.period ?? '',
        quantity: item.quantity,
        price: (item.unitPriceCents / 100).toFixed(2),
    })));
};

export const resetFormToDefaults = (formState: InvoiceFormState) => {
    formState.setClientId('');
    formState.setBusinessBrandId('');
    formState.setAddressSource('manual');
    formState.setBillToName('');
    formState.setBillToEmail('');
    formState.setIssueDate(today());
    formState.setDueDate(inFiveBusinessDays());
    formState.setStatus('DRAFT');
    formState.setIssuerName('Talent Center DDC');
    formState.setIssuerAddress('');
    formState.setIssuerEmail('');
    formState.setBankName('');
    formState.setIban('');
    formState.setNote('');
    formState.setShowPaymentButton(true);
    formState.setShowPaymentQr(true);
    formState.setItems([emptyItem()]);
};
