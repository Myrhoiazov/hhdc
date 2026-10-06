import { classNames } from '@/shared/lib/classNames/classNames';
import { useTranslation } from 'react-i18next';
import { memo, useCallback } from 'react';
import { Select } from '@/shared/ui/Select/Select';
import { TransactionCategory } from '../../model/types/transactionCategory';

interface TransactionCategorySelectProps {
    className?: string;
    value?: TransactionCategory;
    onChange?: (value: TransactionCategory) => void;
}

const options = [
    { value: TransactionCategory.AUTO, content: TransactionCategory.AUTO },
    { value: TransactionCategory.HEALTH, content: TransactionCategory.HEALTH },
    { value: TransactionCategory.HUIS, content: TransactionCategory.HUIS },
    { value: TransactionCategory.KOMUNALKA, content: TransactionCategory.KOMUNALKA },
    { value: TransactionCategory.PHARMACY, content: TransactionCategory.PHARMACY },
    { value: TransactionCategory.PRODUCTS, content: TransactionCategory.PRODUCTS },
    { value: TransactionCategory.OTHER, content: TransactionCategory.OTHER },
];

export const TransactionCategorySelect = memo((props: TransactionCategorySelectProps) => {
    const { className, onChange, value } = props;
    const { t } = useTranslation();

    const onChangeHandler = useCallback(
        (value: TransactionCategory) => {
            onChange?.(value);
        },
        [onChange]
    );

    return (
        <Select
            className={classNames('', {}, [className])}
            label={t('Укажите категорию')}
            options={options}
            value={value}
            onChange={onChangeHandler}
        />
    );
});
