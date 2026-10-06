import { memo } from 'react';
import { Input } from '@/shared/ui/Input/Input';
import { Select, type SelectOption } from '@/shared/ui/Select/Select';
import type { PaymentLinkPayer } from './PaymentLinkModal';

interface PaymentLinkFormFieldsProps {
    payers: PaymentLinkPayer[];
    payerOptions: SelectOption<string>[];
    payerId: string;
    amount: string;
    description: string;
    isLoading: boolean;
    checkoutUrl: string;
    onPayerChange: (value: string) => void;
    onAmountChange: (value: string) => void;
    onDescriptionChange: (value: string) => void;
}

export const PaymentLinkFormFields = memo((props: PaymentLinkFormFieldsProps) => {
    const { payers, payerOptions, payerId, amount, description, isLoading, checkoutUrl, onPayerChange, onAmountChange, onDescriptionChange } = props;
    if (!payers.length) return null;

    const readonly = isLoading || Boolean(checkoutUrl);
    return (
        <>
            <Select label="Плательщик" options={payerOptions} value={payerId} onChange={onPayerChange} readonly={readonly} />
            <Input fullWidth label="Сумма, EUR" type="number" min="0.01" step="0.01" value={amount} onChange={onAmountChange} readonly={readonly} />
            <Input fullWidth label="Описание" value={description} onChange={onDescriptionChange} readonly={readonly} />
        </>
    );
});
