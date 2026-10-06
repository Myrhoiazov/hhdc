import { useTranslation } from 'react-i18next';
import { Select } from '@/shared/ui/Select/Select';
import { memo, useCallback } from 'react';
import { ClientStatusKey, ClientStatusLabels } from '../../model/types/status';
import { classNames } from '@/shared/lib/classNames/classNames';

interface ClientStatusSelectProps {
    className?: string;
    value?: ClientStatusKey;
    onChange?: (value: ClientStatusKey) => void;
    readonly?: boolean;
}

const options = [
    { value: ClientStatusKey.bronze, content: ClientStatusLabels.bronze },
    { value: ClientStatusKey.gold, content: ClientStatusLabels.gold },
    { value: ClientStatusKey.silver, content: ClientStatusLabels.silver },
];

export const ClientStatusSelect = memo(
    ({ className, value, onChange, readonly }: ClientStatusSelectProps) => {
        const { t } = useTranslation();

        const onChangeHandler = useCallback(
            (value: string) => {
                onChange?.(value as ClientStatusKey);
            },
            [onChange]
        );

        return (
            <Select
                className={classNames('', {}, [className])}
                label={t('Укажите статус')}
                options={options}
                value={value}
                onChange={onChangeHandler}
                readonly={readonly}
            />
        );
    }
);
