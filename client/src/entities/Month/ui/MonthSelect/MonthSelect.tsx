import { useTranslation } from 'react-i18next';
import { Select } from '@/shared/ui/Select/Select';
import { memo, useCallback, useMemo } from 'react';
import { Month } from '../../model/types/month';
import { classNames } from '@/shared/lib/classNames/classNames';

interface MonthSelectProps {
    className?: string;
    value?: Month;
    onChange?: (value: Month) => void;
    readonly?: boolean;
}

const options = [
    { value: Month.JANUARY, content: Month.JANUARY },
    { value: Month.FEBRUARY, content: Month.FEBRUARY },
    { value: Month.MARCH, content: Month.MARCH },
    { value: Month.APRIL, content: Month.APRIL },
    { value: Month.MAY, content: Month.MAY },
    { value: Month.JUNE, content: Month.JUNE },
    { value: Month.JULY, content: Month.JULY },
    { value: Month.AUGUST, content: Month.AUGUST },
    { value: Month.SEPTEMBER, content: Month.SEPTEMBER },
    { value: Month.OCTOBER, content: Month.OCTOBER },
    { value: Month.NOVEMBER, content: Month.NOVEMBER },
    { value: Month.DECEMBER, content: Month.DECEMBER },
];

export const MonthSelect = memo(({ className, value, onChange, readonly }: MonthSelectProps) => {
    const { t } = useTranslation();

    const onChangeHandler = useCallback(
        (value: string) => {
            onChange?.(value as Month);
        },
        [onChange]
    );

    const selectMonth = useMemo(() => {
        const key: string | undefined = value;
        return key && key in Month ? Month[key as keyof typeof Month] : undefined;
    }, [value]);

    return (
        <Select
            className={classNames('', {}, [className])}
            label={t('Укажите месяц')}
            options={options}
            value={selectMonth}
            onChange={onChangeHandler}
            readonly={readonly}
        />
    );
});
