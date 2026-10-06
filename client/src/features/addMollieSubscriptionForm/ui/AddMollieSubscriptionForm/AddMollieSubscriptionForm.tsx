import { useTranslation } from 'react-i18next';
import { memo, useCallback } from 'react';
import { Text } from '@/shared/ui/Text/Text';
import { VStack } from '@/shared/ui/Stack';
import { addMollieSubscriptionReducer } from '../../model/slices/addMollieSubscriptionSlice';
import {
    DynamicModuleLoader,
    ReducersList,
} from '@/shared/lib/components/DynamicModuleLoader/DynamicModuleLoader';
import { MollieSubscriptionCard, Payment } from '@/entities/MollieSubscription';
import { useInitialEffect } from '@/shared/lib/hooks/useInitialEffect/useInitialEffect';
import { fetchMollieClientsList } from '../../model/services/fetchMollieClientsList/fetchMollieClientsList';
import { useAppDispatch } from '@/shared/lib/hooks/useAppDispatch/useAppDispatch';
import { useSelector } from 'react-redux';
import {
    getMollieSubscriptionCustomers,
    getMollieSubscriptionData,
    getMollieSubscriptionLoading,
} from '../../model/selectors/getMollieSubscriptionData';
import { Skeleton } from '@/shared/ui/Skeleton';
import { addSubscription } from '../../model/services/addSubscription/addSubscription';
import { toast } from 'react-toastify';
import { Button, ButtonTheme } from '@/shared/ui/Button';
import { MollieClient } from '@/entities/MollieClient';
import { useMollieSubscriptionUpdaters } from './useMollieSubscriptionUpdaters';

interface AAddMollieSubscriptionFormProps {
    onSuccess?: () => void;
    reloadPage?: () => void;
}

const initialReducers: ReducersList = {
    addMollieSubscriptionForm: addMollieSubscriptionReducer,
};

const FormSkeleton = () => (
    <VStack gap="16" align="center" max>
        <Skeleton width={280} height={24} border="6px" />
        <Skeleton width="100%" height={52} border="14px" />
        <Skeleton width="100%" height={72} border="14px" />
        <Skeleton width="100%" height={72} border="14px" />
        <Skeleton width="100%" height={72} border="14px" />
        <Skeleton width="100%" height={72} border="14px" />
        <Skeleton width="100%" height={72} border="14px" />
        <Skeleton width="100%" height={44} border="32px" />
    </VStack>
);

const SubscriptionFormFields = ({
    formData,
    customers,
    onChangeDateStart,
    onChangeDescription,
    onChangeCustomer,
    onChangeTimes,
    onChangeInterval,
    onChangeSum,
    onSave,
}: {
    formData: ReturnType<typeof getMollieSubscriptionData>;
    customers: ReturnType<typeof getMollieSubscriptionCustomers>;
    onChangeDateStart: (value?: string) => void;
    onChangeDescription: (value?: string) => void;
    onChangeCustomer: (customer?: MollieClient) => void;
    onChangeTimes: (value?: string) => void;
    onChangeInterval: (value?: string) => void;
    onChangeSum: (value?: Payment) => void;
    onSave: () => void;
}) => {
    const { t } = useTranslation();
    return (
        <VStack gap="16" align="center" max>
            <Text
                size="m"
                title={t('Создание нового регулярного платежа')}
                bold
                align="center"
            />
            <MollieSubscriptionCard
                data={formData}
                customers={customers}
                onChangeDateStart={onChangeDateStart}
                onChangeDescription={onChangeDescription}
                onChangeCustomer={onChangeCustomer}
                onChangeTimes={onChangeTimes}
                onChangeInterval={onChangeInterval}
                onChangeSum={onChangeSum}
            />
            <Button fullWidth onClick={onSave} theme={ButtonTheme.BACKGROUND_INVERTED}>
                {t('Добавить')}
            </Button>
        </VStack>
    );
};

const AddMollieSubscriptionForm = memo((props: AAddMollieSubscriptionFormProps) => {
    const { onSuccess, reloadPage } = props;
    const { t } = useTranslation();
    const dispatch = useAppDispatch();

    const formData = useSelector(getMollieSubscriptionData);
    const customers = useSelector(getMollieSubscriptionCustomers);
    const isLoading = useSelector(getMollieSubscriptionLoading);

    useInitialEffect(() => {
        dispatch(fetchMollieClientsList());
    });

    const {
        onChangeDateStart, onChangeDescription, onChangeCustomer,
        onChangeTimes, onChangeInterval, onChangeSum,
    } = useMollieSubscriptionUpdaters();

    const onSave = useCallback(async () => {
        const result = await dispatch(addSubscription());

        if (result.meta.requestStatus === 'fulfilled') {
            onSuccess?.();
            reloadPage?.();
            toast.success(t('Подписка оформленна'));
        }
    }, [onSuccess, reloadPage, dispatch, t]);

    if (isLoading) {
        return <FormSkeleton />;
    }

    return (
        <DynamicModuleLoader reducers={initialReducers}>
            <SubscriptionFormFields
                formData={formData}
                customers={customers}
                onChangeDateStart={onChangeDateStart}
                onChangeDescription={onChangeDescription}
                onChangeCustomer={onChangeCustomer}
                onChangeTimes={onChangeTimes}
                onChangeInterval={onChangeInterval}
                onChangeSum={onChangeSum}
                onSave={onSave}
            />
        </DynamicModuleLoader>
    );
});

export default AddMollieSubscriptionForm;
