import { useTranslation } from 'react-i18next';
import { Button, ButtonTheme } from '@/shared/ui/Button/Button';
import cls from './ChangePasswordModal.module.scss';

interface ChangePasswordActionsProps {
    isLoading: boolean;
    onClose: () => void;
    onSubmit: () => void;
}

export const ChangePasswordActions = ({ isLoading, onClose, onSubmit }: ChangePasswordActionsProps) => {
    const { t } = useTranslation('profile');

    return (
        <div className={cls.actions}>
            <Button theme={ButtonTheme.OUTLINE_RED} onClick={onClose} disabled={isLoading}>
                {t('Отмена')}
            </Button>
            <Button theme={ButtonTheme.OUTLINE} onClick={onSubmit} disabled={isLoading}>
                {isLoading ? t('Сохраняю') : t('Сохранить')}
            </Button>
        </div>
    );
};
