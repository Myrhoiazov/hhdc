import { FormEvent, memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    addChoreographerTask,
    ChoreographerTask,
    listChoreographerTasks,
    TASK_PRIORITIES,
} from '@/entities/Choreographer';
import { updateTaskStatus } from '@/entities/Operations';
import { formatDate } from '@/shared/lib/format/date';
import { useResource } from '@/shared/lib/useResource/useResource';
import { Button } from '@/shared/ui/Button';
import { Field } from '@/shared/ui/Field';
import { RequestState } from '@/shared/ui/RequestState';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { Panel } from '@/shared/ui/Panel';
import cls from '@/shared/ui/layout/layout.module.scss';
import own from '../Choreographers.module.scss';
import type { ActionRun as Run } from '@/shared/lib/useResource/useAction';
import { dueAtEndOfDay, isOpen, isOverdue } from '../../model/followUps';

const TaskRow = memo(
    ({ task, canManage, run }: { task: ChoreographerTask; canManage: boolean; run: Run }) => {
        const { t } = useTranslation();
        const overdue = isOverdue(task);
        return (
            <div className={cls.row}>
                <span>
                    <strong>{task.title}</strong>
                    <div className={own.secondary}>
                        {[
                            task.dueDate
                                ? `${t('Due')}: ${formatDate(task.dueDate)}`
                                : t('No due date'),
                            task.assignee?.name,
                            t(`PRIORITY_${task.priority}`),
                        ]
                            .filter(Boolean)
                            .join(' · ')}
                    </div>
                </span>
                <span className={cls.actions}>
                    {overdue && <span className={own.chip}>{t('Overdue')}</span>}
                    <StatusBadge status={task.status} />
                    {canManage && isOpen(task) && (
                        <Button
                            aria-label={`${t('Mark done')}: ${task.title}`}
                            onClick={() => void run(() => updateTaskStatus(task.id, 'DONE'))}
                        >
                            {t('Mark done')}
                        </Button>
                    )}
                </span>
            </div>
        );
    }
);

const TaskForm = memo(({ personId, run }: { personId: string; run: Run }) => {
    const { t } = useTranslation();
    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const element = event.currentTarget;
        const form = new FormData(element);
        const title = String(form.get('title') ?? '').trim();
        if (!title) return;
        void run(() =>
            addChoreographerTask(personId, {
                title,
                dueDate: dueAtEndOfDay(String(form.get('dueDate') ?? '')),
                priority: String(form.get('priority') ?? 'NORMAL'),
            })
        ).then((saved) => {
            if (saved) element.reset();
        });
    };
    return (
        <form onSubmit={submit} aria-label={t('Add follow-up')}>
            <div className={cls.grid}>
                <Field label="What needs to be done">
                    <input name="title" maxLength={300} required />
                </Field>
                <Field label="Due date">
                    <input name="dueDate" type="date" />
                </Field>
                <Field label="Priority">
                    <select name="priority" defaultValue="NORMAL">
                        {TASK_PRIORITIES.map((priority) => (
                            <option key={priority} value={priority}>
                                {t(`PRIORITY_${priority}`)}
                            </option>
                        ))}
                    </select>
                </Field>
            </div>
            <p className={cls.muted}>
                {t('You get a reminder in the CRM a day before the due date.')}
            </p>
            <div className={cls.actions}>
                <Button type="submit">{t('Add follow-up')}</Button>
            </div>
        </form>
    );
});

export const TasksSection = memo(
    ({ personId, canManage }: { personId: string; canManage: boolean }) => {
        const { t } = useTranslation();
        const load = useCallback(() => listChoreographerTasks(personId), [personId]);
        const tasks = useResource(load);
        const [error, setError] = useState('');
        const run: Run = async (work) => {
            setError('');
            try {
                await work();
                await tasks.refresh();
                return true;
            } catch (cause) {
                setError(cause instanceof Error ? cause.message : t('Request failed'));
                return false;
            }
        };
        return (
            <Panel aria-label={t('Follow-ups')}>
                <h2>{t('Follow-ups')}</h2>
                <RequestState error={error || tasks.error} loading={tasks.loading && !tasks.data} />
                {tasks.data?.map((task) => (
                    <TaskRow key={task.id} task={task} canManage={canManage} run={run} />
                ))}
                {tasks.data?.length === 0 && <p className={cls.muted}>{t('No follow-ups yet.')}</p>}
                {canManage && <TaskForm personId={personId} run={run} />}
            </Panel>
        );
    }
);
