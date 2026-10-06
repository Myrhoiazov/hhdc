import { FormEvent, memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ApiKey, createApiKey, createWebhook, FeatureFlag, listApiKeys, listFeatureFlags, listWebhooks, revokeApiKey, setFeatureFlag } from '@/entities/crm';
import { useAction } from '@/shared/lib/useResource/useAction';
import { useResource } from '@/shared/lib/useResource/useResource';
import { Button } from '@/shared/ui/Button';
import { CrmLayout, Field, RequestState, StatusBadge } from './common';
import cls from './CrmPage.module.scss';

const WEBHOOK_EVENTS = ['person.created', 'registration.created', 'ticket.created', 'checkin.completed', 'payment.paid', 'event.updated'];

const OneTimeSecret = memo(({ label, value }: { label: string; value: string }) => {
    const { t } = useTranslation();
    return <div role="status"><p>{t(label)}</p><p className={cls.secret}>{value}</p></div>;
});

const FlagRow = memo(({ flag, refresh }: { flag: FeatureFlag; refresh: () => void }) => {
    const { t } = useTranslation();
    const action = useAction(refresh);
    return <div className={cls.row}>
        <span>{t(flag.key)}</span>
        <StatusBadge status={flag.enabled ? 'ACTIVE' : 'DISABLED'} />
        <Button disabled={action.busy} onClick={() => void action.run(() => setFeatureFlag(flag.key, !flag.enabled))}>{t(flag.enabled ? 'Disable' : 'Enable')}</Button>
        <RequestState error={action.error} loading={false} />
    </div>;
});

const FlagsPanel = memo(() => {
    const { t } = useTranslation();
    const flags = useResource(listFeatureFlags);
    const refresh = useCallback(() => { void flags.refresh(); }, [flags]);
    return <section className={cls.panel}>
        <h2>{t('Feature flags')}</h2>
        <p className={cls.muted}>{t('Flags switch risky modules on or off. They do not grant permissions.')}</p>
        <RequestState error={flags.error} loading={flags.loading} />
        {flags.data?.map(item => <FlagRow key={item.key} flag={item} refresh={refresh} />)}
    </section>;
});

const ApiKeyRow = memo(({ apiKey, refresh }: { apiKey: ApiKey; refresh: () => void }) => {
    const { t } = useTranslation();
    const action = useAction(refresh);
    const revoke = () => { if (window.confirm(t('Revoke this API key?'))) void action.run(() => revokeApiKey(apiKey.id)); };
    return <div className={cls.row}>
        <span>{apiKey.name}</span>
        <span className={cls.muted}>{`hhdc_${apiKey.prefix}_… · ${apiKey.permissions.join(', ')}`}</span>
        <StatusBadge status={apiKey.status} />
        {apiKey.status === 'ACTIVE' && <Button disabled={action.busy} onClick={revoke}>{t('Revoke')}</Button>}
    </div>;
});

const ApiKeysPanel = memo(() => {
    const { t } = useTranslation();
    const keys = useResource(listApiKeys);
    const [created, setCreated] = useState('');
    const action = useAction();
    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const form = event.currentTarget;
        const values = new FormData(form);
        const permissions = String(values.get('permissions')).split(',').map(item => item.trim()).filter(Boolean);
        void action.run(async () => { setCreated((await createApiKey(String(values.get('name')), permissions)).key || ''); form.reset(); await keys.refresh(); });
    };
    const refresh = useCallback(() => { void keys.refresh(); }, [keys]);
    return <section className={cls.panel}>
        <h2>{t('API keys')}</h2>
        <RequestState error={keys.error || action.error} loading={keys.loading} />
        {keys.data?.map(item => <ApiKeyRow key={item.id} apiKey={item} refresh={refresh} />)}
        {created && <OneTimeSecret label="Copy this key now. It will not be shown again." value={created} />}
        <form className={cls.grid} onSubmit={submit}>
            <Field label="Name"><input name="name" required /></Field>
            <Field label="Permissions (comma separated)"><input name="permissions" placeholder="events.read, people.read" required /></Field>
            <Button type="submit" disabled={action.busy}>{t('Create API key')}</Button>
        </form>
    </section>;
});

const WebhooksPanel = memo(() => {
    const { t } = useTranslation();
    const hooks = useResource(listWebhooks);
    const [secret, setSecret] = useState('');
    const action = useAction();
    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const form = event.currentTarget;
        const values = new FormData(form);
        const input = { name: String(values.get('name')), url: String(values.get('url')), events: values.getAll('events').map(String) };
        void action.run(async () => { setSecret((await createWebhook(input)).secret || ''); form.reset(); await hooks.refresh(); });
    };
    return <section className={cls.panel}>
        <h2>{t('Webhooks')}</h2>
        <RequestState error={hooks.error || action.error} loading={hooks.loading} />
        {hooks.data?.map(item => <div className={cls.row} key={item.id}><span>{item.name}</span><span className={cls.muted}>{item.url} · {item.events.join(', ')}</span><StatusBadge status={item.status} /></div>)}
        {secret && <OneTimeSecret label="Copy this signing secret now. It will not be shown again." value={secret} />}
        <form className={cls.grid} onSubmit={submit}>
            <Field label="Name"><input name="name" required /></Field>
            <Field label="HTTPS URL"><input name="url" type="url" pattern="https://.*" required /></Field>
            <Field label="Events"><select name="events" multiple required>{WEBHOOK_EVENTS.map(item => <option key={item} value={item}>{item}</option>)}</select></Field>
            <Button type="submit" disabled={action.busy}>{t('Create webhook')}</Button>
        </form>
    </section>;
});

export const PlatformPage = memo(() => <CrmLayout title="Platform settings"><FlagsPanel /><ApiKeysPanel /><WebhooksPanel /></CrmLayout>);
