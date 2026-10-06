import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '@/shared/ui/Modal';
import { VStack } from '@/shared/ui/Stack';
import { Text } from '@/shared/ui/Text/Text';
import { Button, ButtonTheme } from '@/shared/ui/Button/Button';
import s from './MollieCustomerDetails.module.scss';

interface DeleteCustomerModalProps {
    isOpen: boolean;
    isDeleting: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

export const DeleteCustomerModal = memo((props: DeleteCustomerModalProps) => {
    const { isOpen, isDeleting, onClose, onConfirm } = props;
    const { t } = useTranslation();

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <VStack max gap="16" className={s.deleteModal}>
                <Text
                    title={t('Удалить клиента Mollie?')}
                    text={t('Клиент будет удалён из CRM и из Mollie. Действие необратимо.')}
                    size="m"
                    bold
                />
                <div className={s.deleteModalActions}>
                    <Button theme={ButtonTheme.OUTLINE} onClick={onClose} disabled={isDeleting}>
                        {t('Отмена')}
                    </Button>
                    <Button theme={ButtonTheme.OUTLINE_RED} onClick={onConfirm} disabled={isDeleting}>
                        {isDeleting ? t('Удаление...') : t('Да, удалить')}
                    </Button>
                </div>
            </VStack>
        </Modal>
    );
});
