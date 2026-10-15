import { FormEvent, memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Person, savePerson } from '@/entities/Person';
import { Button, ButtonTheme } from '@/shared/ui/Button';
import { Panel } from '@/shared/ui/Panel';
import { Field } from '@/shared/ui/Field';
import { RequestState } from '@/shared/ui/RequestState';
import cls from '@/shared/ui/layout/layout.module.scss';
import own from './PersonPage.module.scss';

// Editing only: a new person is created from the header (features/createPerson).
export const PersonForm = memo(({ person, onSaved }: { person: Person; onSaved: () => void }) => {
    const { t } = useTranslation();
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const values = new FormData(event.currentTarget);
        setSaving(true);
        setError('');
        try {
            await savePerson(
                {
                    firstName: String(values.get('firstName')),
                    lastName: String(values.get('lastName')),
                    email: String(values.get('email')) || null,
                    phone: String(values.get('phone')) || null,
                    notes: String(values.get('notes')),
                },
                person.id
            );
            setSaved(true);
            onSaved();
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : t('Unable to save'));
        } finally {
            setSaving(false);
        }
    };
    // "Saved" is true only until the next keystroke: after it the form differs from what is stored.
    return (
        <Panel as="form" onSubmit={submit} onChange={() => setSaved(false)}>
            <h2>{t('Edit contact')}</h2>
            <div className={cls.grid}>
                <Field label="First name">
                    <input name="firstName" defaultValue={person.firstName} required />
                </Field>
                <Field label="Last name">
                    <input name="lastName" defaultValue={person.lastName} required />
                </Field>
                <Field label="Email">
                    <input name="email" type="email" defaultValue={person.email || ''} />
                </Field>
                <Field label="Phone">
                    <input name="phone" type="tel" defaultValue={person.phone || ''} />
                </Field>
            </div>
            <Field label="Notes">
                <textarea name="notes" rows={4} defaultValue={person.notes || ''} />
            </Field>
            <RequestState error={error} loading={false} />
            <div className={own.formActions}>
                {saved && (
                    <span role="status" className={cls.muted}>
                        {t('Saved')}
                    </span>
                )}
                <Button type="submit" theme={ButtonTheme.BACKGROUND_INVERTED} disabled={saving}>
                    {t('Save')}
                </Button>
            </div>
        </Panel>
    );
});
