import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { listCampaigns } from '@/entities/Campaign';
import { useResource } from '@/shared/lib/useResource/useResource';
import { CrmLayout } from '@/widgets/Page';
import { RequestState } from '@/shared/ui/RequestState';
import { Panel } from '@/shared/ui/Panel';
import cls from '@/shared/ui/layout/layout.module.scss';
import { CampaignRow } from './CampaignRow';

export const CampaignsPage = memo(() => {
    const { t } = useTranslation();
    const campaigns = useResource(listCampaigns);
    const refresh = useCallback(() => {
        void campaigns.refresh();
    }, [campaigns]);
    return (
        <CrmLayout title="Campaigns">
            <RequestState error={campaigns.error} loading={campaigns.loading} />
            <Panel>
                <p className={cls.muted}>
                    {t('Only people with an active marketing-email consent receive campaigns.')}
                </p>
                {campaigns.data?.total === 0 && <p>{t('No campaigns yet')}</p>}
                {campaigns.data?.data.map((item) => (
                    <CampaignRow key={item.id} campaign={item} refresh={refresh} />
                ))}
            </Panel>
        </CrmLayout>
    );
});
