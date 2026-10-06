import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '@/shared/ui/Modal';
import { VStack } from '@/shared/ui/Stack';
import { Text } from '@/shared/ui/Text/Text';
import { Button, ButtonTheme } from '@/shared/ui/Button/Button';
import s from './EditSubscriptionDropdown.module.scss';

interface CancelSubscriptionModalProps {
    isOpen: boolean;
    isSaving: boolean;
    onClose: () => void;
    onCancel: () => void;
}

export const CancelSubscriptionModal = memo((props: CancelSubscriptionModalProps) => {
    const { isOpen, isSaving, onClose, onCancel } = props;
    const { t } = useTranslation();

    return (
        <Modal isOpen={isOpen} onClose={onClose} lazy>
            <VStack max gap="16" className={s.confirm}>
                <Text title="Остановить подписку?" text="Она останется в истории CRM со статусом canceled." size="m" bold />
                <div className={s.actions}>
                    <Button theme={ButtonTheme.OUTLINE} onClick={onClose} disabled={isSaving}>{t('Закрыть')}</Button>
                    <Button theme={ButtonTheme.OUTLINE_RED} onClick={onCancel} disabled={isSaving}>{isSaving ? 'Отмена...' : 'Остановить'}</Button>
                </div>
            </VStack>
        </Modal>
    );
});
