import { FormEvent, memo, ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { addPersonRole, Person, PersonRole, savePerson } from '@/entities/crm';
import { Button, ButtonTheme } from '@/shared/ui/Button';
import { Modal } from '@/shared/ui/Modal';
import cls from './CreatePersonModal.module.scss';

const ROLES: PersonRole[] = ['CUSTOMER', 'PARTICIPANT', 'CHOREOGRAPHER', 'STAFF'];

const text = (form: FormData, name: string) => String(form.get(name) ?? '').trim();

// Creates the person, then adds the chosen roles: a role is a separate record of the same Person.
const createPerson = async (form: FormData): Promise<Person> => {
    const saved = await savePerson({
        firstName: text(form, 'firstName'), lastName: text(form, 'lastName'),
        email: text(form, 'email') || null, phone: text(form, 'phone') || null, notes: text(form, 'notes'),
    });
    await Promise.all(form.getAll('roles').map((role) => addPersonRole(saved.id, role as PersonRole)));
    return saved;
};

const Field = memo(({ label, children }: { label: string; children: ReactNode }) => {
    const { t } = useTranslation();
    return <label className={cls.field}><span>{t(label)}</span>{children}</label>;
});

const PersonFields = memo(() => {
    const { t } = useTranslation();
    return <>
        <div className={cls.grid}>
            <Field label="First name"><input name="firstName" required autoFocus /></Field>
            <Field label="Last name"><input name="lastName" required /></Field>
            <Field label="Email"><input name="email" type="email" /></Field>
            <Field label="Phone"><input name="phone" type="tel" /></Field>
        </div>
        <Field label="Notes"><textarea name="notes" rows={3} /></Field>
        <div className={cls.roles}>{ROLES.map((role) => <label key={role}><input name="roles" type="checkbox" value={role} /> {t(role)}</label>)}</div>
    </>;
});

interface CreatePersonModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreated: (person: Person) => void;
}

export const CreatePersonModal = memo(({ isOpen, onClose, onCreated }: CreatePersonModalProps) => {
    const { t } = useTranslation();
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        setSaving(true); setError('');
        try { onCreated(await createPerson(form)); }
        catch (cause) { setError(cause instanceof Error ? cause.message : t('Unable to save')); }
        finally { setSaving(false); }
    };
    return <Modal isOpen={isOpen} onClose={onClose} lazy>
        <form className={cls.CreatePersonModal} aria-label={t('Create person')} onSubmit={submit}>
            <h2>{t('Create person')}</h2>
            <PersonFields />
            {error && <p role="alert" className={cls.error}>{error}</p>}
            <div className={cls.actions}>
                <Button type="button" disabled={saving} onClick={onClose}>{t('Cancel')}</Button>
                <Button type="submit" theme={ButtonTheme.BACKGROUND_INVERTED} disabled={saving}>{t('Save')}</Button>
            </div>
        </form>
    </Modal>;
});
