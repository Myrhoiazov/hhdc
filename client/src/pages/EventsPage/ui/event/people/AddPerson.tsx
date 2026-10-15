import { memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { assignChoreographer } from '@/entities/Event';
import { registerPerson } from '@/entities/Registration';
import { listPeople, fullNameOf } from '@/entities/Person';
import { useResource } from '@/shared/lib/useResource/useResource';
import { Button } from '@/shared/ui/Button';
import { Field } from '@/shared/ui/Field';
import { RequestState } from '@/shared/ui/RequestState';
import { useDelayed } from '@/shared/lib/hooks/useDelayed/useDelayed';
import { Panel } from '@/shared/ui/Panel';
import { listStyles as own } from '@/shared/ui/ListTable';
import cls from '@/shared/ui/layout/layout.module.scss';
import { MIN_SEARCH } from '../../../model/search';

// A contact is found by typing: the CRM holds more people than a single list can offer.
export const AddPerson = memo(({ eventId, onSaved }: { eventId: string; onSaved: () => void }) => {
    const { t } = useTranslation();
    const [search, setSearch] = useState('');
    const [personId, setPersonId] = useState('');
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const q = useDelayed(search);
    const load = useCallback(
        () =>
            q.trim().length >= MIN_SEARCH
                ? listPeople(q.trim())
                : Promise.resolve({ data: [], total: 0 }),
        [q]
    );
    const found = useResource(load);
    const add = async (kind: 'registration' | 'choreographer') => {
        setSaving(true);
        setError('');
        try {
            await (kind === 'registration'
                ? registerPerson(eventId, personId)
                : assignChoreographer(eventId, personId));
            setPersonId('');
            setSearch('');
            onSaved();
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : t('Unable to save'));
        } finally {
            setSaving(false);
        }
    };
    return (
        <Panel id="event-add-person" aria-label={t('Add a person to the event')}>
            <h2>{t('Add a person to the event')}</h2>
            <p className={cls.muted}>
                {t('Type at least two letters of the name or email to find a contact.')}
            </p>
            <div className={own.filters}>
                <div className={own.search}>
                    <Field label="Find contact">
                        <input
                            type="search"
                            value={search}
                            onChange={(event) => {
                                setSearch(event.target.value);
                                setPersonId('');
                            }}
                        />
                    </Field>
                </div>
                <Field label="Contact">
                    <select value={personId} onChange={(event) => setPersonId(event.target.value)}>
                        <option value="">{t('Select person')}</option>
                        {found.data?.data.map((person) => (
                            <option
                                key={person.id}
                                value={person.id}
                            >{`${fullNameOf(person) || '—'} · ${person.email ?? '—'}`}</option>
                        ))}
                    </select>
                </Field>
                <Button disabled={!personId || saving} onClick={() => void add('registration')}>
                    {t('Register participant')}
                </Button>
                <Button disabled={!personId || saving} onClick={() => void add('choreographer')}>
                    {t('Assign choreographer')}
                </Button>
            </div>
            <RequestState error={error || found.error} loading={false} />
        </Panel>
    );
});
