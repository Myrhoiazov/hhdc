import { useTranslation } from 'react-i18next';
import { Select } from '@/shared/ui/Select/Select';
import { memo, useCallback } from 'react';
import { TransactionType } from '../../model/types/transactionType';
import { classNames } from '@/shared/lib/classNames/classNames';

interface TransactionSelectProps {
    className?: string;
    value?: TransactionType;
    onChange?: (value: TransactionType) => void;
    readonly?: boolean;
}

const options = [
    { value: TransactionType.INCOME, content: TransactionType.INCOME },
    { value: TransactionType.EXPENSE, content: TransactionType.EXPENSE },
];

export const TransactionSelect = memo(
    ({ className, value, onChange, readonly }: TransactionSelectProps) => {
        const { t } = useTranslation();

        const onChangeHandler = useCallback(
            (value: TransactionType) => {
                onChange?.(value);
            },
            [onChange]
        );

        return (
            <Select
                className={classNames('', {}, [className])}
                label={t('Укажите транзакцию')}
                options={options}
                value={value}
                onChange={onChangeHandler}
                readonly={readonly}
            />
        );
    }
);
