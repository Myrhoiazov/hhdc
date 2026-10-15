import { memo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Event } from '@/entities/Event';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { Panel } from '@/shared/ui/Panel';
import { listStyles as own } from '@/shared/ui/ListTable';
import cls from '@/shared/ui/layout/layout.module.scss';
import { fullNameOf } from '@/entities/Person';

export const Choreographers = memo(({ event }: { event: Event }) => {
    const { t } = useTranslation();
    const assigned = event.choreographers ?? [];
    return (
        <Panel id="event-choreographers" aria-label={t('Choreographers')}>
            <h2>{t('Choreographers')}</h2>
            {assigned.length === 0 && (
                <p className={cls.muted}>{t('No choreographers assigned yet')}</p>
            )}
            {assigned.length > 0 && (
                <div className={own.tableScroll}>
                    <table className={own.table}>
                        <thead>
                            <tr>
                                <th>{t('Full name')}</th>
                                <th>{t('Email')}</th>
                                <th>{t('Role at the event')}</th>
                                <th>{t('Status')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {assigned.map((item) => (
                                <tr key={item.id}>
                                    <td>
                                        <Link
                                            className={own.name}
                                            to={`/people/choreographers/${item.person.id}/events`}
                                        >
                                            {fullNameOf(item.person) || '—'}
                                        </Link>
                                    </td>
                                    <td className={own.secondary}>{item.person.email || '—'}</td>
                                    <td className={own.secondary}>{item.roleTitle}</td>
                                    <td>
                                        <StatusBadge status={item.status} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </Panel>
    );
});
