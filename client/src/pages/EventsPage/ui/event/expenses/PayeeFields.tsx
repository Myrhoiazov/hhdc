import { memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ExpenseLine } from '@/entities/EventExpense';
import { TeamMember } from '@/entities/EventTeam';
import { listPayees } from '@/entities/Person';
import { useResource } from '@/shared/lib/useResource/useResource';
import { Field } from '@/shared/ui/Field';
import { useDelayed } from '@/shared/lib/hooks/useDelayed/useDelayed';
import cls from '@/shared/ui/layout/layout.module.scss';
import form from './EventExpenses.module.scss';
import { MIN_SEARCH } from '../../../model/search';
import { MEMBER, PERSON, payeeOf } from '../../../model/expenseForm';

// A payee outside the team is found by typing among choreographers, staff and partners: an expense is paid to somebody who works on the event.
const usePayeeSearch = () => {
    const [search, setSearch] = useState('');
    const q = useDelayed(search);
    const load = useCallback(
        () =>
            q.trim().length >= MIN_SEARCH
                ? listPayees(q.trim())
                : Promise.resolve({ data: [], total: 0 }),
        [q]
    );
    const found = useResource(load);
    // Somebody was looked for and nobody with the right role was found.
    const nobody = q.trim().length >= MIN_SEARCH && !found.loading && found.data?.total === 0;
    return { search, setSearch, found, nobody };
};

const payeeLabel = (person: {
    displayName?: string;
    firstName: string;
    lastName: string;
    email?: string | null;
}) => `${person.displayName || `${person.firstName} ${person.lastName}`} · ${person.email ?? '—'}`;

// Who the expense is paid to. The team of the event is offered first; anybody else is looked for
// by typing. `current` is the expense being corrected: its payee is offered so that it is kept.
export const PayeeFields = memo(
    ({ team, current }: { team: TeamMember[]; current?: ExpenseLine }) => {
        const { t } = useTranslation();
        const payee = usePayeeSearch();
        const kept = current?.person && !current.teamMember ? current.person : null;
        const found = (payee.found.data?.data ?? []).filter((person) => person.id !== kept?.id);
        return (
            <>
                <Field label="Find a payee outside the team">
                    <input
                        type="search"
                        value={payee.search}
                        onChange={(event) => payee.setSearch(event.target.value)}
                    />
                </Field>
                <div className={form.wide}>
                    <Field label="Paid to">
                        <select name="payee" defaultValue={payeeOf(current)}>
                            <option value="">{t('Nobody (a cost of the event itself)')}</option>
                            {team.length > 0 && (
                                <optgroup label={t('Team of the event')}>
                                    {team.map((member) => (
                                        <option
                                            key={member.id}
                                            value={`${MEMBER}${member.id}`}
                                        >{`${member.person.displayName} — ${member.roleTitle}`}</option>
                                    ))}
                                </optgroup>
                            )}
                            {kept && (
                                <option value={`${PERSON}${kept.id}`}>{kept.displayName}</option>
                            )}
                            {found.map((person) => (
                                <option key={person.id} value={`${PERSON}${person.id}`}>
                                    {payeeLabel(person)}
                                </option>
                            ))}
                        </select>
                    </Field>
                </div>
                {payee.nobody && (
                    <p className={`${form.wide} ${cls.muted}`} role="status">
                        {t(
                            'Nobody found among choreographers, staff and partners. An expense can be paid only to them: add the person to the team of the event or give the role on the page of the person first.'
                        )}
                    </p>
                )}
            </>
        );
    }
);
