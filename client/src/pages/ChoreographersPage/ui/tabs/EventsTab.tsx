import { memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    AssignmentUpdate,
    listChoreographerHistory,
    updateChoreographerAssignment,
} from '@/entities/Choreographer';
import { useResource } from '@/shared/lib/useResource/useResource';
import { RequestState } from '@/shared/ui/RequestState';
import { Panel } from '@/shared/ui/Panel';
import cls from '@/shared/ui/layout/layout.module.scss';
import { groupByYear } from '../../model/groupByYear';
import { AssignmentCard } from './AssignmentCard';
import { AddToEvent } from './AddToEvent';

export const EventsTab = memo(
    ({ personId, canManage }: { personId: string; canManage: boolean }) => {
        const { t } = useTranslation();
        const load = useCallback(() => listChoreographerHistory(personId), [personId]);
        const history = useResource(load);
        const [error, setError] = useState('');
        const update = (assignmentId: string, input: AssignmentUpdate) => {
            setError('');
            updateChoreographerAssignment(personId, assignmentId, input)
                .then(() => history.refresh())
                .catch((cause) =>
                    setError(cause instanceof Error ? cause.message : t('Request failed'))
                );
        };
        const items = history.data ?? [];
        return (
            <>
                <RequestState
                    error={error || history.error}
                    loading={history.loading && !history.data}
                />
                {groupByYear(items).map(([year, group]) => (
                    <Panel key={year} aria-label={String(year)}>
                        <h2>{year}</h2>
                        {group.map((item) => (
                            <AssignmentCard
                                key={item.id}
                                item={item}
                                canManage={canManage}
                                onUpdate={update}
                            />
                        ))}
                    </Panel>
                ))}
                {history.data?.length === 0 && (
                    <Panel>
                        <p className={cls.muted}>{t('Not assigned to any event yet.')}</p>
                    </Panel>
                )}
                {canManage && (
                    <AddToEvent
                        personId={personId}
                        assignedEventIds={items.map((item) => item.event.id)}
                        onSaved={() => void history.refresh()}
                    />
                )}
            </>
        );
    }
);
