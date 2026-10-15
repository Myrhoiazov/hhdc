import { memo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Person, fullNameOf } from '@/entities/Person';
import { formatDate } from '@/shared/lib/format/date';
import { Badge } from '@/shared/ui/Badge';
import { listStyles as own } from '@/shared/ui/ListTable';
import { DeleteContactButton } from '../PersonRemoval';

// `onDeleted` is given only to staff who may delete contacts.
interface RowProps {
    person: Person;
    onDeleted?: () => void;
}

const PersonRow = memo(({ person, onDeleted }: RowProps) => {
    const { t } = useTranslation();
    const { pathname, search } = useLocation();
    const name = fullNameOf(person) || '—';
    return (
        <tr>
            <td>
                <Link
                    className={own.name}
                    to={`/people/${person.id}`}
                    state={{ peopleList: pathname + search }}
                >
                    {name}
                </Link>
            </td>
            <td className={own.secondary}>
                {person.email && person.email !== name ? person.email : '—'}
            </td>
            <td className={`${own.secondary} ${own.optional} ${own.whole}`}>
                {person.phone || '—'}
            </td>
            <td className={`${own.secondary} ${own.optional}`}>{person.country || '—'}</td>
            <td>
                <span className={own.badges}>
                    {person.roles.map((item) => (
                        <Badge key={item.role}>{t(item.role)}</Badge>
                    ))}
                </span>
            </td>
            <td className={`${own.secondary} ${own.optional}`}>
                {person.source
                    ? t(`Person source: ${person.source}`, { defaultValue: person.source })
                    : '—'}
            </td>
            <td className={own.number}>{person._count?.orders ?? 0}</td>
            <td className={`${own.secondary} ${own.optional} ${own.whole}`}>
                {person.createdAt ? formatDate(person.createdAt) : '—'}
            </td>
            {onDeleted && (
                <td>
                    {person.removal?.allowed && (
                        <DeleteContactButton person={person} onDeleted={onDeleted} />
                    )}
                </td>
            )}
        </tr>
    );
});

export const PeopleTable = memo(
    ({ people, onDeleted }: { people: Person[]; onDeleted?: () => void }) => {
        const { t } = useTranslation();
        return (
            <div className={own.tableScroll}>
                <table className={own.table}>
                    <thead>
                        <tr>
                            <th>{t('Full name')}</th>
                            <th>{t('Email')}</th>
                            <th className={own.optional}>{t('Phone')}</th>
                            <th className={own.optional}>{t('Country')}</th>
                            <th>{t('Roles')}</th>
                            <th className={own.optional}>{t('Source')}</th>
                            <th className={own.number}>{t('Purchases')}</th>
                            <th className={own.optional}>{t('Added')}</th>
                            {onDeleted && <th aria-label={t('Actions')} />}
                        </tr>
                    </thead>
                    <tbody>
                        {people.map((person) => (
                            <PersonRow key={person.id} person={person} onDeleted={onDeleted} />
                        ))}
                    </tbody>
                </table>
            </div>
        );
    }
);
