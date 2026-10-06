import { useTranslation } from 'react-i18next';
import { memo } from 'react';
import { Input } from '@/shared/ui/Input/Input';
import { Mandate } from '../../model/types/mandate';
import { MandateMethod, MandateMethodSelect } from '@/entities/MandateMethod';
import { CustomersSelect } from '../CustomersSelect/CustomersSelect';
import { MollieClient } from '@/entities/MollieClient';
import { VStack } from '@/shared/ui/Stack';

export interface MandateCardProps {
    className?: string;
    data?: Mandate;
    customers?: MollieClient[];
    error?: string;
    isLoading?: boolean;
    onChangeDate?: (value: string) => void;
    onChangeMandateMethod?: (value: MandateMethod) => void;
    onChangeCustomer?: (value?: MollieClient) => void;
}

export const MandateCard = memo((props: MandateCardProps) => {
    const { className, data, onChangeDate, onChangeCustomer, onChangeMandateMethod, customers } =
        props;
    const { t } = useTranslation();

    const selectedCustomer = customers?.find((d) => d.id === data?.customerId);

    return (
        <VStack gap="16" max>
            <MandateMethodSelect value={data?.method} onChange={onChangeMandateMethod} />
            <CustomersSelect
                onChange={onChangeCustomer}
                value={selectedCustomer}
                options={customers}
            />
            <Input
                fullWidth
                label="Дата:"
                type="date"
                placeholder={t('12.02.2025')}
                onChange={onChangeDate}
                value={data?.signatureDate ?? Date.now()}
            />
        </VStack>
    );
});

export default MandateCard;
