import { classNames } from '@/shared/lib/classNames/classNames';
import { useTranslation } from 'react-i18next';
import cls from './ClientForm.module.scss';
import { memo } from 'react';
import { VStack } from '@/shared/ui/Stack';
import { Text } from '@/shared/ui/Text/Text';
import { Button, ButtonTheme } from '@/shared/ui/Button';
import {
    DynamicModuleLoader,
    ReducersList,
} from '@/shared/lib/components/DynamicModuleLoader/DynamicModuleLoader';
import { clientReducer } from '../../model/slices/clientSlice';
import { ClientCard } from '@/entities/Client';
import { useClientForm } from './useClientForm';
import { ClientFormGroupsSection } from './ClientFormGroupsSection';
import { ClientFormPaymentSection } from './ClientFormPaymentSection';

interface AddClientFormProps {
    className?: string;
    onSuccess: () => void;
    reloadPage?: () => void;
}

const initialReducers: ReducersList = {
    client: clientReducer,
};

const FormHeader = () => {
    const { t } = useTranslation();
    return (
        <div className={cls.titleBlock}>
            <Text size="m" title={t('Добавление ученика')} bold />
            <Text size="s" text={t('Email необязателен. При необходимости сразу привяжите платёжный аккаунт.')} />
        </div>
    );
};

const ValidationErrors = ({ errors }: { errors: string[] }) => {
    if (!errors.length) {
        return null;
    }
    return (
        <div className={cls.validationErrors}>
            {errors.map((error) => (
                <Text key={error} size="s" text={error} variant="error" />
            ))}
        </div>
    );
};

const SubmitButton = ({ isSubmitting, onClick }: { isSubmitting: boolean; onClick: () => void }) => {
    const { t } = useTranslation();
    return (
        <Button
            className={cls.submitButton}
            fullWidth
            onClick={onClick}
            theme={ButtonTheme.BACKGROUND_INVERTED}
            disabled={isSubmitting}
        >
            {isSubmitting ? t('Добавление...') : t('Добавить')}
        </Button>
    );
};

const AddClientForm = memo((props: AddClientFormProps) => {
    const { className, onSuccess, reloadPage } = props;
    const {
        formData, branchOptions, mollieCustomerOptions, availableGroups, selectedGroupIds, toggleGroup,
        mollieCustomerId, setMollieCustomerId, payerRelation, setPayerRelation,
        validationErrors, isSubmitting,
        onChangeFirstName, onChangeLastName, onChangeBirthday, onChangePhoneNumber, onChangeEmail,
        onChangeSocial, onChangeBranchId, onChangePreferredLanguage, onChangeImage, onSave,
    } = useClientForm(onSuccess, reloadPage);

    return (
        <DynamicModuleLoader reducers={initialReducers}>
            <div className={classNames(cls.AddClientForm, {}, [className])}>
                <VStack gap="16" max className={cls.header}>
                    <FormHeader />
                    <ClientCard
                        onChangeLastName={onChangeLastName} onChangeFirstName={onChangeFirstName}
                        onChangeBirthday={onChangeBirthday} onChangePhoneNumber={onChangePhoneNumber}
                        onChangeEmail={onChangeEmail} onChangeImage={onChangeImage} onChangeSocial={onChangeSocial}
                        onChangeBranchId={onChangeBranchId} onChangePreferredLanguage={onChangePreferredLanguage}
                        branchOptions={branchOptions} data={formData}
                    />
                    {formData?.branchId && (
                        <ClientFormGroupsSection
                            availableGroups={availableGroups} selectedGroupIds={selectedGroupIds}
                            onToggleGroup={toggleGroup}
                        />
                    )}
                    <ClientFormPaymentSection
                        mollieCustomerOptions={mollieCustomerOptions} mollieCustomerId={mollieCustomerId}
                        setMollieCustomerId={setMollieCustomerId} payerRelation={payerRelation}
                        setPayerRelation={setPayerRelation}
                    />
                    <ValidationErrors errors={validationErrors} />
                    <SubmitButton isSubmitting={isSubmitting} onClick={onSave} />
                </VStack>
            </div>
        </DynamicModuleLoader>
    );
});

export default AddClientForm;
