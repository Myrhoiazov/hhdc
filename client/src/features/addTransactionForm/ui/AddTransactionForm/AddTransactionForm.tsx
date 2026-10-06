import { classNames } from '@/shared/lib/classNames/classNames';
import { useTranslation } from 'react-i18next';
import { memo, useCallback } from 'react';
import { addTransactionFormReducer } from '../../model/slices/addTransactionFormSlice';
import {
    DynamicModuleLoader,
    ReducersList,
} from '@/shared/lib/components/DynamicModuleLoader/DynamicModuleLoader';
import { VStack } from '@/shared/ui/Stack';
import { Text } from '@/shared/ui/Text/Text';
import { TransactionCard } from '@/entities/Transaction';
import { useAppDispatch } from '@/shared/lib/hooks/useAppDispatch/useAppDispatch';
import { useSelector } from 'react-redux';
import { getTransactionFormData } from '../../model/selectors/getTransactionFormData';
import { Button, ButtonTheme } from '@/shared/ui/Button';
import { createTransaction } from '../../model/services/createTransaction/createTransaction';
import { useTransactionFormUpdaters } from './useTransactionFormUpdaters';

interface AddTransactionFormProps {
    className?: string;
    onSuccess: () => void;
    reloadPage?: () => void;
}

const initialReducers: ReducersList = {
    addTransactionForm: addTransactionFormReducer,
};

const AddTransactionFormTitle = () => {
    const { t } = useTranslation();
    return <Text size="m" title={t('Добавление прихода - расхода')} bold />;
};

const AddTransactionFormFooter = ({ onSave }: { onSave: () => void }) => {
    const { t } = useTranslation();
    return (
        <Button fullWidth onClick={onSave} theme={ButtonTheme.BACKGROUND_INVERTED}>
            {t('Добавить')}
        </Button>
    );
};

const AddTransactionForm = memo((props: AddTransactionFormProps) => {
    const { className, onSuccess, reloadPage } = props;
    const dispatch = useAppDispatch();
    const formData = useSelector(getTransactionFormData);
    const {
        onChangeTransactionType, onChangeTransactionCategory, onChangePaymentMethod,
        onChangeSum, onChangeDescription, onChangeDate,
    } = useTransactionFormUpdaters();

    const onSave = useCallback(async () => {
        const result = await dispatch(createTransaction());
        if (result.meta.requestStatus === 'fulfilled') {
            onSuccess();
            reloadPage?.();
        }
    }, [onSuccess, dispatch, reloadPage]);

    return (
        <DynamicModuleLoader reducers={initialReducers}>
            <div className={classNames('', {}, [className])}>
                <VStack gap="24" align="center">
                    <AddTransactionFormTitle />
                    <TransactionCard
                        data={formData}
                        onChangeTransactionType={onChangeTransactionType}
                        onChangeSum={onChangeSum}
                        onChangeDescription={onChangeDescription}
                        onChangeDate={onChangeDate}
                        onChangePaymentMethod={onChangePaymentMethod}
                        onChangeTransactionCategory={onChangeTransactionCategory}
                    />
                    <AddTransactionFormFooter onSave={onSave} />
                </VStack>
            </div>
        </DynamicModuleLoader>
    );
});

export default AddTransactionForm;
