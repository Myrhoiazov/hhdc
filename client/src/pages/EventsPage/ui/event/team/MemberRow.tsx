import { memo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { TeamMember } from '@/entities/EventTeam';
import { Button } from '@/shared/ui/Button';
import { useNumbers } from '@/shared/lib/format/useNumbers';
import { ConfirmDelete } from '@/shared/ui/ConfirmDelete';
import { listStyles as list } from '@/shared/ui/ListTable';
import cls from '@/shared/ui/layout/layout.module.scss';
import own from './EventTeam.module.scss';
import { Open } from '../../../model/teamTypes';

export interface RowActions {
    canEdit: boolean;
    seesMoney: boolean;
    busy: boolean;
    onOpen: (open: Open) => void;
    onDelete: (member: TeamMember) => Promise<void>;
}

const Contacts = memo(({ person }: { person: TeamMember['person'] }) => (
    <span className={own.contacts}>
        {person.email && <a href={`mailto:${person.email}`}>{person.email}</a>}
        {person.phone && (
            <a className={list.whole} href={`tel:${person.phone}`}>
                {person.phone}
            </a>
        )}
    </span>
));

const Pay = memo(({ pay }: { pay: NonNullable<TeamMember['pay']> }) => {
    const { t } = useTranslation();
    const { money: format } = useNumbers(pay.currency);
    if (!(Number(pay.total) > 0)) return <span className={list.secondary}>{t('No pay set')}</span>;
    return (
        <span className={own.pay}>
            <strong>{format(pay.total)}</strong>
            <span className={list.secondary}>
                {t('paid: {{paid}} · still to pay: {{planned}}', {
                    paid: format(pay.paid),
                    planned: format(pay.planned),
                })}
            </span>
        </span>
    );
});

export const MemberRow = memo(
    ({
        member,
        canEdit,
        seesMoney,
        busy,
        onOpen,
        onDelete,
    }: RowActions & { member: TeamMember }) => {
        const { t } = useTranslation();
        const name = member.person.displayName;
        return (
            <tr>
                <td className={own.person}>
                    <Link className={list.name} to={`/people/${member.person.id}`}>
                        {name}
                    </Link>
                    <Contacts person={member.person} />
                </td>
                <td>{member.roleTitle}</td>
                <td className={`${list.secondary} ${own.duties}`}>
                    {member.duties || '—'}
                    {member.notes && <span className={own.notes}>{member.notes}</span>}
                </td>
                {seesMoney && <td>{member.pay && <Pay pay={member.pay} />}</td>}
                {canEdit && (
                    <td>
                        <span className={cls.actions}>
                            {seesMoney && (
                                <Button
                                    disabled={busy}
                                    onClick={() => onOpen({ memberId: member.id, mode: 'pay' })}
                                >
                                    {t('Add a payment')}
                                </Button>
                            )}
                            <Button
                                disabled={busy}
                                onClick={() => onOpen({ memberId: member.id, mode: 'edit' })}
                            >
                                {t('Edit')}
                            </Button>
                            <ConfirmDelete
                                label={t('Remove {{name}} from the team', { name })}
                                onDelete={() => onDelete(member)}
                            />
                        </span>
                    </td>
                )}
            </tr>
        );
    }
);
