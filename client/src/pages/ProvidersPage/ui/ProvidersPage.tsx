import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { listProviders } from '@/entities/Provider';
import { useResource } from '@/shared/lib/useResource/useResource';
import { CrmLayout } from '@/widgets/Page';
import { RequestState } from '@/shared/ui/RequestState';
import { WeeztixConnect } from './WeeztixConnect';
import cls from '@/shared/ui/layout/layout.module.scss';
import { ProviderGroup } from './ProviderGroup';
import { ConnectPanel } from './ConnectPanel';
import { GROUPS } from '../model/groups';

export const ProvidersPage = memo(() => {
    const { t } = useTranslation();
    const providers = useResource(listProviders);
    const refresh = useCallback(() => {
        void providers.refresh();
    }, [providers]);
    const items = providers.data?.data ?? [];
    return (
        <CrmLayout title="Providers">
            <RequestState error={providers.error} loading={providers.loading && !providers.data} />
            {GROUPS.map((type) => (
                <ProviderGroup
                    key={type}
                    type={type}
                    providers={items.filter((item) => item.type === type)}
                    refresh={refresh}
                />
            ))}
            {providers.data?.total === 0 && (
                <p className={cls.muted}>{t('No providers connected')}</p>
            )}
            <WeeztixConnect
                connectionId={items.find((item) => item.provider === 'WEEZTIX')?.id}
                onConnected={refresh}
            />
            <ConnectPanel onSaved={refresh} />
        </CrmLayout>
    );
});
