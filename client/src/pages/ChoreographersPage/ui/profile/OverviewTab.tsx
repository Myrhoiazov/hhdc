import { memo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChoreographerDetail } from '@/entities/Choreographer';
import { formatLongDate } from '@/shared/lib/format/date';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { Panel } from '@/shared/ui/Panel';
import cls from '@/shared/ui/layout/layout.module.scss';
import own from '../Choreographers.module.scss';
import { CHECKLIST_LABELS } from '../../model/tabs';

const Checklist = memo(({ items }: { items: string[] }) => {
    const { t } = useTranslation();
    if (!items.length) return <p className={cls.muted}>{t('The profile is complete.')}</p>;
    return (
        <ul aria-label={t('Missing from the profile')}>
            {items.map((item) => (
                <li key={item}>{t(CHECKLIST_LABELS[item] ?? item)}</li>
            ))}
        </ul>
    );
});

export const OverviewTab = memo(({ detail }: { detail: ChoreographerDetail }) => {
    const { t } = useTranslation();
    const { person, profile, assignments } = detail;
    return (
        <>
            <Panel aria-label={t('Contact')}>
                <h2>{t('Contact')}</h2>
                <dl className={own.definition}>
                    <dt>{t('Email')}</dt>
                    <dd>{person.email ?? '—'}</dd>
                    <dt>{t('Phone')}</dt>
                    <dd>{person.phone ?? '—'}</dd>
                    <dt>{t('Languages')}</dt>
                    <dd>{profile.languages.join(', ') || '—'}</dd>
                </dl>
                <Link to={`/people/${person.id}`}>{t('Open contact card')}</Link>
            </Panel>
            <Panel aria-label={t('Events')}>
                <h2>{t('Events')}</h2>
                {assignments.map((assignment) => (
                    <div className={cls.row} key={assignment.id}>
                        <Link to={`/events/${assignment.event.id}`}>{assignment.event.name}</Link>
                        <span
                            className={own.secondary}
                        >{`${formatLongDate(assignment.event.startAt)} · ${assignment.roleTitle}`}</span>
                        <StatusBadge status={assignment.status} />
                    </div>
                ))}
                {!assignments.length && (
                    <p className={cls.muted}>{t('Not assigned to any event yet.')}</p>
                )}
            </Panel>
            <Panel>
                <h2>{t('Profile checklist')}</h2>
                <Checklist items={detail.checklist} />
            </Panel>
        </>
    );
});
