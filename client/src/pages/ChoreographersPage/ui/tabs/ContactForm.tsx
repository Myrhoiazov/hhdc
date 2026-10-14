import { FormEvent, memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CONTACT_KINDS, ContactKind, createChoreographerContact } from '@/entities/Choreographer';
import { formText } from '@/shared/lib/form/formText';
import { Button } from '@/shared/ui/Button';
import { Field } from '@/shared/ui/Field';
import { RequestState } from '@/shared/ui/RequestState';
import { Panel } from '@/shared/ui/Panel';
import cls from '@/shared/ui/layout/layout.module.scss';

export const ContactForm = memo(
    ({ personId, onSaved }: { personId: string; onSaved: () => void }) => {
        const { t } = useTranslation();
        const [error, setError] = useState('');
        const [busy, setBusy] = useState(false);
        const submit = async (event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            const formElement = event.currentTarget;
            const form = new FormData(formElement);
            setBusy(true);
            setError('');
            try {
                await createChoreographerContact(personId, {
                    kind: formText(form, 'kind') as ContactKind,
                    name: formText(form, 'name'),
                    organization: formText(form, 'organization'),
                    email: formText(form, 'email'),
                    phone: formText(form, 'phone'),
                    notes: formText(form, 'notes'),
                    isPrimary: form.get('isPrimary') === 'on',
                });
                formElement.reset();
                onSaved();
            } catch (cause) {
                setError(cause instanceof Error ? cause.message : t('Unable to save'));
            } finally {
                setBusy(false);
            }
        };
        return (
            <Panel as="form" onSubmit={submit} aria-label={t('Add contact')}>
                <h2>{t('Add contact')}</h2>
                <div className={cls.grid}>
                    <Field label="Contact type">
                        <select name="kind" defaultValue="MANAGER">
                            {CONTACT_KINDS.map((kind) => (
                                <option key={kind} value={kind}>
                                    {t(kind)}
                                </option>
                            ))}
                        </select>
                    </Field>
                    <Field label="Name">
                        <input name="name" maxLength={200} />
                    </Field>
                    <Field label="Organization">
                        <input name="organization" maxLength={200} />
                    </Field>
                    <Field label="Email">
                        <input name="email" type="email" />
                    </Field>
                    <Field label="Phone">
                        <input name="phone" type="tel" />
                    </Field>
                    <label className={cls.check}>
                        <input name="isPrimary" type="checkbox" />
                        {t('Primary contact')}
                    </label>
                    <div className={cls.wide}>
                        <Field label="Notes">
                            <textarea name="notes" rows={2} />
                        </Field>
                    </div>
                </div>
                <RequestState error={error} loading={false} />
                <div className={cls.actions}>
                    <Button type="submit" disabled={busy}>
                        {t('Add contact')}
                    </Button>
                </div>
            </Panel>
        );
    }
);
