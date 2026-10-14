import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { listEventTeam } from '@/entities/EventTeam';
import { useResource } from '@/shared/lib/useResource/useResource';
import { RequestState } from '@/shared/ui/RequestState';
import { Panel } from '@/shared/ui/Panel';
import cls from '@/shared/ui/layout/layout.module.scss';
import { RoleHints } from './RoleHints';
import { TeamTable } from './TeamTable';
import { AddMember } from './AddMember';
import { useTeamChanges } from '../../../model/useTeamChanges';

interface EventTeamProps {
    eventId: string;
    canEdit: boolean;
    seesMoney: boolean;
    version?: number;
    onChanged?: () => void;
}

// Who works on the event besides its choreographers: the role, the duties and — for those who may
// see finance — the pay, which is the sum of the event's expenses naming the role.
export const EventTeam = memo(
    ({ eventId, canEdit, seesMoney, version = 0, onChanged }: EventTeamProps) => {
        const { t } = useTranslation();
        // `version` changes when an expense of the event does, so the pay is read again.
        const load = useCallback(() => listEventTeam(eventId), [eventId, version]); // eslint-disable-line react-hooks/exhaustive-deps
        const team = useResource(load);
        const refresh = useCallback(() => {
            void team.refresh();
            onChanged?.();
        }, [team, onChanged]);
        const changes = useTeamChanges(eventId, refresh);
        const { data } = team;
        return (
            <Panel id="event-team" aria-label={t('Team')}>
                <h2>{t('Team')}</h2>
                <RoleHints />
                <RequestState error={team.error || changes.error} loading={team.loading && !data} />
                {data && data.length > 0 && (
                    <TeamTable
                        members={data}
                        open={changes.open}
                        canEdit={canEdit}
                        seesMoney={seesMoney}
                        busy={changes.busy}
                        onOpen={changes.setOpen}
                        onDelete={changes.remove}
                        onSave={changes.save}
                        onPay={changes.pay}
                    />
                )}
                {data?.length === 0 && (
                    <p className={cls.muted}>{t('Nobody in the team of this event yet')}</p>
                )}
                {canEdit && <AddMember eventId={eventId} seesMoney={seesMoney} onSaved={refresh} />}
            </Panel>
        );
    }
);
