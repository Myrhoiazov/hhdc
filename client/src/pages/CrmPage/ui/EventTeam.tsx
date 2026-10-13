import { FormEvent, memo, useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    addTeamMember, createEventExpense, listEventTeam, listPeople, removeTeamMember, TEAM_PERSON_ROLES, TeamMember, TeamMemberChange, TeamPersonRole, updateTeamMember,
} from '@/entities/crm';
import { formText } from '@/shared/lib/form/formText';
import { useAction } from '@/shared/lib/useResource/useAction';
import { useResource } from '@/shared/lib/useResource/useResource';
import { Button } from '@/shared/ui/Button';
import { Field } from '@/shared/ui/Field';
import { RequestState } from '@/shared/ui/RequestState';
import { useNumbers } from '@/shared/lib/format/useNumbers';
import { ConfirmDelete } from '@/shared/ui/ConfirmDelete';
import { useDelayed } from '@/shared/lib/hooks/useDelayed/useDelayed';
import { listStyles as list } from './ListTable';
import cls from './CrmPage.module.scss';
import own from './EventTeam.module.scss';

const MIN_SEARCH = 2;
// Roles offered while typing; any other role can be typed in.
const ROLE_HINTS = ['Project administrator', 'Videographer', 'Photographer', 'Sound engineer', 'Equipment supplier'];
const ROLE_HINTS_ID = 'event-team-role-hints';

const money = (form: FormData) => formText(form, 'amount').replace(',', '.');

const RoleHints = memo(() => {
    const { t } = useTranslation();
    return <datalist id={ROLE_HINTS_ID}>{ROLE_HINTS.map(role => <option key={role} value={t(role)} />)}</datalist>;
});

// Whose row is open for a change, and for which one.
type Open = { memberId: string; mode: 'edit' | 'pay' } | null;
interface RowActions { canEdit: boolean; seesMoney: boolean; busy: boolean; onOpen: (open: Open) => void; onDelete: (member: TeamMember) => Promise<void> }

const Contacts = memo(({ person }: { person: TeamMember['person'] }) => <span className={own.contacts}>
    {person.email && <a href={`mailto:${person.email}`}>{person.email}</a>}
    {person.phone && <a className={list.whole} href={`tel:${person.phone}`}>{person.phone}</a>}
</span>);

const Pay = memo(({ pay }: { pay: NonNullable<TeamMember['pay']> }) => {
    const { t } = useTranslation();
    const { money: format } = useNumbers(pay.currency);
    if (!(Number(pay.total) > 0)) return <span className={list.secondary}>{t('No pay set')}</span>;
    return <span className={own.pay}><strong>{format(pay.total)}</strong>
        <span className={list.secondary}>{t('paid: {{paid}} · still to pay: {{planned}}', { paid: format(pay.paid), planned: format(pay.planned) })}</span>
    </span>;
});

const MemberRow = memo(({ member, canEdit, seesMoney, busy, onOpen, onDelete }: RowActions & { member: TeamMember }) => {
    const { t } = useTranslation();
    const name = member.person.displayName;
    return <tr>
        <td className={own.person}><Link className={list.name} to={`/people/${member.person.id}`}>{name}</Link><Contacts person={member.person} /></td>
        <td>{member.roleTitle}</td>
        <td className={`${list.secondary} ${own.duties}`}>{member.duties || '—'}{member.notes && <span className={own.notes}>{member.notes}</span>}</td>
        {seesMoney && <td>{member.pay && <Pay pay={member.pay} />}</td>}
        {canEdit && <td><span className={cls.actions}>
            {seesMoney && <Button disabled={busy} onClick={() => onOpen({ memberId: member.id, mode: 'pay' })}>{t('Add a payment')}</Button>}
            <Button disabled={busy} onClick={() => onOpen({ memberId: member.id, mode: 'edit' })}>{t('Edit')}</Button>
            <ConfirmDelete label={t('Remove {{name}} from the team', { name })} onDelete={() => onDelete(member)} />
        </span></td>}
    </tr>;
});

interface FormRowProps { member: TeamMember; columns: number; busy: boolean; onCancel: () => void }

