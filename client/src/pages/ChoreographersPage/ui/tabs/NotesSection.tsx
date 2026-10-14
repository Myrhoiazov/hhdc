import { FormEvent, memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    addChoreographerNote,
    ChoreographerNote,
    listChoreographerNotes,
    removeChoreographerNote,
    updateChoreographerNote,
} from '@/entities/Choreographer';
import { formatDate } from '@/shared/lib/format/date';
import { useResource } from '@/shared/lib/useResource/useResource';
import { Button } from '@/shared/ui/Button';
import { Field } from '@/shared/ui/Field';
import { RequestState } from '@/shared/ui/RequestState';
import { Panel } from '@/shared/ui/Panel';
import cls from '@/shared/ui/layout/layout.module.scss';
import own from '../Choreographers.module.scss';
import type { ActionRun as Run } from '@/shared/lib/useResource/useAction';

const NoteCard = memo(
    ({
        note,
        personId,
        canManage,
        run,
    }: {
        note: ChoreographerNote;
        personId: string;
        canManage: boolean;
        run: Run;
    }) => {
        const { t } = useTranslation();
        const label = note.content.slice(0, 40);
        return (
            <article className={own.assignment} aria-label={label}>
                <div className={own.headerTop}>
                    <div className={own.secondary}>
                        {[formatDate(note.createdAt), note.createdByName]
                            .filter(Boolean)
                            .join(' · ')}
                    </div>
                    {note.isPinned && <span className={own.chip}>{t('Pinned')}</span>}
                </div>
                <p className={own.bio}>{note.content}</p>
                {canManage && (
                    <div className={cls.actions}>
                        <Button
                            aria-label={`${t(note.isPinned ? 'Unpin' : 'Pin')}: ${label}`}
                            onClick={() =>
                                void run(() =>
                                    updateChoreographerNote(personId, note.id, {
                                        isPinned: !note.isPinned,
                                    })
                                )
                            }
                        >
                            {t(note.isPinned ? 'Unpin' : 'Pin')}
                        </Button>
                        <Button
                            aria-label={`${t('Delete')}: ${label}`}
                            onClick={() =>
                                void run(() => removeChoreographerNote(personId, note.id))
                            }
                        >
                            {t('Delete')}
                        </Button>
                    </div>
                )}
            </article>
        );
    }
);

const NoteForm = memo(({ personId, run }: { personId: string; run: Run }) => {
    const { t } = useTranslation();
    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const element = event.currentTarget;
        const form = new FormData(element);
        const content = String(form.get('content') ?? '').trim();
        if (!content) return;
        void run(() => addChoreographerNote(personId, content, form.get('isPinned') === 'on')).then(
            (saved) => {
                if (saved) element.reset();
            }
        );
    };
    return (
        <form onSubmit={submit} aria-label={t('Add note')}>
            <Field label="New note">
                <textarea name="content" rows={3} maxLength={5000} required />
            </Field>
            <label className={own.secondary}>
                <input type="checkbox" name="isPinned" />
                {` ${t('Pin to the top')}`}
            </label>
            <div className={cls.actions}>
                <Button type="submit">{t('Add note')}</Button>
            </div>
        </form>
    );
});

export const NotesSection = memo(
    ({ personId, canManage }: { personId: string; canManage: boolean }) => {
        const { t } = useTranslation();
        const load = useCallback(() => listChoreographerNotes(personId), [personId]);
        const notes = useResource(load);
        const [error, setError] = useState('');
        const run: Run = async (work) => {
            setError('');
            try {
                await work();
                await notes.refresh();
                return true;
            } catch (cause) {
                setError(cause instanceof Error ? cause.message : t('Request failed'));
                return false;
            }
        };
        return (
            <Panel aria-label={t('Internal notes')}>
                <h2>{t('Internal notes')}</h2>
                <p className={cls.muted}>
                    {t('Visible to staff only. Never sent to the choreographer.')}
                </p>
                <RequestState error={error || notes.error} loading={notes.loading && !notes.data} />
                {notes.data?.map((note) => (
                    <NoteCard
                        key={note.id}
                        note={note}
                        personId={personId}
                        canManage={canManage}
                        run={run}
                    />
                ))}
                {notes.data?.length === 0 && <p className={cls.muted}>{t('No notes yet.')}</p>}
                {canManage && <NoteForm personId={personId} run={run} />}
            </Panel>
        );
    }
);
