import { FormEvent, memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Automation, AutomationTest, createAutomation, getAutomationMeta, listAutomationRuns, listAutomations, setAutomationStatus, testAutomation } from '@/entities/crm';
import { useAction } from '@/shared/lib/useResource/useAction';
import { useResource } from '@/shared/lib/useResource/useResource';
import { Button } from '@/shared/ui/Button';
import { CrmLayout, Field, RequestState, StatusBadge } from './common';
import cls from './CrmPage.module.scss';

const DEFAULT_CONDITIONS = '{"all": []}';
const DEFAULT_CONFIG = '{"title": "Follow up"}';

const AutomationForm = memo(({ refresh }: { refresh: () => void }) => {
    const { t } = useTranslation();
    const meta = useResource(getAutomationMeta);
    const action = useAction(refresh);
    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        void action.run(() => createAutomation({
            name: String(form.get('name')), triggerType: String(form.get('triggerType')),
            conditions: JSON.parse(String(form.get('conditions'))),
            actions: [{ type: String(form.get('actionType')), config: JSON.parse(String(form.get('config'))) }],
        }));
    };
    return <form className={cls.panel} onSubmit={submit}>
        <h2>{t('Create automation')}</h2>
        <div className={cls.grid}>
            <Field label="Name"><input name="name" required /></Field>
            <Field label="Trigger"><select name="triggerType">{meta.data?.triggers.map(item => <option key={item} value={item}>{t(item)}</option>)}</select></Field>
            <Field label="Action"><select name="actionType" defaultValue="CREATE_TASK">{meta.data?.actions.map(item => <option key={item} value={item}>{t(item)}</option>)}</select></Field>
        </div>
        <Field label="Conditions (JSON)"><textarea name="conditions" rows={3} defaultValue={DEFAULT_CONDITIONS} required /></Field>
        <Field label="Action config (JSON)"><textarea name="config" rows={3} defaultValue={DEFAULT_CONFIG} required /></Field>
        <p className={cls.muted}>{t('New automations start as drafts. Test them before activating.')}</p>
        <RequestState error={action.error || meta.error} loading={false} />
        <Button type="submit" disabled={action.busy}>{t('Save')}</Button>
    </form>;
});

const TestReport = memo(({ report }: { report: AutomationTest }) => {
    const { t } = useTranslation();
    return <div className={cls.result}>
        <p>{t(report.matched ? 'Conditions matched. Nothing was executed.' : 'Conditions did not match the sample.')}</p>
        <p className={cls.muted}>{t('Would execute')}: {report.sideEffects.join(', ')} · {t('Trigger events in the last 30 days')}: {report.recentTriggerEvents}</p>
    </div>;
});

const AutomationRuns = memo(({ id }: { id: string }) => {
    const { t } = useTranslation();
    const load = useCallback(() => listAutomationRuns(id), [id]);
    const runs = useResource(load);
    return <div>
        <RequestState error={runs.error} loading={runs.loading} />
        {runs.data?.total === 0 && <p className={cls.muted}>{t('No runs yet')}</p>}
        {runs.data?.data.map(run => <div className={cls.row} key={run.id}>
            <time>{new Date(run.startedAt).toLocaleString()}</time>
            <span>{run.actionRuns.map(item => `${item.input.type}: ${item.status}`).join(' → ')}</span>
            <span>{run.error}</span>
            <StatusBadge status={run.dryRun ? 'DRY_RUN' : run.status} />
        </div>)}
    </div>;
});

const AutomationRow = memo(({ automation, refresh }: { automation: Automation; refresh: () => void }) => {
    const { t } = useTranslation();
    const action = useAction(refresh);
    const [report, setReport] = useState<AutomationTest>();
    const [showRuns, setShowRuns] = useState(false);
    const active = automation.status === 'ACTIVE';
    const test = () => void action.run(async () => setReport(await testAutomation(automation.id, {})));
    return <div>
        <div className={cls.row}>
            <strong>{automation.name}</strong>
            <span>{t(automation.triggerType)} → {automation.actions.map(item => t(item.type)).join(', ')}</span>
            <StatusBadge status={automation.status} />
            <div className={cls.actions}>
                <Button disabled={action.busy} onClick={test}>{t('Test')}</Button>
                <Button disabled={action.busy} onClick={() => void action.run(() => setAutomationStatus(automation.id, active ? 'pause' : 'activate'))}>{t(active ? 'Pause' : 'Activate')}</Button>
                <Button onClick={() => setShowRuns(!showRuns)}>{t('Runs')}</Button>
            </div>
        </div>
        <RequestState error={action.error} loading={false} />
        {report && <TestReport report={report} />}
        {showRuns && <AutomationRuns id={automation.id} />}
    </div>;
});

export const AutomationsPage = memo(() => {
    const { t } = useTranslation();
    const automations = useResource(listAutomations);
    const refresh = useCallback(() => { void automations.refresh(); }, [automations]);
    return <CrmLayout title="Automations">
        <RequestState error={automations.error} loading={automations.loading} />
        <section className={cls.panel}>
            {automations.data?.total === 0 && <p>{t('No automations yet')}</p>}
            {automations.data?.data.map(item => <AutomationRow key={item.id} automation={item} refresh={refresh} />)}
        </section>
        <AutomationForm refresh={refresh} />
    </CrmLayout>;
});
