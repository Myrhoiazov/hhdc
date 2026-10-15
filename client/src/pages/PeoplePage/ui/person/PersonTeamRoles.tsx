import { memo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { listPersonTeamRoles } from '@/entities/EventTeam';
import { formatDate } from '@/shared/lib/format/date';
import { useResource } from '@/shared/lib/useResource/useResource';
import { RequestState } from '@/shared/ui/RequestState';
import { Panel } from '@/shared/ui/Panel';
import cls from '@/shared/ui/layout/layout.module.scss';

// The events this person worked on and in which role. Somebody who never was in a team has no such block.
export const PersonTeamRoles = memo(({ personId }: { personId: string }) => {
    const { t } = useTranslation();
    const load = useCallback(() => listPersonTeamRoles(personId), [personId]);
    const roles = useResource(load);
    if (!roles.error && !roles.data?.length) return null;
    return (
        <Panel aria-label={t('Work on events')}>
            <h2>{t('Work on events')}</h2>
            <RequestState error={roles.error} loading={false} />
            {roles.data?.map((role) => (
                <div className={cls.row} key={role.id}>
                    <Link to={`/events/${role.event.id}`}>{role.event.name}</Link>
                    <span>{role.roleTitle}</span>
                    <span className={cls.muted}>{formatDate(role.event.startAt)}</span>
                </div>
            ))}
        </Panel>
    );
});
