import { useCallback, useState } from 'react';
import { useAppDispatch } from '@/shared/lib/hooks/useAppDispatch/useAppDispatch';
import { logout } from '@/entities/User';
import { SessionItem } from './ActiveSessionItem';
import { revokeAllSessionsApi, revokeSessionApi } from './sessionsApi';

export const useSessionMutations = (
    loadSessions: () => Promise<void>,
    setError: (message: string | null) => void,
    t: (key: string) => string,
) => {
    const dispatch = useAppDispatch();
    const [isMutating, setIsMutating] = useState(false);

    const revokeSession = useCallback(async (session: SessionItem) => {
        if (session.isCurrent) {
            dispatch(logout());
            return;
        }
        setIsMutating(true);
        setError(null);
        try {
            await revokeSessionApi(session.id);
            await loadSessions();
        } catch {
            setError(t('Не удалось завершить сессию'));
        } finally {
            setIsMutating(false);
        }
    }, [dispatch, loadSessions, t, setError]);

    const revokeOtherSessions = useCallback(async () => {
        setIsMutating(true);
        setError(null);
        try {
            await revokeAllSessionsApi();
            await loadSessions();
        } catch {
            setError(t('Не удалось завершить другие сессии'));
        } finally {
            setIsMutating(false);
        }
    }, [loadSessions, t, setError]);

    return { isMutating, revokeSession, revokeOtherSessions };
};
