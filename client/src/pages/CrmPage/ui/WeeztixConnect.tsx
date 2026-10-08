import { FormEvent, memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { connectWeeztix, startWeeztixAuthorization } from '@/entities/crm';
import { Button } from '@/shared/ui/Button';
import { Field } from './common';
import { WeeztixData } from './WeeztixData';
import cls from './CrmPage.module.scss';

// Two steps: approve access in Weeztix (opens in a new tab), then bring back the address of the
// page Weeztix returned to. The address carries a one-time code; the CRM exchanges it for access.
const useWeeztixConnect = (onConnected: () => void) => {
    const { t } = useTranslation();
    const [redirectUri, setRedirectUri] = useState('');
    const [state, setState] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const run = async (work: () => Promise<void>) => {
        setBusy(true); setError(''); setNotice('');
        try { await work(); }
        catch (cause) { setError(cause instanceof Error ? cause.message : t('Request failed')); }
        finally { setBusy(false); }
    };
    const start = () => run(async () => {
        const authorization = await startWeeztixAuthorization();
        setRedirectUri(authorization.redirectUri);
        setState(authorization.state);
        window.open(authorization.url, '_blank', 'noopener');
    });
    const finish = (address: string) => run(async () => {
        const provider = await connectWeeztix(address, state);
        setRedirectUri('');
        setNotice(t('Weeztix connected: {{company}}', { company: String(provider.settings.companyName || provider.name) }));
        onConnected();
    });
    return { redirectUri, busy, error, notice, start, finish };
};

const FinishStep = memo(({ redirectUri, busy, onFinish }: { redirectUri: string; busy: boolean; onFinish: (address: string) => void }) => {
    const { t } = useTranslation();
    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const address = String(new FormData(event.currentTarget).get('address') ?? '').trim();
        if (address) onFinish(address);
    };
    return <form onSubmit={submit} aria-label={t('Finish connecting Weeztix')}>
        <p className={cls.muted}>{t('After you approve access, Weeztix returns you to {{address}}. Copy the whole address from the address bar of that page (or just the code from it) and paste it here. It works once and for 15 minutes.', { address: redirectUri })}</p>
        <Field label="Address of the page you were returned to, or the code"><input name="address" autoComplete="off" required /></Field>
        <div className={cls.actions}><Button type="submit" disabled={busy}>{t('Finish connecting')}</Button></div>
    </form>;
});

export const WeeztixConnect = memo(({ connectionId, onConnected }: { connectionId?: string; onConnected: () => void }) => {
    const connected = Boolean(connectionId);
    const { t } = useTranslation();
    const flow = useWeeztixConnect(onConnected);
    return <section className={cls.panel} aria-label={t('Weeztix')}>
        <h2>{t('Weeztix')}</h2>
        <p className={cls.muted}>{t('Events, ticket types, orders and buyers are read from Weeztix. You approve access in Weeztix; no password is stored in the CRM.')}</p>
        <div className={cls.actions}>
            <Button disabled={flow.busy} onClick={() => void flow.start()}>{t(connected ? 'Reconnect Weeztix' : 'Connect Weeztix')}</Button>
        </div>
        {flow.redirectUri && <FinishStep redirectUri={flow.redirectUri} busy={flow.busy} onFinish={(address) => void flow.finish(address)} />}
        {flow.notice && <p role="status">{flow.notice}</p>}
        {flow.error && <p role="alert" className={cls.error}>{flow.error}</p>}
        {connectionId && <WeeztixData connectionId={connectionId} />}
    </section>;
});
