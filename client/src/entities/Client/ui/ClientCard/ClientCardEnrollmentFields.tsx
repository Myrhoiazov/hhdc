import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Client, ClientLanguage, CLIENT_LANGUAGE_OPTIONS } from '@/entities/Client';
import { Select, SelectOption } from '@/shared/ui/Select/Select';
import { Input } from '@/shared/ui/Input/Input';

interface ClientCardEnrollmentFieldsProps {
    data?: Client;
    branchOptions?: SelectOption<string>[];
    onChangeBranchId?: (value?: string) => void;
    onChangePreferredLanguage?: (value?: ClientLanguage) => void;
    onChangeImage?: (value?: File) => void;
}

export const ClientCardEnrollmentFields = memo((props: ClientCardEnrollmentFieldsProps) => {
    const { data, branchOptions = [], onChangeBranchId, onChangePreferredLanguage, onChangeImage } = props;
    const { t } = useTranslation();

    return (
        <>
            <Select
                label="Филиал"
                options={branchOptions}
                value={data?.branchId ? String(data.branchId) : ''}
                onChange={onChangeBranchId}
            />
            <Select<ClientLanguage>
                label="Язык клиента"
                options={CLIENT_LANGUAGE_OPTIONS}
                value={data?.preferredLanguage ?? 'RU'}
                onChange={onChangePreferredLanguage}
            />
            <Input
                fullWidth
                label="Фото ученика"
                type="file"
                placeholder={t('Загрузите фото')}
                onChange={(file) => {
                    onChangeImage?.(file as File);
                }}
            />
        </>
    );
});