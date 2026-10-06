import { useTranslation } from 'react-i18next';
import { memo } from 'react';
import { Input } from '@/shared/ui/Input/Input';
import Textarea from '@/shared/ui/Textarea/Textarea';
import { Transaction } from '@/entities/Transaction';

interface TransactionAmountFieldsProps {
    data?: Transaction;
    onChangeDate?: (value?: string) => void;
    onChangeSum?: (value?: string) => void;
    onChangeDescription?: (value?: string) => void;
}

export const TransactionAmountFields = memo((props: TransactionAmountFieldsProps) => {
    const { data, onChangeDate, onChangeSum, onChangeDescription } = props;
    const { t } = useTranslation();

    return (
        <>
            <Input
                fullWidth
                label="Дата:"
                type="date"
                placeholder={t('12.02.2025')}
                onChange={onChangeDate}
                value={data?.date ?? ''}
            />
            <Input
                fullWidth
                label="Сумма:"
                type="text"
                placeholder={t('100.00')}
                onChange={onChangeSum}
                value={data?.amount ?? ''}
            />
            <Textarea
                placeholder="Дополнительная информация:"
                fullWidth
                value={data?.description}
                onChange={onChangeDescription}
            />
        </>
    );
});