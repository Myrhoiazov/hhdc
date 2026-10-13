import { memo, useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { listPeoplePage, PeopleFilters, Person, PERSON_ROLES as ROLES, PERSON_SOURCES } from '@/entities/crm';
import { useCan } from '@/entities/User';
import { formatDate } from '@/shared/lib/format/date';
import { useResource } from '@/shared/lib/useResource/useResource';
import { Button } from '@/shared/ui/Button';
import { readPeopleList, writePeopleList } from '../model/peopleListUrl';
import { CrmLayout } from './common';
import { Field } from '@/shared/ui/Field';
import { RequestState } from '@/shared/ui/RequestState';
import { Pager } from '@/shared/ui/Pager';
import { useListFilters } from '@/shared/lib/hooks/useListFilters/useListFilters';
import cls from './CrmPage.module.scss';
import { listStyles as own } from './ListTable';
import { DeleteContactButton } from './PersonRemoval';

const NO_FILTERS: PeopleFilters = { q: '', role: '', source: '', purchases: '' };

const personName = (person: Person) => person.displayName || `${person.firstName} ${person.lastName}`.trim() || '—';

// The list starts from what the address says and keeps the address in step with itself, without
// adding a history entry per filter or page: "back" leaves the list, it does not replay it.
const usePeopleList = () => {
    const [params, setParams] = useSearchParams();
    const [start] = useState(() => readPeopleList(params));
    const list = useListFilters(NO_FILTERS, start);
    const { applied, page } = list;
    const address = writePeopleList(applied, page);
    useEffect(() => {
        if (params.toString() !== address) setParams(address, { replace: true });
    }, [params, address, setParams]);
    const load = useCallback(() => listPeoplePage(applied, page), [applied, page]);
    return { ...list, list: useResource(load) };
};

interface FiltersProps { filters: PeopleFilters; filtered: boolean; onChange: (patch: Partial<PeopleFilters>) => void; onReset: () => void }

const PeopleFiltersBar = memo(({ filters, filtered, onChange, onReset }: FiltersProps) => {
    const { t } = useTranslation();
    return <div className={own.filters}>
        <div className={own.search}><Field label="Search by name, email or phone"><input type="search" value={filters.q} onChange={event => onChange({ q: event.target.value })} /></Field></div>
        <Field label="Role"><select value={filters.role} onChange={event => onChange({ role: event.target.value as PeopleFilters['role'] })}>
            <option value="">{t('Any role')}</option>
            {ROLES.map(role => <option key={role} value={role}>{t(role)}</option>)}
        </select></Field>
        <Field label="Source"><select value={filters.source} onChange={event => onChange({ source: event.target.value as PeopleFilters['source'] })}>
            <option value="">{t('Any source')}</option>
            {PERSON_SOURCES.map(source => <option key={source} value={source}>{t(`Person source: ${source}`)}</option>)}
        </select></Field>
        <Field label="Purchases filter"><select value={filters.purchases} onChange={event => onChange({ purchases: event.target.value as PeopleFilters['purchases'] })}>
            <option value="">{t('With or without purchases')}</option>
            <option value="yes">{t('With purchases')}</option>
            <option value="no">{t('Without purchases')}</option>
        </select></Field>
        <Button disabled={!filtered} onClick={onReset}>{t('Reset filters')}</Button>
    </div>;
});

// `onDeleted` is given only to staff who may delete contacts.
interface RowProps { person: Person; onDeleted?: () => void }

const PersonRow = memo(({ person, onDeleted }: RowProps) => {
    const { t } = useTranslation();
    const { pathname, search } = useLocation();
    const name = personName(person);
    return <tr>
        <td><Link className={own.name} to={`/people/${person.id}`} state={{ peopleList: pathname + search }}>{name}</Link></td>
        <td className={own.secondary}>{person.email && person.email !== name ? person.email : '—'}</td>
        <td className={`${own.secondary} ${own.optional} ${own.whole}`}>{person.phone || '—'}</td>
        <td className={`${own.secondary} ${own.optional}`}>{person.country || '—'}</td>
        <td><span className={own.badges}>{person.roles.map(item => <span className={cls.badge} key={item.role}>{t(item.role)}</span>)}</span></td>
        <td className={`${own.secondary} ${own.optional}`}>{person.source ? t(`Person source: ${person.source}`, { defaultValue: person.source }) : '—'}</td>
        <td className={own.number}>{person._count?.orders ?? 0}</td>
        <td className={`${own.secondary} ${own.optional} ${own.whole}`}>{person.createdAt ? formatDate(person.createdAt) : '—'}</td>
        {onDeleted && <td>{person.removal?.allowed && <DeleteContactButton person={person} onDeleted={onDeleted} />}</td>}
    </tr>;
});

const PeopleTable = memo(({ people, onDeleted }: { people: Person[]; onDeleted?: () => void }) => {
    const { t } = useTranslation();
    return <div className={own.tableScroll}><table className={own.table}>
        <thead><tr>
            <th>{t('Full name')}</th><th>{t('Email')}</th><th className={own.optional}>{t('Phone')}</th><th className={own.optional}>{t('Country')}</th>
            <th>{t('Roles')}</th><th className={own.optional}>{t('Source')}</th><th className={own.number}>{t('Purchases')}</th><th className={own.optional}>{t('Added')}</th>
            {onDeleted && <th aria-label={t('Actions')} />}
        </tr></thead>
        <tbody>{people.map(person => <PersonRow key={person.id} person={person} onDeleted={onDeleted} />)}</tbody>
    </table></div>;
});

export const PeoplePage = memo(() => {
    const { t } = useTranslation();
    const people = usePeopleList();
    const { data } = people.list;
    const canDelete = useCan()('people.write');
    const refresh = useCallback(() => { void people.list.refresh(); }, [people.list]);
    return <CrmLayout title="People">
        <PeopleFiltersBar filters={people.filters} filtered={people.filtered} onChange={people.change} onReset={people.reset} />
        <section className={cls.panel} aria-label={t('All contacts')}>
            <div className={own.summary}>
                <h2>{t('All contacts')}</h2>
                {data && <div className={own.summaryEnd}>
                    <span className={cls.muted}>{t('Contacts found: {{count}}', { count: data.total })}</span>
                    <Pager page={people.page} total={data.total} onChange={people.setPage} />
                </div>}
            </div>
            <RequestState error={people.list.error} loading={people.list.loading && !data} />
            {data && data.total > 0 && <PeopleTable people={data.data} onDeleted={canDelete ? refresh : undefined} />}
            {data?.total === 0 && <p className={cls.muted}>{t(people.filtered ? 'No contacts match the filters' : 'No contacts yet')}</p>}
            {data && <Pager page={people.page} total={data.total} onChange={people.setPage} />}
        </section>
    </CrmLayout>;
});
