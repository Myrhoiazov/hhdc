import { memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TEAM_PERSON_ROLES } from '@/entities/EventTeam';
import { listPeople } from '@/entities/Person';
import { useResource } from '@/shared/lib/useResource/useResource';
import { Field } from '@/shared/ui/Field';
import { useDelayed } from '@/shared/lib/hooks/useDelayed/useDelayed';
import { MIN_SEARCH } from '../../../model/search';

const personLabel = (person: {
    displayName?: string;
    firstName: string;
    lastName: string;
    email?: string | null;
}) =>
    `${person.displayName || `${person.firstName} ${person.lastName}`.trim()} · ${person.email ?? '—'}`;

// The contact is found by typing among all people of the CRM.
export const PersonFields = memo(() => {
    const { t } = useTranslation();
    const [search, setSearch] = useState('');
    const q = useDelayed(search);
    const load = useCallback(
        () =>
            q.trim().length >= MIN_SEARCH
                ? listPeople(q.trim())
                : Promise.resolve({ data: [], total: 0 }),
        [q]
    );
    const found = useResource(load);
    return (
        <>
            <Field label="Find contact">
                <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                />
            </Field>
            <Field label="Contact">
                <select name="personId" required defaultValue="">
                    <option value="">{t('Select person')}</option>
                    {found.data?.data.map((person) => (
                        <option key={person.id} value={person.id}>
                            {personLabel(person)}
                        </option>
                    ))}
                </select>
            </Field>
            <Field label="Works as">
                <select name="personRole" defaultValue="STAFF">
                    {TEAM_PERSON_ROLES.map((role) => (
                        <option key={role} value={role}>
                            {t(`Team: ${role}`)}
                        </option>
                    ))}
                </select>
            </Field>
        </>
    );
});
