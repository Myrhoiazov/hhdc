import { useTranslation } from 'react-i18next';
import { Select } from '@/shared/ui/Select/Select';
import { memo, useCallback } from 'react';
import { RoleKey, RoleLabels } from '../../model/types/role';
import { classNames } from '@/shared/lib/classNames/classNames';

interface RoleSelectProps {
    className?: string;
    value?: RoleKey;
    onChange?: (value: RoleKey) => void;
    readonly?: boolean;
}

const options = [
    { value: RoleKey.ADMIN, content: RoleLabels.ADMIN },
    { value: RoleKey.MANAGER, content: RoleLabels.MANAGER },
    { value: RoleKey.GUEST, content: RoleLabels.GUEST },
    { value: RoleKey.DOCTOR, content: RoleLabels.DOCTOR },
];

export const RoleSelect = memo(({ className, value, onChange, readonly }: RoleSelectProps) => {
    const { t } = useTranslation();

    const onChangeHandler = useCallback(
        (value: string) => {
            onChange?.(value as RoleKey);
        },
        [onChange]
    );

    return (
        <Select
            className={classNames('', {}, [className])}
            label={t('Укажите роль')}
            options={options}
            value={value}
            onChange={onChangeHandler}
            readonly={readonly}
        />
    );
});
