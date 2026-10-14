import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { connectWeeztix, startWeeztixAuthorization } from '@/entities/Provider';

// Two steps: approve access in Weeztix (opens in a new tab), then bring back the address of the
// page Weeztix returned to. The address carries a one-time code; the CRM exchanges it for access.
export const useWeeztixConnect = (onConnected: () => void) => {
    const { t } = useTranslation();
    const [redirectUri, setRedirectUri] = useState('');
    const [state, setState] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const run = async (work: () => Promise<void>) => {
        setBusy(true);
        setError('');
        setNotice('');
        try {
            await work();
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : t('Request failed'));
        } finally {
            setBusy(false);
        }
    };
    const start = () =>
        run(async () => {
            const authorization = await startWeeztixAuthorization();
            setRedirectUri(authorization.redirectUri);
            setState(authorization.state);
            window.open(authorization.url, '_blank', 'noopener');
        });
    const finish = (address: string) =>
        run(async () => {
            const provider = await connectWeeztix(address, state);
            setRedirectUri('');
            setNotice(
                t('Weeztix connected: {{company}}', {
                    company: String(provider.settings.companyName || provider.name),
                })
            );
            onConnected();
        });
    return { redirectUri, busy, error, notice, start, finish };
};
