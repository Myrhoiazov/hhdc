import { FormEvent, memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    addChoreographerNote, addChoreographerTask, ChoreographerNote, ChoreographerTask, listChoreographerNotes, listChoreographerTasks, removeChoreographerNote,
    TASK_PRIORITIES, updateChoreographerNote, updateTaskStatus,
} from '@/entities/crm';
import { useResource } from '@/shared/lib/useResource/useResource';
import { Button } from '@/shared/ui/Button';
import { Field, RequestState, StatusBadge } from '../common';
import cls from '../CrmPage.module.scss';
import own from './Choreographers.module.scss';

type Run = (work: () => Promise<unknown>) => Promise<boolean>;

// A date input gives a day; the task is due at the end of that day in the reader's time zone.
export const dueAtEndOfDay = (day: string): string | null => (day ? new Date(`${day}T23:59:00`).toISOString() : null);

const isOpen = (task: ChoreographerTask) => task.status === 'TODO' || task.status === 'IN_PROGRESS';
export const isOverdue = (task: ChoreographerTask, now = new Date()): boolean => isOpen(task) && !!task.dueDate && new Date(task.dueDate) < now;

const NoteCard = memo(({ note, personId, canManage, run }: { note: ChoreographerNote; personId: string; canManage: boolean; run: Run }) => {
    const { t } = useTranslation();
    const label = note.content.slice(0, 40);
    return <article className={own.assignment} aria-label={label}>
        <div className={own.headerTop}>
            <div className={own.secondary}>{[new Date(note.createdAt).toLocaleDateString(), note.createdByName].filter(Boolean).join(' · ')}</div>
            {note.isPinned && <span className={own.chip}>{t('Pinned')}</span>}
        </div>
        <p className={own.bio}>{note.content}</p>
        {canManage && <div className={cls.actions}>
            <Button aria-label={`${t(note.isPinned ? 'Unpin' : 'Pin')}: ${label}`}
                onClick={() => void run(() => updateChoreographerNote(personId, note.id, { isPinned: !note.isPinned }))}>{t(note.isPinned ? 'Unpin' : 'Pin')}</Button>
            <Button aria-label={`${t('Delete')}: ${label}`} onClick={() => void run(() => removeChoreographerNote(personId, note.id))}>{t('Delete')}</Button>
        </div>}
    </article>;
});

const NoteForm = memo(({ personId, run }: { personId: string; run: Run }) => {
    const { t } = useTranslation();
    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const element = event.currentTarget;
        const form = new FormData(element);
        const content = String(form.get('content') ?? '').trim();
        if (!content) return;
        void run(() => addChoreographerNote(personId, content, form.get('isPinned') === 'on')).then((saved) => { if (saved) element.reset(); });
    };
    return <form onSubmit={submit} aria-label={t('Add note')}>
        <Field label="New note"><textarea name="content" rows={3} maxLength={5000} required /></Field>
        <label className={own.secondary}><input type="checkbox" name="isPinned" />{` ${t('Pin to the top')}`}</label>
        <div className={cls.actions}><Button type="submit">{t('Add note')}</Button></div>
    </form>;
});

const NotesSection = memo(({ personId, canManage }: { personId: string; canManage: boolean }) => {
    const { t } = useTranslation();
    const load = useCallback(() => listChoreographerNotes(personId), [personId]);
    const notes = useResource(load);
    const [error, setError] = useState('');
    const run: Run = async (work) => {
        setError('');
        try { await work(); await notes.refresh(); return true; }
        catch (cause) { setError(cause instanceof Error ? cause.message : t('Request failed')); return false; }
    };
    return <section className={cls.panel} aria-label={t('Internal notes')}><h2>{t('Internal notes')}</h2>
        <p className={cls.muted}>{t('Visible to staff only. Never sent to the choreographer.')}</p>
        <RequestState error={error || notes.error} loading={notes.loading && !notes.data} />
        {notes.data?.map((note) => <NoteCard key={note.id} note={note} personId={personId} canManage={canManage} run={run} />)}
        {notes.data?.length === 0 && <p className={cls.muted}>{t('No notes yet.')}</p>}
        {canManage && <NoteForm personId={personId} run={run} />}
    </section>;
});

