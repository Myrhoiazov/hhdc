import { FormEvent, memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createEvent } from '@/entities/Event';
import { Button } from '@/shared/ui/Button';
import { Field } from '@/shared/ui/Field';
import { RequestState } from '@/shared/ui/RequestState';
import { Panel } from '@/shared/ui/Panel';
import cls from '@/shared/ui/layout/layout.module.scss';

export const EventForm = memo(({ onSaved }: { onSaved: () => void }) => {
    const { t } = useTranslation();
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const form = event.currentTarget;
        const values = new FormData(form);
        setSaving(true);
        try {
            await createEvent({
                name: String(values.get('name')),
                slug: String(values.get('slug')),
                startAt: new Date(String(values.get('startAt'))).toISOString(),
                endAt: new Date(String(values.get('endAt'))).toISOString(),
                timezone: String(values.get('timezone')),
                venueName: String(values.get('venueName')),
                capacity: values.get('capacity') ? Number(values.get('capacity')) : null,
            });
            form.reset();
            onSaved();
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : t('Unable to save'));
        } finally {
            setSaving(false);
        }
    };
    return (
        <Panel as="form" onSubmit={submit}>
            <h2>{t('Create event')}</h2>
            <div className={cls.grid}>
                <Field label="Name">
                    <input name="name" required />
                </Field>
                <Field label="Slug">
                    <input name="slug" pattern="[a-z0-9-]+" required />
                </Field>
                <Field label="Starts at">
                    <input name="startAt" type="datetime-local" required />
                </Field>
                <Field label="Ends at">
                    <input name="endAt" type="datetime-local" required />
                </Field>
                <Field label="Timezone">
                    <input name="timezone" defaultValue="Europe/Amsterdam" required />
                </Field>
                <Field label="Venue">
                    <input name="venueName" />
                </Field>
                <Field label="Capacity">
                    <input name="capacity" type="number" min="1" />
                </Field>
            </div>
            <RequestState error={error} loading={false} />
            <Button type="submit" disabled={saving}>
                {t('Save')}
            </Button>
        </Panel>
    );
});
