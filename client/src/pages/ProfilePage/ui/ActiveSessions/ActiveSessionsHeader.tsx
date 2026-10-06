import { useTranslation } from 'react-i18next';
import { Button, ButtonTheme } from '@/shared/ui/Button/Button';
import cls from './ActiveSessions.module.scss';

interface ActiveSessionsHeaderProps {
    isLoading: boolean;
    isMutating: boolean;
    otherSessionsCount: number;
    onRevokeOtherSessions: () => void;
}

export const ActiveSessionsHeader = ({
    isLoading,
    isMutating,
    otherSessionsCount,
    onRevokeOtherSessions,
}: ActiveSessionsHeaderProps) => {
    const { t } = useTranslation('profile');

    return (
        <div className={cls.header}>
            <div>
                <h3 className={cls.title}>{t('Активные сессии')}</h3>
                <p className={cls.hint}>
                    {t('Проверьте устройства, где открыт ваш аккаунт.')}
                </p>
            </div>
            <Button
                theme={ButtonTheme.OUTLINE_RED}
                disabled={isLoading || isMutating || otherSessionsCount === 0}
                onClick={onRevokeOtherSessions}
            >
                {t('Завершить остальные')}
            </Button>
        </div>
    );
};
