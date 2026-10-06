import { useTranslation } from 'react-i18next';
import { memo } from 'react';
import { Input } from '@/shared/ui/Input/Input';
import { MollieSubscription, Payment } from '../../model/types/MollieSubscription';
import { CustomersSelect } from '@/entities/Mandate';
import { MollieClient } from '@/entities/MollieClient';

interface MollieSubscriptionCardProps {
    className?: string;
    data?: MollieSubscription;
    customers?: MollieClient[];
    error?: string;
    isLoading?: boolean;
    readonly?: boolean;
    onChangeCustomer?: (customers?: MollieClient) => void;
    onChangeDateStart?: (value?: string) => void;
    onChangeInterval?: (value?: string) => void;
    onChangeTimes?: (value?: string) => void;
    onChangeDescription?: (value?: string) => void;
    onChangeSum?: (value?: Payment) => void;
}

const SubscriptionScheduleInputs = ({
    data,
    onChangeDateStart,
    onChangeInterval,
    onChangeTimes,
}: {
    data?: MollieSubscription;
    onChangeDateStart?: (value?: string) => void;
    onChangeInterval?: (value?: string) => void;
    onChangeTimes?: (value?: string) => void;
}) => {
    const { t } = useTranslation();
    return (
        <>
            <Input
                fullWidth
                label="Date start"
                type="date"
                placeholder={t('YYYY-MM-DD')}
                onChange={onChangeDateStart}
                value={data?.startDate || ''}
            />
            <Input
                fullWidth
                label="Интервал списываний"
                type="text"
                placeholder={t('1 month, 14 days')}
                onChange={onChangeInterval}
                value={data?.interval || ''}
            />
            <Input
                fullWidth
                label="Кол-во списыаваний"
                type="text"
                placeholder={t('4 - 1 -10')}
                onChange={onChangeTimes}
                value={data?.times || ''}
            />
        </>
    );
};

const SubscriptionAmountAndDescriptionInputs = ({
    data,
    onChangeSum,
    onChangeDescription,
}: {
    data?: MollieSubscription;
    onChangeSum?: (value?: Payment) => void;
    onChangeDescription?: (value?: string) => void;
}) => {
    const { t } = useTranslation();
    // wrap the Input's string value into a Payment object before calling onChangeSum
    const handleSumChange = (value: string) => {
        if (!onChangeSum) return;
        const payment: Payment = {
            ...((data?.amount as Payment) || { value: '' }),
            value,
        };
        onChangeSum(payment);
    };

    return (
        <>
            <Input
                fullWidth
                label="Сумма "
                type="text"
                placeholder={t('25.00')}
                onChange={handleSumChange}
                value={data?.amount?.value || ''}
            />
            <Input
                fullWidth
                label="Описание списания"
                type="text"
                placeholder={t('Какое направление танцев')}
                onChange={onChangeDescription}
                value={data?.description || ''}
            />
        </>
    );
};

export const MollieSubscriptionCard = memo((props: MollieSubscriptionCardProps) => {
    const {
        onChangeCustomer,
        onChangeTimes,
        onChangeInterval,
        onChangeDateStart,
        onChangeSum,
        onChangeDescription,
        customers,
        data,
    } = props;

    const selectedCustomer = customers?.find((d) => d.id === data?.customerId);

    return (
        <>
            <CustomersSelect
                onChange={onChangeCustomer}
                value={selectedCustomer}
                options={customers}
            />
            <SubscriptionScheduleInputs
                data={data}
                onChangeDateStart={onChangeDateStart}
                onChangeInterval={onChangeInterval}
                onChangeTimes={onChangeTimes}
            />
            <SubscriptionAmountAndDescriptionInputs
                data={data}
                onChangeSum={onChangeSum}
                onChangeDescription={onChangeDescription}
            />
        </>
    );
});