const EditRow = memo(({ member, columns, busy, onCancel, onSave }: FormRowProps & { onSave: (member: TeamMember, change: TeamMemberChange) => void }) => {
    const { t } = useTranslation();
    const title = t('Edit the role of {{name}}', { name: member.person.displayName });
    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        onSave(member, { roleTitle: formText(form, 'roleTitle'), duties: formText(form, 'duties') || null, notes: formText(form, 'notes') || null });
    };
    return <tr><td colSpan={columns}><form className={own.fields} onSubmit={submit} aria-label={title}>
        <strong className={own.whole}>{title}</strong>
        <Field label="Role on the event"><input name="roleTitle" list={ROLE_HINTS_ID} maxLength={120} defaultValue={member.roleTitle} required /></Field>
        <div className={own.wide}><Field label="What they do on the event"><textarea name="duties" rows={2} maxLength={2000} defaultValue={member.duties ?? ''} /></Field></div>
        <div className={own.whole}><Field label="Notes"><input name="notes" maxLength={2000} defaultValue={member.notes ?? ''} /></Field></div>
        <div className={`${cls.actions} ${own.whole}`}><Button type="submit" disabled={busy}>{t('Save')}</Button><Button disabled={busy} onClick={onCancel}>{t('Cancel')}</Button></div>
    </form></td></tr>;
});

export interface TeamPayment { amount: string; expenseDate: string | null; paid: boolean }

// A payment for the role: one more line among the expenses of the event, a salary paid to this person.
const PayRow = memo(({ member, columns, busy, onCancel, onPay }: FormRowProps & { onPay: (member: TeamMember, payment: TeamPayment) => void }) => {
    const { t } = useTranslation();
    const [error, setError] = useState('');
    const title = t('Add a payment to {{name}}', { name: `${member.person.displayName} — ${member.roleTitle}` });
    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const amount = money(form);
        if (!(Number(amount) > 0)) { setError(t('Enter an amount greater than zero')); return; }
        onPay(member, { amount, expenseDate: formText(form, 'expenseDate') || null, paid: Boolean(form.get('paid')) });
    };
    return <tr><td colSpan={columns}><form className={own.fields} onSubmit={submit} aria-label={title}>
        <strong className={own.whole}>{title}</strong>
        <Field label="Amount"><input name="amount" inputMode="decimal" autoComplete="off" required /></Field>
        <Field label="Date"><input name="expenseDate" type="date" /></Field>
        <label className={own.check}><input type="checkbox" name="paid" />{t('Already paid')}</label>
        {error && <p role="alert" className={`${cls.error} ${own.whole}`}>{error}</p>}
        <div className={`${cls.actions} ${own.whole}`}><Button type="submit" disabled={busy}>{t('Save payment')}</Button><Button disabled={busy} onClick={onCancel}>{t('Cancel')}</Button></div>
    </form></td></tr>;
});

interface TableProps extends RowActions {
    members: TeamMember[]; open: Open;
    onSave: (member: TeamMember, change: TeamMemberChange) => void; onPay: (member: TeamMember, payment: TeamPayment) => void;
}

const TeamTable = memo(({ members, open, onSave, onPay, ...actions }: TableProps) => {
    const { t } = useTranslation();
    const columns = 3 + Number(actions.seesMoney) + Number(actions.canEdit);
    const close = () => actions.onOpen(null);
    return <div className={list.tableScroll}><table className={list.table}>
        <thead><tr>
            <th>{t('Full name')}</th><th>{t('Role on the event')}</th><th>{t('What they do on the event')}</th>
            {actions.seesMoney && <th>{t('Pay')}</th>}{actions.canEdit && <th aria-label={t('Actions')} />}
        </tr></thead>
        <tbody>{members.map(member => {
            if (open?.memberId !== member.id) return <MemberRow key={member.id} member={member} {...actions} />;
            return open.mode === 'edit'
                ? <EditRow key={`edit-${member.id}`} member={member} columns={columns} busy={actions.busy} onCancel={close} onSave={onSave} />
                : <PayRow key={`pay-${member.id}`} member={member} columns={columns} busy={actions.busy} onCancel={close} onPay={onPay} />;
        })}</tbody>
    </table></div>;
});

const personLabel = (person: { displayName?: string; firstName: string; lastName: string; email?: string | null }) =>
    `${person.displayName || `${person.firstName} ${person.lastName}`.trim()} · ${person.email ?? '—'}`;

// The contact is found by typing among all people of the CRM.
const PersonFields = memo(() => {
    const { t } = useTranslation();
    const [search, setSearch] = useState('');
    const q = useDelayed(search);
    const load = useCallback(() => (q.trim().length >= MIN_SEARCH ? listPeople(q.trim()) : Promise.resolve({ data: [], total: 0 })), [q]);
    const found = useResource(load);
    return <>
        <Field label="Find contact"><input type="search" value={search} onChange={event => setSearch(event.target.value)} /></Field>
        <Field label="Contact"><select name="personId" required defaultValue="">
            <option value="">{t('Select person')}</option>
            {found.data?.data.map(person => <option key={person.id} value={person.id}>{personLabel(person)}</option>)}
        </select></Field>
        <Field label="Works as"><select name="personRole" defaultValue="STAFF">
            {TEAM_PERSON_ROLES.map(role => <option key={role} value={role}>{t(`Team: ${role}`)}</option>)}
        </select></Field>
    </>;
});

