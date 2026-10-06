import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/shared/ui/Input/Input';
import { Client } from '@/entities/Client';

interface ClientCardIdentityFieldsProps {
    data?: Client;
    onChangeFirstName?: (value?: string) => void;
    onChangeLastName?: (value?: string) => void;
    onChangeBirthday?: (value?: string) => void;
}

export const ClientCardIdentityFields = memo((props: ClientCardIdentityFieldsProps) => {
    const { data, onChangeFirstName, onChangeLastName, onChangeBirthday } = props;
    const { t } = useTranslation();

    return (
        <>
            <Input
                fullWidth
                label="Имя"
                autofocus
                type="text"
                placeholder={t('Имя')}
                onChange={onChangeFirstName}
                value={data?.firstName ?? ''}
            />
            <Input
                fullWidth
                label="Фамилия"
                type="text"
                placeholder={t('Фамилия')}
                onChange={onChangeLastName}
                value={data?.lastName}
            />
            <Input
                fullWidth
                label="Дата рождения"
                type="date"
                onChange={onChangeBirthday}
                value={data?.birthday ?? ''}
            />
        </>
    );
});