import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Select } from '@/shared/ui/Select/Select';
import { classNames } from '@/shared/lib/classNames/classNames';
import { MandateMethod } from '../../model/types/mandatemethod';

interface MandateMethodSelectProps {
    className?: string;
    onChange?: (value: MandateMethod) => void;
    value?: MandateMethod;
}

const options = [
    { value: MandateMethod.CREDITCARD, content: MandateMethod.CREDITCARD },
    { value: MandateMethod.DIRECTDEBIT, content: MandateMethod.DIRECTDEBIT },
    { value: MandateMethod.PAYPAL, content: MandateMethod.PAYPAL },
];

export const MandateMethodSelect = memo((props: MandateMethodSelectProps) => {
    const { className, onChange, value } = props;
    const { t } = useTranslation();

    const onChangeHandler = useCallback(
        (value: MandateMethod) => {
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
