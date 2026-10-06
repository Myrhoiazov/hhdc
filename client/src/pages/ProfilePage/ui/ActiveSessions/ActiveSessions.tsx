import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { StateView } from '@/shared/ui/StateView';
import { useActiveSessions } from './useActiveSessions';
import { ActiveSessionsHeader } from './ActiveSessionsHeader';
import { ActiveSessionsList } from './ActiveSessionsList';
import cls from './ActiveSessions.module.scss';

export const ActiveSessions = memo(() => {
    const { t } = useTranslation('profile');
    const {
        sessions,
        isLoading,
        isMutating,
        error,
        otherSessionsCount,
        revokeSession,
        revokeOtherSessions,
    } = useActiveSessions();

    return (
        <section className={cls.ActiveSessions}>
            <ActiveSessionsHeader
                isLoading={isLoading}
                isMutating={isMutating}
                otherSessionsCount={otherSessionsCount}
                onRevokeOtherSessions={revokeOtherSessions}
            />
            {error && (
                <StateView
                    className={cls.state}
                    tone="error"
                    title={error}
                    text={t('Попробуйте обновить список сессий чуть позже.')}
                />
            )}
            <ActiveSessionsList
                sessions={sessions}
                isLoading={isLoading}
                isMutating={isMutating}
                onRevokeSession={revokeSession}
            />
        </section>
    );
});
