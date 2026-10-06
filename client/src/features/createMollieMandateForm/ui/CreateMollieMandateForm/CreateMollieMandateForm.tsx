import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { createMollieMandateFormReducer } from '../../model/slices/createMollieMandateFormSlice';
import {
    DynamicModuleLoader,
    ReducersList,
} from '@/shared/lib/components/DynamicModuleLoader/DynamicModuleLoader';
import { MandateCard } from '@/entities/Mandate';
import { Text } from '@/shared/ui/Text/Text';
import { useAppDispatch } from '@/shared/lib/hooks/useAppDispatch/useAppDispatch';
import { useSelector } from 'react-redux';
import {
    getMollieMandateData,
    getMollieMandateCustomers,
    getMollieMandateLoading,
} from '../../model/selectors/getMollieMandateCard';
import { addMandate } from '../../model/services/addMandate/addMandate';
import { toast } from 'react-toastify';
import { Button, ButtonTheme } from '@/shared/ui/Button';
import { Skeleton } from '@/shared/ui/Skeleton';
import { useInitialEffect } from '@/shared/lib/hooks/useInitialEffect/useInitialEffect';
import { fetchMollieClientsList } from '../../model/services/fetchMollieClientsList/fetchMollieClientsList';
import { VStack } from '@/shared/ui/Stack';
import { useMollieMandateUpdaters } from './useMollieMandateUpdaters';

interface CreateMollieMandateFormProps {
    className?: string;
    onSuccess: () => void;
    reloadPage?: () => void;
}

const initialReducers: ReducersList = {
    createMollieMandateForm: createMollieMandateFormReducer,
};

const FormSkeleton = () => (
    <VStack gap="16" align="center" max>
        <Skeleton width={220} height={24} border="6px" />
        <Skeleton width="100%" height={52} border="14px" />
        <Skeleton width="100%" height={52} border="14px" />
        <Skeleton width="100%" height={72} border="14px" />
        <Skeleton width="100%" height={44} border="32px" />
    </VStack>
);

const CreateMollieMandateForm = (props: CreateMollieMandateFormProps) => {
    const { onSuccess, reloadPage } = props;
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const formData = useSelector(getMollieMandateData);
    const customers = useSelector(getMollieMandateCustomers);
    const isLoading = useSelector(getMollieMandateLoading);

    useInitialEffect(() => {
        dispatch(fetchMollieClientsList({}));
    });

    const { onChangeDate, onChangeCustomer, onChangeMandateMethod } = useMollieMandateUpdaters();

    const onSave = useCallback(async () => {
        const result = await dispatch(addMandate());

        if (result.meta.requestStatus === 'fulfilled') {
            onSuccess?.();
            reloadPage?.();
            toast.success(t('Mandate успешно добавлен'));
        }
    }, [onSuccess, dispatch, reloadPage, t]);

    if (isLoading) {
        return <FormSkeleton />;
    }

    return (
        <DynamicModuleLoader reducers={initialReducers}>
            <VStack gap="16" align="center" max>
                <Text size="m" title={t('Создание нового мандата')} bold align="center" />
                <MandateCard
                    onChangeDate={onChangeDate}
                    onChangeMandateMethod={onChangeMandateMethod}
                    onChangeCustomer={onChangeCustomer}
                    data={formData}
                    customers={customers}
                />
                <Button fullWidth onClick={onSave} theme={ButtonTheme.BACKGROUND_INVERTED}>
                    {t('Добавить')}
                </Button>
            </VStack>
        </DynamicModuleLoader>
    );
};

export default memo(CreateMollieMandateForm);
