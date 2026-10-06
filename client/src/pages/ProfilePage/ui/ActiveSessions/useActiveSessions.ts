import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SessionItem } from './ActiveSessionItem';
import { fetchSessionsApi } from './sessionsApi';
import { useSessionMutations } from './useSessionMutations';

export const useActiveSessions = () => {
    const { t } = useTranslation('profile');
    const [sessions, setSessions] = useState<SessionItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const otherSessionsCount = useMemo(
        () => sessions.filter((session) => !session.isCurrent).length,
        [sessions],
    );

    const loadSessions = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            setSessions(await fetchSessionsApi());
        } catch {
            setError(t('Не удалось загрузить активные сессии'));
        } finally {
            setIsLoading(false);
        }
    }, [t]);

    useEffect(() => { loadSessions(); }, [loadSessions]);

    const { isMutating, revokeSession, revokeOtherSessions } = useSessionMutations(loadSessions, setError, t);

    return {
        sessions, isLoading, isMutating, error, otherSessionsCount, revokeSession, revokeOtherSessions,
    };
};
