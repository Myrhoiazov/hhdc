import { FormEvent, memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KnowledgeDocument, saveKnowledge } from '@/entities/Knowledge';
import { listEvents } from '@/entities/Event';
import { useResource } from '@/shared/lib/useResource/useResource';
import { Button } from '@/shared/ui/Button';
import { Field } from '@/shared/ui/Field';
import { RequestState } from '@/shared/ui/RequestState';
import { Panel } from '@/shared/ui/Panel';
import cls from '@/shared/ui/layout/layout.module.scss';
import { SCOPES, STATUSES } from '../../model/useKnowledgeList';

interface FormProps {
    document?: KnowledgeDocument;
    onSaved: () => void;
    onCancel: () => void;
}

export const KnowledgeForm = memo(({ document, onSaved, onCancel }: FormProps) => {
    const { t } = useTranslation();
    const events = useResource(listEvents);
    const [scope, setScope] = useState(document?.scope || 'GLOBAL');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const input = {
            title: String(form.get('title')),
            content: String(form.get('content')),
            scope,
            eventId: scope === 'EVENT' ? String(form.get('eventId')) : null,
            status: String(form.get('status')),
        };
        setBusy(true);
        try {
            await saveKnowledge(input, document?.id);
            onSaved();
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : t('Request failed'));
        } finally {
            setBusy(false);
        }
    };
    const title = t(document ? 'Edit document' : 'Create knowledge document');
    return (
        <Panel as="form" onSubmit={(event) => void submit(event)} aria-label={title}>
            <h2>{title}</h2>
            <div className={cls.grid}>
                <Field label="Title">
                    <input name="title" defaultValue={document?.title} required />
                </Field>
                <Field label="Scope">
                    <select value={scope} onChange={(event) => setScope(event.target.value)}>
                        {SCOPES.map((item) => (
                            <option key={item} value={item}>
                                {t(`Knowledge scope: ${item}`)}
                            </option>
                        ))}
                    </select>
                </Field>
                {scope === 'EVENT' && (
                    <Field label="Event">
                        <select name="eventId" defaultValue={document?.eventId || ''} required>
                            <option value="">{t('Select event')}</option>
                            {events.data?.data.map((item) => (
                                <option key={item.id} value={item.id}>
                                    {item.name}
                                </option>
                            ))}
                        </select>
                    </Field>
                )}
                <Field label="Status">
                    <select name="status" defaultValue={document?.status || 'DRAFT'}>
                        {STATUSES.map((status) => (
                            <option key={status} value={status}>
                                {t(status)}
                            </option>
                        ))}
                    </select>
                </Field>
            </div>
            <Field label="Content">
                <textarea name="content" rows={12} defaultValue={document?.content} required />
            </Field>
            <RequestState error={error} loading={false} />
            <div className={cls.actions}>
                <Button type="submit" disabled={busy}>
                    {t('Save')}
                </Button>
                {document && (
                    <Button disabled={busy} onClick={onCancel}>
                        {t('Cancel')}
                    </Button>
                )}
            </div>
        </Panel>
    );
});