const readMember = (form: FormData) => ({
    personId: formText(form, 'personId'), roleTitle: formText(form, 'roleTitle'), duties: formText(form, 'duties') || null,
    personRole: formText(form, 'personRole') as TeamPersonRole, ...(money(form) ? { amount: money(form) } : {}),
});

const AddMember = memo(({ eventId, seesMoney, onSaved }: { eventId: string; seesMoney: boolean; onSaved: () => void }) => {
    const { t } = useTranslation();
    // A saved member empties the form, the contact search included.
    const [formKey, setFormKey] = useState(0);
    const action = useAction(onSaved);
    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const element = event.currentTarget;
        if (await action.run(() => addTeamMember(eventId, readMember(new FormData(element))))) { element.reset(); setFormKey(key => key + 1); }
    };
    return <form className={own.form} onSubmit={event => void submit(event)} aria-label={t('Add a team member')}>
        <div className={own.intro}><h3>{t('Add a team member')}</h3>
            <p className={cls.muted}>{t('Somebody who works on the event: an administrator, a videographer, a partner who supplies equipment. One person can hold several roles, each with its own pay. A contact who is neither staff nor a partner yet gets the role chosen here.')}</p></div>
        <div className={own.fields}>
            <PersonFields key={formKey} />
            <Field label="Role on the event"><input name="roleTitle" list={ROLE_HINTS_ID} maxLength={120} required /></Field>
            {seesMoney && <Field label="Pay, if agreed"><input name="amount" inputMode="decimal" autoComplete="off" /></Field>}
            <div className={own.whole}><Field label="What they do on the event"><textarea name="duties" rows={2} maxLength={2000} /></Field></div>
        </div>
        {action.error && <p role="alert" className={cls.error}>{action.error}</p>}
        <div className={cls.actions}><Button type="submit" disabled={action.busy}>{t('Add to the team')}</Button></div>
    </form>;
});

// Changes of the team of one event: each is saved at once and the team is read again.
const useTeamChanges = (eventId: string, refresh: () => void) => {
    const [open, setOpen] = useState<Open>(null);
    const done = useCallback(() => { setOpen(null); refresh(); }, [refresh]);
    const action = useAction(done);
    return {
        open, setOpen, busy: action.busy, error: action.error,
        save: (member: TeamMember, change: TeamMemberChange) => void action.run(() => updateTeamMember(eventId, member.id, change)),
        pay: (member: TeamMember, payment: TeamPayment) => void action.run(() => createEventExpense(eventId, {
            category: 'SALARY', amount: payment.amount, expenseDate: payment.expenseDate, teamMemberId: member.id, status: payment.paid ? 'PAID' : 'PLANNED',
        })),
        remove: async (member: TeamMember) => { await removeTeamMember(eventId, member.id); done(); },
    };
};

interface EventTeamProps { eventId: string; canEdit: boolean; seesMoney: boolean; version?: number; onChanged?: () => void }

// Who works on the event besides its choreographers: the role, the duties and — for those who may
// see finance — the pay, which is the sum of the event's expenses naming the role.
export const EventTeam = memo(({ eventId, canEdit, seesMoney, version = 0, onChanged }: EventTeamProps) => {
    const { t } = useTranslation();
    // `version` changes when an expense of the event does, so the pay is read again.
    const load = useCallback(() => listEventTeam(eventId), [eventId, version]); // eslint-disable-line react-hooks/exhaustive-deps
    const team = useResource(load);
    const refresh = useCallback(() => { void team.refresh(); onChanged?.(); }, [team, onChanged]);
    const changes = useTeamChanges(eventId, refresh);
    const { data } = team;
    return <section id="event-team" className={cls.panel} aria-label={t('Team')}>
        <h2>{t('Team')}</h2>
        <RoleHints />
        <RequestState error={team.error || changes.error} loading={team.loading && !data} />
        {data && data.length > 0 && <TeamTable members={data} open={changes.open} canEdit={canEdit} seesMoney={seesMoney} busy={changes.busy}
            onOpen={changes.setOpen} onDelete={changes.remove} onSave={changes.save} onPay={changes.pay} />}
        {data?.length === 0 && <p className={cls.muted}>{t('Nobody in the team of this event yet')}</p>}
        {canEdit && <AddMember eventId={eventId} seesMoney={seesMoney} onSaved={refresh} />}
    </section>;
});
