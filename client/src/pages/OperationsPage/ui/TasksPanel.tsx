import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { listTasks, Task, updateTaskStatus } from '@/entities/Operations';
import { formatDate } from '@/shared/lib/format/date';
import { useAction } from '@/shared/lib/useResource/useAction';
import { useResource } from '@/shared/lib/useResource/useResource';
import { Button } from '@/shared/ui/Button';
import { RequestState } from '@/shared/ui/RequestState';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { Panel } from '@/shared/ui/Panel';
import cls from '@/shared/ui/layout/layout.module.scss';

const TaskRow = memo(({ task, refresh }: { task: Task; refresh: () => void }) => {
    const { t } = useTranslation();
    const action = useAction(refresh);
    return (
        <div className={cls.row}>
            <span>{task.title}</span>
            <span className={cls.muted}>
                {t(task.priority)}
                {task.dueDate ? ` · ${formatDate(task.dueDate)}` : ''}
            </span>
            <StatusBadge status={task.status} />
            {task.status !== 'DONE' && (
                <Button
                    disabled={action.busy}
                    onClick={() => void action.run(() => updateTaskStatus(task.id, 'DONE'))}
                >
                    {t('Complete')}
                </Button>
            )}
        </div>
    );
});

export const TasksPanel = memo(() => {
    const { t } = useTranslation();
    const tasks = useResource(listTasks);
    const refresh = useCallback(() => {
        void tasks.refresh();
    }, [tasks]);
    return (
        <Panel>
            <h2>{t('Tasks')}</h2>
            <RequestState error={tasks.error} loading={tasks.loading} />
            {tasks.data?.length === 0 && <p>{t('No tasks')}</p>}
            {tasks.data?.map((item) => (
                <TaskRow key={item.id} task={item} refresh={refresh} />
            ))}
        </Panel>
    );
});
