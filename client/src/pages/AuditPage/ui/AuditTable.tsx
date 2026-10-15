import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { AuditEntry } from '@/entities/Audit';
import { formatDateTime } from '@/shared/lib/format/date';
import { Badge } from '@/shared/ui/Badge';
import { listStyles as own } from '@/shared/ui/ListTable';

const AuditRow = memo(({ entry }: { entry: AuditEntry }) => {
    const { t } = useTranslation();
    return (
        <tr>
            <td className={own.secondary}>
                <time dateTime={entry.createdAt}>{formatDateTime(entry.createdAt)}</time>
            </td>
            <td>
                {entry.actor ? (
                    entry.actor.name || entry.actor.email
                ) : (
                    <span className={own.secondary}>{t('System')}</span>
                )}
            </td>
            <td>
                <strong>{t(entry.action)}</strong>
            </td>
            <td>
                <Badge>{entry.entityType}</Badge>
            </td>
            <td className={`${own.secondary} ${own.optional}`}>{entry.ipAddress || '—'}</td>
        </tr>
    );
});

export const AuditTable = memo(({ entries }: { entries: AuditEntry[] }) => {
    const { t } = useTranslation();
    return (
        <div className={own.tableScroll}>
            <table className={own.table}>
                <thead>
                    <tr>
                        <th>{t('When')}</th>
                        <th>{t('Who')}</th>
                        <th>{t('Action')}</th>
                        <th>{t('Record')}</th>
                        <th className={own.optional}>{t('IP address')}</th>
                    </tr>
                </thead>
                <tbody>
                    {entries.map((entry) => (
                        <AuditRow key={entry.id} entry={entry} />
                    ))}
                </tbody>
            </table>
        </div>
    );
});
