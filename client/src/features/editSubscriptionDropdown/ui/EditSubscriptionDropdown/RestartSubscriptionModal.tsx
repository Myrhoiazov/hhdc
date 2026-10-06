import { Dispatch, memo, SetStateAction } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '@/shared/ui/Modal';
import { HStack, VStack } from '@/shared/ui/Stack';
import { Text } from '@/shared/ui/Text/Text';
import { Button, ButtonTheme } from '@/shared/ui/Button/Button';
import { Input } from '@/shared/ui/Input/Input';
import { Select, SelectOption } from '@/shared/ui/Select/Select';
import s from './EditSubscriptionDropdown.module.scss';

interface RestartSubscriptionModalProps {
    isOpen: boolean;
    isSaving: boolean;
    mandateId: string;
    onMandateChange: (mandateId: string) => void;
    validMandateOptions: SelectOption<string>[];
    restartDate: string;
    setRestartDate: Dispatch<SetStateAction<string>>;
    today: string;
    onClose: () => void;
    onRestart: () => void;
}

export const RestartSubscriptionModal = memo((props: RestartSubscriptionModalProps) => {
    const {
        isOpen, isSaving, mandateId, onMandateChange, validMandateOptions,
        restartDate, setRestartDate, today, onClose, onRestart,
    } = props;
    const { t } = useTranslation();

    return (
        <Modal isOpen={isOpen} onClose={onClose} lazy>
            <VStack max gap="16" className={s.confirm}>
                <Text title="Запустить снова" text="Будет создана новая подписка с параметрами старой." size="m" bold />
                <Select label="Valid mandate" options={validMandateOptions} value={mandateId} onChange={onMandateChange} />
                <Input fullWidth label="Дата первого списания" type="date" min={today} value={restartDate} onChange={setRestartDate} />
                <HStack max gap="8" justify="end">
                    <Button theme={ButtonTheme.OUTLINE} onClick={onClose}>{t('Закрыть')}</Button>
                    <Button theme={ButtonTheme.BACKGROUND_INVERTED} onClick={onRestart} disabled={isSaving}>{t('Запустить снова')}</Button>
                </HStack>
            </VStack>
        </Modal>
    );
});
