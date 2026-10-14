import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Automation,
    AutomationTest,
    setAutomationStatus,
    testAutomation,
} from '@/entities/Automation';
import { useAction } from '@/shared/lib/useResource/useAction';
import { Button } from '@/shared/ui/Button';
import { RequestState } from '@/shared/ui/RequestState';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import cls from '@/shared/ui/layout/layout.module.scss';
import { TestReport, AutomationRuns } from './AutomationRuns';

export const AutomationRow = memo(
    ({ automation, refresh }: { automation: Automation; refresh: () => void }) => {
        const { t } = useTranslation();
        const action = useAction(refresh);
        const [report, setReport] = useState<AutomationTest>();
        const [showRuns, setShowRuns] = useState(false);
        const active = automation.status === 'ACTIVE';
        const test = () =>
            void action.run(async () => setReport(await testAutomation(automation.id, {})));
        return (
            <div>
                <div className={cls.row}>
                    <strong>{automation.name}</strong>
                    <span>
                        {t(automation.triggerType)} →{' '}
                        {automation.actions.map((item) => t(item.type)).join(', ')}
                    </span>
                    <StatusBadge status={automation.status} />
                    <div className={cls.actions}>
                        <Button disabled={action.busy} onClick={test}>
                            {t('Test')}
                        </Button>
                        <Button
                            disabled={action.busy}
                            onClick={() =>
                                void action.run(() =>
                                    setAutomationStatus(
                                        automation.id,
                                        active ? 'pause' : 'activate'
                                    )
                                )
                            }
                        >
                            {t(active ? 'Pause' : 'Activate')}
                        </Button>
                        <Button onClick={() => setShowRuns(!showRuns)}>{t('Runs')}</Button>
                    </div>
                </div>
                <RequestState error={action.error} loading={false} />
                {report && <TestReport report={report} />}
                {showRuns && <AutomationRuns id={automation.id} />}
            </div>
        );
    }
);