const TaskRow = memo(({ task, canManage, run }: { task: ChoreographerTask; canManage: boolean; run: Run }) => {
    const { t } = useTranslation();
    const overdue = isOverdue(task);
    return <div className={cls.row}>
        <span><strong>{task.title}</strong>
            <div className={own.secondary}>{[task.dueDate ? `${t('Due')}: ${new Date(task.dueDate).toLocaleDateString()}` : t('No due date'), task.assignee?.name, t(`PRIORITY_${task.priority}`)].filter(Boolean).join(' · ')}</div></span>
        <span className={cls.actions}>
            {overdue && <span className={own.chip}>{t('Overdue')}</span>}
            <StatusBadge status={task.status} />
            {canManage && isOpen(task) && <Button aria-label={`${t('Mark done')}: ${task.title}`} onClick={() => void run(() => updateTaskStatus(task.id, 'DONE'))}>{t('Mark done')}</Button>}
        </span>
    </div>;
});

const TaskForm = memo(({ personId, run }: { personId: string; run: Run }) => {
    const { t } = useTranslation();
    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const element = event.currentTarget;
        const form = new FormData(element);
        const title = String(form.get('title') ?? '').trim();
        if (!title) return;
        void run(() => addChoreographerTask(personId, { title, dueDate: dueAtEndOfDay(String(form.get('dueDate') ?? '')), priority: String(form.get('priority') ?? 'NORMAL') }))
            .then((saved) => { if (saved) element.reset(); });
    };
    return <form onSubmit={submit} aria-label={t('Add follow-up')}>
        <div className={cls.grid}>
            <Field label="What needs to be done"><input name="title" maxLength={300} required /></Field>
            <Field label="Due date"><input name="dueDate" type="date" /></Field>
            <Field label="Priority"><select name="priority" defaultValue="NORMAL">
                {TASK_PRIORITIES.map((priority) => <option key={priority} value={priority}>{t(`PRIORITY_${priority}`)}</option>)}</select></Field>
        </div>
        <p className={cls.muted}>{t('You get a reminder in the CRM a day before the due date.')}</p>
        <div className={cls.actions}><Button type="submit">{t('Add follow-up')}</Button></div>
    </form>;
});

const TasksSection = memo(({ personId, canManage }: { personId: string; canManage: boolean }) => {
    const { t } = useTranslation();
    const load = useCallback(() => listChoreographerTasks(personId), [personId]);
    const tasks = useResource(load);
    const [error, setError] = useState('');
    const run: Run = async (work) => {
        setError('');
        try { await work(); await tasks.refresh(); return true; }
        catch (cause) { setError(cause instanceof Error ? cause.message : t('Request failed')); return false; }
    };
    return <section className={cls.panel} aria-label={t('Follow-ups')}><h2>{t('Follow-ups')}</h2>
        <RequestState error={error || tasks.error} loading={tasks.loading && !tasks.data} />
        {tasks.data?.map((task) => <TaskRow key={task.id} task={task} canManage={canManage} run={run} />)}
        {tasks.data?.length === 0 && <p className={cls.muted}>{t('No follow-ups yet.')}</p>}
        {canManage && <TaskForm personId={personId} run={run} />}
    </section>;
});

export interface NotesTabProps { personId: string; canManageNotes: boolean; canReadTasks: boolean; canManageTasks: boolean }

export const NotesTab = memo(({ personId, canManageNotes, canReadTasks, canManageTasks }: NotesTabProps) => <>
    <NotesSection personId={personId} canManage={canManageNotes} />
    {canReadTasks && <TasksSection personId={personId} canManage={canManageTasks} />}
</>);
