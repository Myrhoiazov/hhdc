import { Dispatch, memo, SetStateAction } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '@/shared/ui/Modal';
import { HStack, VStack } from '@/shared/ui/Stack';
import { Text } from '@/shared/ui/Text/Text';
import { Button, ButtonTheme } from '@/shared/ui/Button/Button';
import { Input } from '@/shared/ui/Input/Input';
import { Select, SelectOption } from '@/shared/ui/Select/Select';
import { SubscriptionFormState } from './useEditSubscriptionDropdown';
import s from './EditSubscriptionDropdown.module.scss';

interface EditSubscriptionModalProps {
    isOpen: boolean;
    isSaving: boolean;
    form: SubscriptionFormState;
    setForm: Dispatch<SetStateAction<SubscriptionFormState>>;
    validMandateOptions: SelectOption<string>[];
    today: string;
    onClose: () => void;
    onUpdate: () => void;
}

export const EditSubscriptionModal = memo((props: EditSubscriptionModalProps) => {
    const { isOpen, isSaving, form, setForm, validMandateOptions, today, onClose, onUpdate } = props;
    const { t } = useTranslation();

    return (
        <Modal isOpen={isOpen} onClose={onClose} lazy>
            <VStack max gap="16" className={s.confirm}>
                <Text title="Изменить активную подписку" text="При изменении даты CRM остановит текущую подписку и создаст новую. История сохранится." size="m" bold />
                <Select label="Valid mandate" options={validMandateOptions} value={form.mandateId} onChange={(mandateId) => setForm((prev) => ({ ...prev, mandateId }))} />
                <Input fullWidth label="Сумма, EUR" type="number" value={form.amountValue} onChange={(amountValue) => setForm((prev) => ({ ...prev, amountValue }))} />
                <Input fullWidth label="Интервал" value={form.interval} onChange={(interval) => setForm((prev) => ({ ...prev, interval }))} />
                <Input fullWidth label="Дата следующего списания" type="date" min={today} value={form.startDate} onChange={(startDate) => setForm((prev) => ({ ...prev, startDate }))} />
                <Input fullWidth label="Количество списаний" type="number" value={form.times} onChange={(times) => setForm((prev) => ({ ...prev, times }))} />
                <Input fullWidth label="Описание" value={form.description} onChange={(description) => setForm((prev) => ({ ...prev, description }))} />
                <HStack max gap="8" justify="end">
                    <Button theme={ButtonTheme.OUTLINE} onClick={onClose}>{t('Закрыть')}</Button>
                    <Button theme={ButtonTheme.BACKGROUND_INVERTED} onClick={onUpdate} disabled={isSaving}>{t('Сохранить')}</Button>
                </HStack>
            </VStack>
        </Modal>
    );
});
