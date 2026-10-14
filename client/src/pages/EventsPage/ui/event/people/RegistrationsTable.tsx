import { memo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { EventRegistration } from '@/entities/Registration';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { listStyles as own } from '@/shared/ui/ListTable';
import { fullNameOf } from '@/entities/Person';

const RegistrationRow = memo(({ registration }: { registration: EventRegistration }) => {
    const { person } = registration;
    const name = fullNameOf(person) || '—';
    return (
        <tr>
            <td>
                <Link className={own.name} to={`/people/${person.id}`}>
                    {name}
                </Link>
            </td>
            <td className={own.secondary}>
                {person.email && person.email !== name ? person.email : '—'}
            </td>
            <td className={`${own.secondary} ${own.optional}`}>{person.phone || '—'}</td>
            <td className={`${own.secondary} ${own.optional}`}>{person.country || '—'}</td>
            <td className={own.secondary}>{registration.ticket?.ticketType || '—'}</td>
            <td>
                <StatusBadge status={registration.status} />
            </td>
        </tr>
    );
});

export const RegistrationsTable = memo(
    ({ registrations }: { registrations: EventRegistration[] }) => {
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
                            <th>{t('Ticket')}</th>
                            <th>{t('Status')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {registrations.map((registration) => (
                            <RegistrationRow key={registration.id} registration={registration} />
                        ))}
                    </tbody>
                </table>
            </div>
        );
    }
);
