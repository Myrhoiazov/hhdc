import { FormEvent, memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { addPersonRole, Person, PERSON_ROLES as ROLES, PersonRole, savePerson } from '@/entities/crm';
import { formText } from '@/shared/lib/form/formText';
import { Button, ButtonTheme } from '@/shared/ui/Button';
import { Field } from '@/shared/ui/Field';
import { Modal } from '@/shared/ui/Modal';
import cls from './CreatePersonModal.module.scss';


// Creates the person, then adds the chosen roles: a role is a separate record of the same Person.
const createPerson = async (form: FormData): Promise<Person> => {
    const saved = await savePerson({
        firstName: formText(form, 'firstName'), lastName: formText(form, 'lastName'),
        email: formText(form, 'email') || null, phone: formText(form, 'phone') || null, notes: formText(form, 'notes'),
    });
    await Promise.all(form.getAll('roles').map((role) => addPersonRole(saved.id, role as PersonRole)));
    return saved;
};

const PersonFields = memo(() => {
    const { t } = useTranslation();
    return <>
        <div className={cls.grid}>
            <Field className={cls.field} label="First name"><input name="firstName" required autoFocus /></Field>
            <Field className={cls.field} label="Last name"><input name="lastName" required /></Field>
            <Field className={cls.field} label="Email"><input name="email" type="email" /></Field>
            <Field className={cls.field} label="Phone"><input name="phone" type="tel" /></Field>
        </div>
        <Field className={cls.field} label="Notes"><textarea name="notes" rows={3} /></Field>
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
