import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/shared/ui/Input/Input';
import { Client } from '@/entities/Client';

interface ClientCardContactFieldsProps {
    data?: Client;
    onChangePhoneNumber?: (value?: string) => void;
    onChangeEmail?: (value?: string) => void;
    onChangeSocial?: (value?: string) => void;
}

export const ClientCardContactFields = memo((props: ClientCardContactFieldsProps) => {
    const { data, onChangePhoneNumber, onChangeEmail, onChangeSocial } = props;
    const { t } = useTranslation();

    return (
        <>
            <Input
                fullWidth
                label="Телефон"
                type="tel"
                placeholder={t('097-123-45-67')}
                onChange={onChangePhoneNumber}
                value={data?.phoneNumber ?? ''}
            />
            <Input
                fullWidth
                label="E-mail (необязательно)"
                type="email"
                placeholder={t('example@gmail.com')}
                onChange={onChangeEmail}
                value={data?.email ?? ''}
            />
            <Input
                fullWidth
                label="Социальные сети"
                type="text"
                placeholder={t('Instagram, WhatsApp или другая ссылка')}
                onChange={onChangeSocial}
                value={data?.social ?? ''}
            />
        </>
    );
});