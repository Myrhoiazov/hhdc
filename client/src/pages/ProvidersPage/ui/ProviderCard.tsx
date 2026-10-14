import { memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ProviderConnection } from '@/entities/Provider';
import { formatDateTime } from '@/shared/lib/format/date';
import { Panel } from '@/shared/ui/Panel';
import { providerFormFor } from '../model/providerForms';
import { RequestState } from '@/shared/ui/RequestState';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { ProviderForm } from './ProviderForm';
import cls from '@/shared/ui/layout/layout.module.scss';
import { ProviderCardActions } from './ProviderCardActions';
import { useProviderActions } from '../model/useProviderActions';

const formatTime = (value?: string | null) => (value ? formatDateTime(value) : '—');

export const ProviderCard = memo(
    ({ provider, refresh }: { provider: ProviderConnection; refresh: () => void }) => {
        const { t } = useTranslation();
        const [configuring, setConfiguring] = useState(false);
        const actions = useProviderActions(provider, refresh);
        const definition = providerFormFor(provider.provider);
        const saved = useCallback(() => {
            setConfiguring(false);
            refresh();
        }, [refresh]);
        const close = useCallback(() => setConfiguring(false), []);
        return (
            <Panel as="article" aria-label={provider.name}>
                <div className={cls.row}>
                    <strong>{provider.name}</strong>
                    <span className={cls.muted}>
                        {definition ? t(definition.label) : provider.provider}
                    </span>
                    <StatusBadge status={provider.status} />
                </div>
                {provider.settings.companyName && (
                    <p className={cls.muted}>
                        {t('Company: {{company}}', {
                            company: String(provider.settings.companyName),
                        })}
                    </p>
                )}
                <p className={cls.muted}>
                    {t('Last successful sync: {{time}}', {
                        time: formatTime(provider.lastSuccessAt),
                    })}
                </p>
                {provider.lastError && (
                    <p className={cls.error}>
                        {t('Last error: {{error}}', { error: provider.lastError })}
                    </p>
                )}
                <ProviderCardActions
                    provider={provider}
                    actions={actions}
                    onConfigure={definition ? () => setConfiguring(true) : undefined}
                />
                {actions.action.busy && <p role="status">{t('Working…')}</p>}
                {actions.notice && <p role="status">{actions.notice}</p>}
                <RequestState error={actions.action.error} loading={false} />
                {configuring && definition && (
                    <ProviderForm
                        definition={definition}
                        provider={provider}
                        onSaved={saved}
                        onCancel={close}
                    />
                )}
            </Panel>
        );
    }
);
