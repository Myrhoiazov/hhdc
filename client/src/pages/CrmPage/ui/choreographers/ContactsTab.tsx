import { FormEvent, memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ChoreographerContact, CONTACT_KINDS, ContactKind, createChoreographerContact, deactivateChoreographerContact, listChoreographerContacts,
    updateChoreographerContact,
} from '@/entities/crm';
import { useResource } from '@/shared/lib/useResource/useResource';
import { Button } from '@/shared/ui/Button';
import { Field, RequestState, StatusBadge } from '../common';
import cls from '../CrmPage.module.scss';
import own from './Choreographers.module.scss';

const text = (form: FormData, name: string) => String(form.get(name) ?? '').trim();

interface ContactRowProps {
    contact: ChoreographerContact;
    canManage: boolean;
    onMakePrimary: (contact: ChoreographerContact) => void;
    onDeactivate: (contact: ChoreographerContact) => void;
}

const ContactRow = memo(({ contact, canManage, onMakePrimary, onDeactivate }: ContactRowProps) => {
    const { t } = useTranslation();
    return <div className={own.listRow}>
        <span><strong>{contact.name || contact.email || contact.phone}</strong>
            <div className={own.secondary}>{[t(contact.kind), contact.organization].filter(Boolean).join(' · ')}</div></span>
        <span className={own.secondary}>{[contact.email, contact.phone].filter(Boolean).join(' · ')}{contact.notes && <div>{contact.notes}</div>}</span>
        <span className={own.chips}>
            {contact.isPrimary && <span className={own.chip}>{t('Primary')}</span>}
            <StatusBadge status={contact.isActive ? 'ACTIVE' : 'INACTIVE'} />
        </span>
        {canManage && contact.isActive && <span className={cls.actions}>
            {!contact.isPrimary && <Button onClick={() => onMakePrimary(contact)}>{t('Make primary')}</Button>}
            <Button onClick={() => onDeactivate(contact)}>{t('Deactivate')}</Button>
        </span>}
    </div>;
});

const ContactForm = memo(({ personId, onSaved }: { personId: string; onSaved: () => void }) => {
    const { t } = useTranslation();
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formElement = event.currentTarget;
        const form = new FormData(formElement);
        setBusy(true); setError('');
        try {
            await createChoreographerContact(personId, {
                kind: text(form, 'kind') as ContactKind, name: text(form, 'name'), organization: text(form, 'organization'),
                email: text(form, 'email'), phone: text(form, 'phone'), notes: text(form, 'notes'), isPrimary: form.get('isPrimary') === 'on',
            });
            formElement.reset(); onSaved();
        } catch (cause) { setError(cause instanceof Error ? cause.message : t('Unable to save')); }
        finally { setBusy(false); }
    };
    return <form className={cls.panel} onSubmit={submit} aria-label={t('Add contact')}><h2>{t('Add contact')}</h2>
        <div className={cls.grid}>
            <Field label="Contact type"><select name="kind" defaultValue="MANAGER">{CONTACT_KINDS.map((kind) => <option key={kind} value={kind}>{t(kind)}</option>)}</select></Field>
            <Field label="Name"><input name="name" maxLength={200} /></Field>
            <Field label="Organization"><input name="organization" maxLength={200} /></Field>
            <Field label="Email"><input name="email" type="email" /></Field>
            <Field label="Phone"><input name="phone" type="tel" /></Field>
            <label className={cls.check}><input name="isPrimary" type="checkbox" />{t('Primary contact')}</label>
            <div className={cls.wide}><Field label="Notes"><textarea name="notes" rows={2} /></Field></div>
        </div>
        <RequestState error={error} loading={false} />
        <div className={cls.actions}><Button type="submit" disabled={busy}>{t('Add contact')}</Button></div>
    </form>;
});

export const ContactsTab = memo(({ personId, canManage }: { personId: string; canManage: boolean }) => {
    const { t } = useTranslation();
    const load = useCallback(() => listChoreographerContacts(personId), [personId]);
    const contacts = useResource(load);
    const [error, setError] = useState('');
    const act = (work: Promise<unknown>) => {
        setError('');
        work.then(() => contacts.refresh()).catch((cause) => setError(cause instanceof Error ? cause.message : t('Request failed')));
    };
    const makePrimary = (contact: ChoreographerContact) => act(updateChoreographerContact(personId, contact.id, { isPrimary: true }));
    const deactivate = (contact: ChoreographerContact) => act(deactivateChoreographerContact(personId, contact.id));
    return <>
        <RequestState error={error || contacts.error} loading={contacts.loading && !contacts.data} />
        <section className={cls.panel} aria-label={t('Contacts')}><h2>{t('Contacts')}</h2>
            <p className={cls.muted}>{t('Managers, agents and other people who represent this choreographer. The main address is on the contact card.')}</p>
            {contacts.data?.map((contact) => <ContactRow key={contact.id} contact={contact} canManage={canManage} onMakePrimary={makePrimary} onDeactivate={deactivate} />)}
            {contacts.data?.length === 0 && <p className={cls.muted}>{t('No additional contacts yet.')}</p>}
        </section>
        {canManage && <ContactForm personId={personId} onSaved={() => void contacts.refresh()} />}
    </>;
});
