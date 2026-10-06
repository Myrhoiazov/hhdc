import { classNames } from '@/shared/lib/classNames/classNames';
import cls from './MollieClientForm.module.scss';
import { memo } from 'react';
import { VStack } from '@/shared/ui/Stack';
import { Text } from '@/shared/ui/Text/Text';
import { Button, ButtonTheme } from '@/shared/ui/Button';
import { MollieClientCard } from '@/entities/MollieClient';
import { MollieClientFormSkeleton } from './MollieClientFormSkeleton';
import { useMollieClientForm } from './useMollieClientForm';

interface MollieClientFormProps {
    className?: string;
    onSuccess: () => void;
    reloadPage?: () => void;
    clientId?: string;
}

const MollieClientForm = memo((props: MollieClientFormProps) => {
    const { className, onSuccess, reloadPage, clientId } = props;

    const { t, isLoading, ...form } = useMollieClientForm({ onSuccess, reloadPage });

    if (isLoading) {
        return (
            <div className={classNames(cls.MollieClientForm, {}, [className])}>
                <MollieClientFormSkeleton />
            </div>
        );
    }

    return (
        <div className={classNames(cls.MollieClientForm, {}, [className])}>
            <VStack gap="24" align="center" className={cls.header}>
                <Text size="m" title={clientId ? t('Редактирование клиента') : t('Добавление нового клиента')} bold />
                <MollieClientCard
                    onChangeLastName={form.onChangeLastName}
                    onChangeFirstName={form.onChangeFirstName}
                    onChangeEmail={form.onChangeEmail}
                    onChangeCity={form.onChangeCity}
                    onChangeConsumerAccount={form.onChangeConsumerAccount}
                    onChangeConsumerName={form.onChangeConsumerName}
                    onChangeConsumerBic={form.onChangeConsumerBic}
                    onChangePreferredLanguage={form.onChangePreferredLanguage}
                    data={form.formData}
                />
                <Button fullWidth onClick={form.onSave} theme={ButtonTheme.BACKGROUND_INVERTED}>
                    {t('Сохранить')}
                </Button>
            </VStack>
        </div>
    );
});

export default MollieClientForm;
