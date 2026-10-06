import { useTranslation } from 'react-i18next';
import { Button, ButtonTheme } from '@/shared/ui/Button/Button';
import cls from './ActiveSessions.module.scss';

export interface SessionItem {
    id: number;
    ipAddress?: string | null;
    userAgent?: string | null;
    createdAt: string;
    lastUsedAt?: string | null;
    expiresAt: string;
    isCurrent: boolean;
}

const formatDate = (value?: string | null) => {
    if (!value) return '—';
    return new Intl.DateTimeFormat(undefined, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(value));
};

const formatDevice = (userAgent?: string | null) => {
    if (!userAgent) return 'Unknown device';
    const browser = userAgent.includes('Chrome')
        ? 'Chrome'
        : userAgent.includes('Safari')
            ? 'Safari'
            : userAgent.includes('Firefox')
                ? 'Firefox'
                : 'Browser';
    const os = userAgent.includes('Mac OS X')
        ? 'macOS'
        : userAgent.includes('Windows')
            ? 'Windows'
            : userAgent.includes('Android')
                ? 'Android'
                : userAgent.includes('iPhone') || userAgent.includes('iPad')
                    ? 'iOS'
                    : 'Unknown OS';
    return `${browser} · ${os}`;
};

interface ActiveSessionItemProps {
    session: SessionItem;
    isMutating: boolean;
    onRevoke: (session: SessionItem) => void;
}

export const ActiveSessionItem = ({ session, isMutating, onRevoke }: ActiveSessionItemProps) => {
    const { t } = useTranslation('profile');

    return (
        <div className={cls.session} key={session.id}>
            <div>
                <div className={cls.sessionTitle}>
                    <span>{formatDevice(session.userAgent)}</span>
                    {session.isCurrent && <span className={cls.badge}>{t('Текущая')}</span>}
                </div>
                <div className={cls.meta}>
                    <span>{t('IP: {{ip}}', { ip: session.ipAddress || '—' })}</span>
                    <span>{t('Последняя активность')}: {formatDate(session.lastUsedAt)}</span>
                    <span>{t('Создана')}: {formatDate(session.createdAt)}</span>
                    <span>{t('Истекает')}: {formatDate(session.expiresAt)}</span>
                </div>
            </div>

            <Button
                theme={ButtonTheme.OUTLINE_RED}
                disabled={isMutating}
                onClick={() => onRevoke(session)}
            >
                {session.isCurrent ? t('Выйти здесь') : t('Завершить')}
            </Button>
        </div>
    );
};
