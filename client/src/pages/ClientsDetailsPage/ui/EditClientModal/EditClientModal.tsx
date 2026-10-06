import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { classNames } from '@/shared/lib/classNames/classNames';
import { Button, ButtonTheme } from '@/shared/ui/Button';
import { Modal } from '@/shared/ui/Modal/Modal';
import { HStack, VStack } from '@/shared/ui/Stack';
import { Text } from '@/shared/ui/Text/Text';
import s from './EditClientModal.module.scss';
import { useEditClientModal } from './useEditClientModal';
import { EditClientFormFields } from './EditClientFormFields';

interface EditClientModalProps {
    className?: string;
    clientId: string;
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export const EditClientModal = memo((props: EditClientModalProps) => {
    const { className, clientId, isOpen, onClose, onSuccess } = props;
    const { t } = useTranslation();
    const {
        form, errors, isLoading, branchOptions, availableGroups,
        selectedGroupIds, updateField, updateBranch, toggleGroup, onChangeImage, onSave,
    } = useEditClientModal({ clientId, isOpen, onClose, onSuccess });

    return (
        <Modal className={classNames('', {}, [className])} isOpen={isOpen} onClose={onClose} lazy>
            <VStack className={s.form} gap="16" max>
                <div className={s.titleBlock}>
                    <Text size="m" title="Редактирование ученика" bold />
                    <Text size="s" text="Обновите основные данные ученика." />
                </div>

                <EditClientFormFields
                    form={form}
                    errors={errors}
                    branchOptions={branchOptions}
                    availableGroups={availableGroups}
                    selectedGroupIds={selectedGroupIds}
                    updateField={updateField}
                    updateBranch={updateBranch}
                    toggleGroup={toggleGroup}
                    onChangeImage={onChangeImage}
                />

                <HStack className={s.actions} gap="16" justify="end">
                    <Button theme={ButtonTheme.OUTLINE} onClick={onClose} disabled={isLoading}>
                        {t('Отмена')}
                    </Button>
                    <Button theme={ButtonTheme.BACKGROUND_INVERTED} onClick={onSave} disabled={isLoading}>
                        {t('Сохранить')}
                    </Button>
                </HStack>
            </VStack>
        </Modal>
    );
});
