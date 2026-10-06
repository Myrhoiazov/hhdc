import { memo, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Select } from '@/shared/ui/Select/Select';
import { classNames } from '@/shared/lib/classNames/classNames';
import { MollieClient } from '@/entities/MollieClient';

interface CustomersSelectProps {
    className?: string;
    onChange?: (value: MollieClient) => void;
    options?: MollieClient[];
    value?: MollieClient;
}

export const CustomersSelect = memo((props: CustomersSelectProps) => {
    const { className, value, onChange, options } = props;
    const { t } = useTranslation();

    const selectOptions = options?.map((cst) => {
        let fullName: string = '';
        if (cst.givenName && cst.familyName) {
            fullName = `${cst.givenName} ${cst.familyName}`;
        } else {
            fullName = cst.mollieId ?? '';
        }
        return {
            value: String(cst.id),
            content: fullName,
        };
    });

    const onChangeHandler = useCallback(
        (id: string) => {
            const customer = options?.find((p) => String(p.id) === id);
            onChange?.(customer as MollieClient);
        },
        [onChange, options]
    );

    const selectDoctor = useMemo(() => {
        return options?.find((p) => String(p.id) === String(value?.id));
    }, [value, options]);

    return (
        <Select
            defaultValue={t('Выберите клиента')}
            className={classNames('', {}, [className])}
            label={t('Выберите клиента')}
            options={selectOptions || []}
            value={selectDoctor?.id}
            onChange={onChangeHandler}
        />
    );
});
