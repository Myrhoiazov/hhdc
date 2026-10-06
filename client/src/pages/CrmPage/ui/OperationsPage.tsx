import { FormEvent, memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { checkIn, CheckinResult, getOperationsHealth, listEvents, listTasks, Task, updateTaskStatus } from '@/entities/crm';
import { classNames } from '@/shared/lib/classNames/classNames';
import { useAction } from '@/shared/lib/useResource/useAction';
import { useResource } from '@/shared/lib/useResource/useResource';
import { Button } from '@/shared/ui/Button';
import { CrmLayout, Field, RequestState, StatusBadge } from './common';
import cls from './CrmPage.module.scss';

const HEALTH_LABELS: [string, 'failedJobs' | 'failedOutbox' | 'pendingOutbox' | 'failedWebhooks' | 'failedAutomationRuns'][] = [
    ['Failed jobs (24h)', 'failedJobs'], ['Failed background events', 'failedOutbox'], ['Queued background events', 'pendingOutbox'],
    ['Failed webhook deliveries', 'failedWebhooks'], ['Failed automation runs (24h)', 'failedAutomationRuns'],
];

const HealthPanel = memo(() => {
    const { t } = useTranslation();
    const health = useResource(getOperationsHealth);
    return <section className={cls.panel}>
        <h2>{t('Integration health')}</h2>
        <RequestState error={health.error} loading={health.loading} />
        {health.data && HEALTH_LABELS.map(([label, key]) => <div className={cls.row} key={key}><span>{t(label)}</span><strong>{health.data?.[key]}</strong></div>)}
        {health.data?.providers.map(item => <div className={cls.row} key={item.id}><span>{item.name}</span><span className={cls.error}>{item.lastError}</span><StatusBadge status={item.status} /></div>)}
    </section>;
});

const TaskRow = memo(({ task, refresh }: { task: Task; refresh: () => void }) => {
    const { t } = useTranslation();
    const action = useAction(refresh);
    return <div className={cls.row}>
        <span>{task.title}</span>
        <span className={cls.muted}>{t(task.priority)}{task.dueDate ? ` · ${new Date(task.dueDate).toLocaleDateString()}` : ''}</span>
        <StatusBadge status={task.status} />
        {task.status !== 'DONE' && <Button disabled={action.busy} onClick={() => void action.run(() => updateTaskStatus(task.id, 'DONE'))}>{t('Complete')}</Button>}
    </div>;
});

const TasksPanel = memo(() => {
    const { t } = useTranslation();
    const tasks = useResource(listTasks);
    const refresh = useCallback(() => { void tasks.refresh(); }, [tasks]);
    return <section className={cls.panel}>
        <h2>{t('Tasks')}</h2>
        <RequestState error={tasks.error} loading={tasks.loading} />
        {tasks.data?.length === 0 && <p>{t('No tasks')}</p>}
        {tasks.data?.map(item => <TaskRow key={item.id} task={item} refresh={refresh} />)}
    </section>;
});

const CheckinOutcome = memo(({ result, error }: { result?: CheckinResult; error: string }) => {
    const { t } = useTranslation();
    if (error) return <div role="alert" className={classNames(cls.result, {}, [cls.danger])}><strong>{error}</strong></div>;
    if (!result) return null;
    return <div role="status" className={classNames(cls.result, {}, [cls.success])}>
        <strong>{result.registration.person.displayName}</strong>
        <p>{result.registration.event.name}{result.registration.ticket ? ` · ${result.registration.ticket.ticketType}` : ''}</p>
        <p>{t('Checked in')} {new Date(result.checkedInAt).toLocaleTimeString()}</p>
    </div>;
});

// Staff-only check-in: the scanned code is an opaque token or ticket barcode, never personal data.
const CheckinPanel = memo(() => {
    const { t } = useTranslation();
    const events = useResource(listEvents);
    const [result, setResult] = useState<CheckinResult>();
    const action = useAction();
    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const form = event.currentTarget;
        const values = new FormData(form);
        setResult(undefined);
        void action.run(async () => { setResult(await checkIn(String(values.get('code')), String(values.get('eventId')))); form.reset(); });
    };
    return <form className={cls.panel} onSubmit={submit}>
        <h2>{t('Check-in')}</h2>
        <div className={cls.grid}>
            <Field label="Event"><select name="eventId"><option value="">{t('Any event')}</option>{events.data?.data.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
            <Field label="Ticket code"><input name="code" autoComplete="off" autoFocus required /></Field>
        </div>
        <Button type="submit" disabled={action.busy}>{t('Check in')}</Button>
        <CheckinOutcome result={result} error={action.error} />
    </form>;
});

export const OperationsPage = memo(() => <CrmLayout title="Operations"><CheckinPanel /><TasksPanel /><HealthPanel /></CrmLayout>);
