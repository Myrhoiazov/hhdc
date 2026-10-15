import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { TeamMember, TeamMemberChange } from '@/entities/EventTeam';
import { listStyles as list } from '@/shared/ui/ListTable';
import { RowActions, MemberRow } from './MemberRow';
import { EditRow } from './EditRow';
import { PayRow } from './PayRow';
import { Open, TeamPayment } from '../../../model/teamTypes';

interface TableProps extends RowActions {
    members: TeamMember[];
    open: Open;
    onSave: (member: TeamMember, change: TeamMemberChange) => void;
    onPay: (member: TeamMember, payment: TeamPayment) => void;
}

export const TeamTable = memo(({ members, open, onSave, onPay, ...actions }: TableProps) => {
    const { t } = useTranslation();
    const columns = 3 + Number(actions.seesMoney) + Number(actions.canEdit);
    const close = () => actions.onOpen(null);
    return (
        <div className={list.tableScroll}>
            <table className={list.table}>
                <thead>
                    <tr>
                        <th>{t('Full name')}</th>
                        <th>{t('Role on the event')}</th>
                        <th>{t('What they do on the event')}</th>
                        {actions.seesMoney && <th>{t('Pay')}</th>}
                        {actions.canEdit && <th aria-label={t('Actions')} />}
                    </tr>
                </thead>
                <tbody>
                    {members.map((member) => {
                        if (open?.memberId !== member.id)
                            return <MemberRow key={member.id} member={member} {...actions} />;
                        return open.mode === 'edit' ? (
                            <EditRow
                                key={`edit-${member.id}`}
                                member={member}
                                columns={columns}
                                busy={actions.busy}
                                onCancel={close}
                                onSave={onSave}
                            />
                        ) : (
                            <PayRow
                                key={`pay-${member.id}`}
                                member={member}
                                columns={columns}
                                busy={actions.busy}
                                onCancel={close}
                                onPay={onPay}
                            />
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
});
