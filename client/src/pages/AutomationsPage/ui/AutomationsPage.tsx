import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { listAutomations } from '@/entities/Automation';
import { useResource } from '@/shared/lib/useResource/useResource';
import { CrmLayout } from '@/widgets/Page';
import { RequestState } from '@/shared/ui/RequestState';
import { Panel } from '@/shared/ui/Panel';
import { AutomationForm } from './AutomationForm';
import { AutomationRow } from './AutomationRow';

export const AutomationsPage = memo(() => {
    const { t } = useTranslation();
    const automations = useResource(listAutomations);
    const refresh = useCallback(() => {
        void automations.refresh();
    }, [automations]);
    return (
        <CrmLayout title="Automations">
            <RequestState error={automations.error} loading={automations.loading} />
            <Panel>
                {automations.data?.total === 0 && <p>{t('No automations yet')}</p>}
                {automations.data?.data.map((item) => (
                    <AutomationRow key={item.id} automation={item} refresh={refresh} />
                ))}
            </Panel>
            <AutomationForm refresh={refresh} />
        </CrmLayout>
    );
});
