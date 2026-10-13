import { memo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { listPersonTeamRoles } from '@/entities/crm';
import { formatDate } from '@/shared/lib/format/date';
import { useResource } from '@/shared/lib/useResource/useResource';
import { RequestState } from '@/shared/ui/RequestState';
import cls from './CrmPage.module.scss';

// The events this person worked on and in which role. Somebody who never was in a team has no such block.
export const PersonTeamRoles = memo(({ personId }: { personId: string }) => {
    const { t } = useTranslation();
    const load = useCallback(() => listPersonTeamRoles(personId), [personId]);
    const roles = useResource(load);
    if (!roles.error && !roles.data?.length) return null;
    return <section className={cls.panel} aria-label={t('Work on events')}><h2>{t('Work on events')}</h2>
        <RequestState error={roles.error} loading={false} />
        {roles.data?.map(role => <div className={cls.row} key={role.id}>
            <Link to={`/events/${role.event.id}`}>{role.event.name}</Link>
            <span>{role.roleTitle}</span>
            <span className={cls.muted}>{formatDate(role.event.startAt)}</span>
        </div>)}
    </section>;
});
