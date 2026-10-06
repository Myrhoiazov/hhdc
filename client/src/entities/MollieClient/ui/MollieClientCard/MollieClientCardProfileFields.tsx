import { useTranslation } from 'react-i18next';
import { memo } from 'react';
import { Input } from '@/shared/ui/Input/Input';
import { MollieClient } from '../../model/types/mollieClient';

interface MollieClientCardProfileFieldsProps {
    data?: MollieClient;
    onChangeFirstName?: (value?: string) => void;
    onChangeLastName?: (value?: string) => void;
}

export const MollieClientCardProfileFields = memo((props: MollieClientCardProfileFieldsProps) => {
    const { data, onChangeFirstName, onChangeLastName } = props;
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
                name={data?.givenName}
                value={data?.givenName || ''}
            />
            <Input
                fullWidth
                label="Фамилия"
                type="text"
                placeholder={t('Фамилия')}
                onChange={onChangeLastName}
                value={data?.familyName || ''}
            />
        </>
    );
});