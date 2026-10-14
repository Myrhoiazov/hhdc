import { memo, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { createChoreographer } from '@/entities/Choreographer';
import { listPeople } from '@/entities/Person';
import { useResource } from '@/shared/lib/useResource/useResource';
import { Button } from '@/shared/ui/Button';
import { Field } from '@/shared/ui/Field';
import { RequestState } from '@/shared/ui/RequestState';
import { Panel } from '@/shared/ui/Panel';
import cls from '@/shared/ui/layout/layout.module.scss';
import own from '../Choreographers.module.scss';

// A choreographer is always an existing person: the profile is added to them, never a copy.
export const AddChoreographer = memo(() => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [personId, setPersonId] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const load = useCallback(
        () =>
            search.trim().length >= 2
                ? listPeople(search.trim())
                : Promise.resolve({ data: [], total: 0 }),
        [search]
    );
    const people = useResource(load);
    const add = async () => {
        setBusy(true);
        setError('');
        try {
            await createChoreographer(personId);
            navigate(`/people/choreographers/${personId}/biography`);
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : t('Request failed'));
        } finally {
            setBusy(false);
        }
    };
    return (
        <Panel aria-label={t('Add choreographer')}>
            <h2>{t('Add choreographer')}</h2>
            <p className={cls.muted}>
                {t(
                    'Pick an existing contact. Create the contact under People first if it does not exist yet.'
                )}
            </p>
            <div className={own.filters}>
                <Field label="Find contact">
                    <input
                        value={search}
                        onChange={(event) => {
                            setSearch(event.target.value);
                            setPersonId('');
                        }}
                    />
                </Field>
                <Field label="Contact">
                    <select value={personId} onChange={(event) => setPersonId(event.target.value)}>
                        <option value="">{t('Select person')}</option>
                        {people.data?.data.map((person) => (
                            <option
                                key={person.id}
                                value={person.id}
                            >{`${person.displayName || `${person.firstName} ${person.lastName}`} · ${person.email ?? '—'}`}</option>
                        ))}
                    </select>
                </Field>
            </div>
            <div className={cls.actions}>
                <Button disabled={busy || !personId} onClick={() => void add()}>
                    {t('Create choreographer profile')}
                </Button>
            </div>
            <RequestState error={error} loading={false} />
        </Panel>
    );
});
