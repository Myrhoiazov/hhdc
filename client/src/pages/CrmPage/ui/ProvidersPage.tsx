import { memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { deleteProvider, listProviders, ProviderConnection, syncProvider, testProvider, updateProvider } from '@/entities/crm';
import { useAction } from '@/shared/lib/useResource/useAction';
import { useResource } from '@/shared/lib/useResource/useResource';
import { Button } from '@/shared/ui/Button';
import { PROVIDER_FORMS, providerFormFor } from '../model/providerForms';
import { CrmLayout, Field, RequestState, StatusBadge } from './common';
import { ProviderForm } from './ProviderForm';
import cls from './CrmPage.module.scss';

const GROUPS = ['EMAIL', 'AI', 'TICKETING', 'PAYMENT', 'STORAGE', 'MESSAGING', 'SIGNATURE'];
const GROUP_TITLES: Record<string, string> = {
    EMAIL: 'Email', AI: 'AI', TICKETING: 'Ticketing', PAYMENT: 'Payments', STORAGE: 'Storage', MESSAGING: 'Messaging', SIGNATURE: 'Signature',
};

const formatTime = (value?: string | null) => (value ? new Date(value).toLocaleString() : '—');

// Each card action resolves to the notice shown under the card.
const useProviderActions = (provider: ProviderConnection, refresh: () => void) => {
    const { t } = useTranslation();
    const [notice, setNotice] = useState('');
    const action = useAction(refresh);
    const run = (work: () => Promise<string>) => { setNotice(''); void action.run(async () => { setNotice(await work()); }); };
    const verifiable = Boolean(providerFormFor(provider.provider)?.verified);
    return {
        notice,
        action,
        verifiable,
        test: () => run(async () => {
            const result = await testProvider(provider.id);
            return result.success ? t('Connection works') : t('Connection failed: {{error}}', { error: result.error });
        }),
        sync: () => run(async () => t('New messages: {{created}}, already known or skipped: {{skipped}}, failed: {{failed}}', { ...(await syncProvider(provider.id)) })),
        disable: () => run(async () => { await updateProvider(provider.id, { status: 'DISABLED' }); return ''; }),
        // A verifiable provider is re-enabled by passing the connection test, never blindly.
        enable: () => run(async () => {
            if (!verifiable) { await updateProvider(provider.id, { status: 'CONNECTED' }); return ''; }
            const result = await testProvider(provider.id);
            return result.success ? '' : t('Connection failed: {{error}}', { error: result.error });
        }),
        remove: () => { if (window.confirm(t('Delete this provider connection?'))) run(async () => { await deleteProvider(provider.id); return ''; }); },
    };
};

type ProviderActions = ReturnType<typeof useProviderActions>;

const ProviderCardActions = memo(({ provider, actions, onConfigure }: { provider: ProviderConnection; actions: ProviderActions; onConfigure?: () => void }) => {
    const { t } = useTranslation();
    const { busy } = actions.action;
    const disabled = provider.status === 'DISABLED';
    return <div className={cls.actions}>
        {actions.verifiable && !disabled && <Button disabled={busy} onClick={actions.test}>{t('Test connection')}</Button>}
        {provider.type === 'EMAIL' && !disabled && <Button disabled={busy} onClick={actions.sync}>{t('Sync now')}</Button>}
        {onConfigure && <Button disabled={busy} onClick={onConfigure}>{t('Configure')}</Button>}
        <Button disabled={busy} onClick={disabled ? actions.enable : actions.disable}>{t(disabled ? 'Enable' : 'Disable')}</Button>
        <Button disabled={busy} onClick={actions.remove}>{t('Delete')}</Button>
    </div>;
});

const ProviderCard = memo(({ provider, refresh }: { provider: ProviderConnection; refresh: () => void }) => {
    const { t } = useTranslation();
    const [configuring, setConfiguring] = useState(false);
    const actions = useProviderActions(provider, refresh);
    const definition = providerFormFor(provider.provider);
    const saved = useCallback(() => { setConfiguring(false); refresh(); }, [refresh]);
    const close = useCallback(() => setConfiguring(false), []);
    return <article className={cls.panel} aria-label={provider.name}>
        <div className={cls.row}>
            <strong>{provider.name}</strong>
            <span className={cls.muted}>{definition ? t(definition.label) : provider.provider}</span>
            <StatusBadge status={provider.status} />
        </div>
        <p className={cls.muted}>{t('Last successful sync: {{time}}', { time: formatTime(provider.lastSuccessAt) })}</p>
        {provider.lastError && <p className={cls.error}>{t('Last error: {{error}}', { error: provider.lastError })}</p>}
        <ProviderCardActions provider={provider} actions={actions} onConfigure={definition ? () => setConfiguring(true) : undefined} />
        {actions.action.busy && <p role="status">{t('Working…')}</p>}
        {actions.notice && <p role="status">{actions.notice}</p>}
        <RequestState error={actions.action.error} loading={false} />
        {configuring && definition && <ProviderForm definition={definition} provider={provider} onSaved={saved} onCancel={close} />}
    </article>;
});

const ProviderGroup = memo(({ type, providers, refresh }: { type: string; providers: ProviderConnection[]; refresh: () => void }) => {
    const { t } = useTranslation();
    if (!providers.length) return null;
    return <section className={cls.CrmPage} aria-label={t(GROUP_TITLES[type] ?? type)}>
        <h2>{t(GROUP_TITLES[type] ?? type)}</h2>
        {providers.map((item) => <ProviderCard key={item.id} provider={item} refresh={refresh} />)}
    </section>;
});

const ConnectPanel = memo(({ onSaved }: { onSaved: () => void }) => {
    const { t } = useTranslation();
    const [selected, setSelected] = useState(PROVIDER_FORMS[0].provider);
    const definition = providerFormFor(selected) ?? PROVIDER_FORMS[0];
    return <section className={cls.panel}>
        <h2>{t('Connect a provider')}</h2>
        <Field label="Provider">
            <select value={selected} onChange={(event) => setSelected(event.target.value)}>
                {PROVIDER_FORMS.map((form) => <option key={form.provider} value={form.provider}>{t(form.label)}</option>)}
            </select>
        </Field>
        <ProviderForm key={definition.provider} definition={definition} onSaved={onSaved} />
    </section>;
});

export const ProvidersPage = memo(() => {
    const { t } = useTranslation();
    const providers = useResource(listProviders);
    const refresh = useCallback(() => { void providers.refresh(); }, [providers]);
    const items = providers.data?.data ?? [];
    return <CrmLayout title="Providers">
        <RequestState error={providers.error} loading={providers.loading && !providers.data} />
        {GROUPS.map((type) => <ProviderGroup key={type} type={type} providers={items.filter((item) => item.type === type)} refresh={refresh} />)}
        {providers.data?.total === 0 && <p className={cls.muted}>{t('No providers connected')}</p>}
        <ConnectPanel onSaved={refresh} />
    </CrmLayout>;
});
