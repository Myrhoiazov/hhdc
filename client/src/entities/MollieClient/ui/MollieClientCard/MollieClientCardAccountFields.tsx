import { useTranslation } from 'react-i18next';
import { memo } from 'react';
import { Input } from '@/shared/ui/Input/Input';
import { MollieClient } from '../../model/types/mollieClient';

interface MollieClientCardAccountFieldsProps {
    data?: MollieClient;
    onChangeConsumerAccount?: (value?: string) => void;
    onChangeConsumerBic?: (value?: string) => void;
    onChangeConsumerName?: (value?: string) => void;
}

export const MollieClientCardAccountFields = memo((props: MollieClientCardAccountFieldsProps) => {
    const { data, onChangeConsumerAccount, onChangeConsumerBic, onChangeConsumerName } = props;
    const { t } = useTranslation();

    return (
        <>
            <Input
                fullWidth
                label="MollieId"
                type="text"
                readonly={true}
                placeholder={t('cst_bhiubi')}
                name={data?.mollieId}
                value={data?.mollieId || ''}
            />
            <Input
                fullWidth
                label="Consumer Name"
                type="text"
                placeholder={t('Consumer Name')}
                onChange={onChangeConsumerName}
                value={data?.consumerName || ''}
            />
            <Input
                fullWidth
                label="Consumer Account"
                type="text"
                placeholder={t('Consumer Account')}
                onChange={onChangeConsumerAccount}
                value={data?.consumerAccount || ''}
            />
            <Input
                fullWidth
                label="Consumer Bic"
                type="text"
                placeholder={t('Consumer Bic')}
                onChange={onChangeConsumerBic}
                value={data?.consumerBic || ''}
            />
        </>
    );
});