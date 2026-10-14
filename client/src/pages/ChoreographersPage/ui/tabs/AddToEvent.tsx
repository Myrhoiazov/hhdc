import { FormEvent, memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ASSIGNMENT_STATUSES,
    AssignmentStatus,
    assignChoreographerToEvent,
} from '@/entities/Choreographer';
import { listEvents } from '@/entities/Event';
import { useResource } from '@/shared/lib/useResource/useResource';
import { Button } from '@/shared/ui/Button';
import { Field } from '@/shared/ui/Field';
import { RequestState } from '@/shared/ui/RequestState';
import { Panel } from '@/shared/ui/Panel';
import cls from '@/shared/ui/layout/layout.module.scss';

export const AddToEvent = memo(
    ({
        personId,
        assignedEventIds,
        onSaved,
    }: {
        personId: string;
        assignedEventIds: string[];
        onSaved: () => void;
    }) => {
        const { t } = useTranslation();
        const events = useResource(listEvents);
        const [error, setError] = useState('');
        const [busy, setBusy] = useState(false);
        const available = (events.data?.data ?? []).filter(
            (event) => !assignedEventIds.includes(event.id)
        );
        const submit = async (event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            const formElement = event.currentTarget;
            const form = new FormData(formElement);
            setBusy(true);
            setError('');
            try {
                await assignChoreographerToEvent(personId, {
                    eventId: String(form.get('eventId')),
                    roleTitle: String(form.get('roleTitle') ?? '').trim() || undefined,
                    status: String(form.get('status')) as AssignmentStatus,
                });
                formElement.reset();
                onSaved();
            } catch (cause) {
                setError(cause instanceof Error ? cause.message : t('Unable to save'));
            } finally {
                setBusy(false);
            }
        };
        return (
            <Panel as="form" onSubmit={submit} aria-label={t('Add to event')}>
                <h2>{t('Add to event')}</h2>
                <p className={cls.muted}>
                    {t(
                        'Past editions can be linked too. If the event is not in the list, create it under Events first.'
                    )}
                </p>
                <div className={cls.grid}>
                    <Field label="Event">
                        <select name="eventId" required defaultValue="">
                            <option value="" disabled>
                                {t('Select event')}
                            </option>
                            {available.map((event) => (
                                <option key={event.id} value={event.id}>
                                    {event.name}
                                </option>
                            ))}
                        </select>
                    </Field>
                    <Field label="Role at the event">
                        <input name="roleTitle" maxLength={120} placeholder="Choreographer" />
                    </Field>
                    <Field label="Participation">
                        <select name="status" defaultValue="INVITED">
                            {ASSIGNMENT_STATUSES.map((status) => (
                                <option key={status} value={status}>
                                    {t(status)}
                                </option>
                            ))}
                        </select>
                    </Field>
                </div>
                <RequestState error={error || events.error} loading={false} />
                <div className={cls.actions}>
                    <Button type="submit" disabled={busy}>
                        {t('Add to event')}
                    </Button>
                </div>
            </Panel>
        );
    }
);
