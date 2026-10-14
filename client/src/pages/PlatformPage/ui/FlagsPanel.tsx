import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { FeatureFlag, listFeatureFlags, setFeatureFlag } from '@/entities/Platform';
import { useAction } from '@/shared/lib/useResource/useAction';
import { useResource } from '@/shared/lib/useResource/useResource';
import { Button } from '@/shared/ui/Button';
import { RequestState } from '@/shared/ui/RequestState';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { Panel } from '@/shared/ui/Panel';
import cls from '@/shared/ui/layout/layout.module.scss';

const FlagRow = memo(({ flag, refresh }: { flag: FeatureFlag; refresh: () => void }) => {
    const { t } = useTranslation();
    const action = useAction(refresh);
    return (
        <div className={cls.row}>
            <span>{t(flag.key)}</span>
            <StatusBadge status={flag.enabled ? 'ACTIVE' : 'DISABLED'} />
            <Button
                disabled={action.busy}
                onClick={() => void action.run(() => setFeatureFlag(flag.key, !flag.enabled))}
            >
                {t(flag.enabled ? 'Disable' : 'Enable')}
            </Button>
            <RequestState error={action.error} loading={false} />
        </div>
    );
});

export const FlagsPanel = memo(() => {
    const { t } = useTranslation();
    const flags = useResource(listFeatureFlags);
    const refresh = useCallback(() => {
        void flags.refresh();
    }, [flags]);
    return (
        <Panel>
            <h2>{t('Feature flags')}</h2>
            <p className={cls.muted}>
                {t('Flags switch risky modules on or off. They do not grant permissions.')}
            </p>
            <RequestState error={flags.error} loading={flags.loading} />
            {flags.data?.map((item) => (
                <FlagRow key={item.key} flag={item} refresh={refresh} />
            ))}
        </Panel>
    );
});
