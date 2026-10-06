import { useTranslation } from 'react-i18next';
import { Button, ButtonTheme } from '@/shared/ui/Button/Button';
import cls from './ProfilePageHeader.module.scss';

interface ProfileHeaderActionsProps {
    isCanEdit: boolean;
    isOwnProfile: boolean;
    readonly: boolean;
    onOpenPasswordModal: () => void;
    onEdit: () => void;
    onCancelEdit: () => void;
    onSave: () => void;
}

export const ProfileHeaderActions = ({
    isCanEdit,
    isOwnProfile,
    readonly,
    onOpenPasswordModal,
    onEdit,
    onCancelEdit,
    onSave,
}: ProfileHeaderActionsProps) => {
    const { t } = useTranslation('profile');

    if (!isCanEdit) {
        return null;
    }

    return (
        <div className={cls.actions}>
            {isOwnProfile && readonly && (
                <Button
                    theme={ButtonTheme.OUTLINE}
                    onClick={onOpenPasswordModal}
                >
                    {t('Изменить пароль')}
                </Button>
            )}
            {readonly ? (
                <Button theme={ButtonTheme.BACKGROUND_INVERTED} onClick={onEdit}>
                    {t('Редактировать')}
                </Button>
            ) : (
                <>
                    <Button theme={ButtonTheme.OUTLINE_RED} onClick={onCancelEdit}>
                        {t('Отменить')}
                    </Button>
                    <Button theme={ButtonTheme.BACKGROUND_INVERTED} onClick={onSave}>
                        {t('Сохранить')}
                    </Button>
                </>
            )}
        </div>
    );
};
