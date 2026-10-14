import { FormEvent, memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChoreographerThread, linkChoreographerThread } from '@/entities/Choreographer';
import { Conversation, listConversations } from '@/entities/Conversation';
import { useResource } from '@/shared/lib/useResource/useResource';
import { Button } from '@/shared/ui/Button';
import { Field } from '@/shared/ui/Field';
import { Panel } from '@/shared/ui/Panel';
import cls from '@/shared/ui/layout/layout.module.scss';

export const MIN_REASON = 3;

interface PickerProps {
    personId: string;
    candidates: ChoreographerThread[];
    onLinked: () => void;
}

const optionLabel = (item: {
    subject: string;
    person?: { displayName?: string; email?: string | null } | null;
}) => [item.subject, item.person?.displayName || item.person?.email].filter(Boolean).join(' — ');

// Linking is always a deliberate act with a written reason. Suggestions come only from the
// choreographer's own extra addresses; mail from a manager has to be found and linked by hand.
export const LinkConversation = memo(({ personId, candidates, onLinked }: PickerProps) => {
    const { t } = useTranslation();
    const [search, setSearch] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const load = useCallback(
        () =>
            search.trim().length >= 2
                ? listConversations({ q: search.trim() }, 1, 10)
                : Promise.resolve({ data: [] as Conversation[], total: 0 }),
        [search]
    );
    const found = useResource(load);
    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const element = event.currentTarget;
        const form = new FormData(element);
        const conversationId = String(form.get('conversationId') ?? '');
        const note = String(form.get('note') ?? '').trim();
        if (!conversationId || note.length < MIN_REASON) {
            setError(t('Choose a conversation and say why it belongs here'));
            return;
        }
        setBusy(true);
        setError('');
        try {
            await linkChoreographerThread(personId, conversationId, note);
            element.reset();
            setSearch('');
            onLinked();
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : t('Request failed'));
        } finally {
            setBusy(false);
        }
    };
    return (
        <Panel as="form" onSubmit={submit} aria-label={t('Link conversation')}>
            <h2>{t('Link conversation')}</h2>
            <p className={cls.muted}>
                {t(
                    'Mail from a manager or an agency is never linked automatically: the same person may represent several choreographers.'
                )}
            </p>
            <div className={cls.grid}>
                <Field label="Find conversation">
                    <input value={search} onChange={(event) => setSearch(event.target.value)} />
                </Field>
                <Field label="Conversation">
                    <select name="conversationId" defaultValue="">
                        <option value="">{t('Select conversation')}</option>
                        {candidates.length > 0 && (
                            <optgroup label={t('Suggested: sent from an own address')}>
                                {candidates.map((item) => (
                                    <option key={item.id} value={item.id}>
                                        {optionLabel(item)}
                                    </option>
                                ))}
                            </optgroup>
                        )}
                        {found.data?.data.map((item) => (
                            <option key={item.id} value={item.id}>
                                {optionLabel(item)}
                            </option>
                        ))}
                    </select>
                </Field>
                <div className={cls.wide}>
                    <Field label="Reason for the link">
                        <input name="note" maxLength={500} />
                    </Field>
                </div>
            </div>
            {error && (
                <p role="alert" className={cls.error}>
                    {error}
                </p>
            )}
            <div className={cls.actions}>
                <Button type="submit" disabled={busy}>
                    {t('Link conversation')}
                </Button>
            </div>
        </Panel>
    );
});
