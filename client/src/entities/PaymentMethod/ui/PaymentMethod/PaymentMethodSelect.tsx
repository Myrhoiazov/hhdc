import { useTranslation } from 'react-i18next';
import { Select } from '@/shared/ui/Select/Select';
import { memo, useCallback } from 'react';
import { PaymentMethod } from '../../model/types/paymentMethod';
import { classNames } from '@/shared/lib/classNames/classNames';

interface PaymentMethodSelectProps {
    className?: string;
    value?: PaymentMethod;
    onChange?: (value: PaymentMethod) => void;
    readonly?: boolean;
}

const options = [
    { value: PaymentMethod.CASH, content: PaymentMethod.CASH },
    { value: PaymentMethod.CARD, content: PaymentMethod.CARD },
    { value: PaymentMethod.BANK_TRANSFER, content: PaymentMethod.BANK_TRANSFER },
];

export const PaymentMethodSelect = memo(
    ({ className, value, onChange, readonly }: PaymentMethodSelectProps) => {
        const { t } = useTranslation();

        const onChangeHandler = useCallback(
            (value: PaymentMethod) => {
                onChange?.(value);
            },
            [onChange]
        );

        return (
            <Select
                className={classNames('', {}, [className])}
                label={t('Метод оплаты')}
                options={options}
                value={value}
                onChange={onChangeHandler}
                readonly={readonly}
            />
        );
    }
);
