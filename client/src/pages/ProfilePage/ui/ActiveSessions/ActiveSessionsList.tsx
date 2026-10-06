import { useTranslation } from 'react-i18next';
import { StateView } from '@/shared/ui/StateView';
import { ListSkeleton } from '@/shared/ui/ListSkeleton';
import { ActiveSessionItem, SessionItem } from './ActiveSessionItem';
import cls from './ActiveSessions.module.scss';

interface ActiveSessionsListProps {
    sessions: SessionItem[];
    isLoading: boolean;
    isMutating: boolean;
    onRevokeSession: (session: SessionItem) => void;
}

export const ActiveSessionsList = ({
    sessions,
    isLoading,
    isMutating,
    onRevokeSession,
}: ActiveSessionsListProps) => {
    const { t } = useTranslation('profile');

    return (
        <div className={cls.list}>
            {sessions.map((session) => (
                <ActiveSessionItem
                    key={session.id}
                    session={session}
                    isMutating={isMutating}
                    onRevoke={onRevokeSession}
                />
            ))}
            {!isLoading && sessions.length === 0 && (
                <StateView
                    variant="inline"
                    title={t('Активных сессий не найдено')}
                    text={t('Когда вы войдёте с другого устройства, оно появится здесь.')}
                />
            )}
            {isLoading && <ListSkeleton rows={2} height={86} />}
        </div>
    );
};
