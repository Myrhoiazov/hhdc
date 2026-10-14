import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    checkWeeztix,
    deleteProvider,
    ProviderConnection,
    syncProvider,
    testProvider,
    updateProvider,
} from '@/entities/Provider';
import { useAction } from '@/shared/lib/useResource/useAction';
import { providerFormFor } from './providerForms';

// Each card action resolves to the notice shown under the card.
export const useProviderActions = (provider: ProviderConnection, refresh: () => void) => {
    const { t } = useTranslation();
    const [notice, setNotice] = useState('');
    const action = useAction(refresh);
    const run = (work: () => Promise<string>) => {
        setNotice('');
        void action.run(async () => {
            setNotice(await work());
        });
    };
    const isWeeztix = provider.provider === 'WEEZTIX';
    const verifiable = isWeeztix || Boolean(providerFormFor(provider.provider)?.verified);
    // Weeztix is checked with its own call, which refreshes the access first when it is about to expire.
    const check = () => (isWeeztix ? checkWeeztix(provider.id) : testProvider(provider.id));
    return {
        notice,
        action,
        verifiable,
        test: () =>
            run(async () => {
                const result = await check();
                return result.success
                    ? t('Connection works')
                    : t('Connection failed: {{error}}', { error: result.error });
            }),
        sync: () =>
            run(async () =>
                t(
                    'New messages: {{created}}, already known or skipped: {{skipped}}, failed: {{failed}}',
                    { ...(await syncProvider(provider.id)) }
                )
            ),
        disable: () =>
            run(async () => {
                await updateProvider(provider.id, { status: 'DISABLED' });
                return '';
            }),
        // A verifiable provider is re-enabled by passing the connection test, never blindly.
        enable: () =>
            run(async () => {
                if (!verifiable) {
                    await updateProvider(provider.id, { status: 'CONNECTED' });
                    return '';
                }
                const result = await check();
                return result.success
                    ? ''
                    : t('Connection failed: {{error}}', { error: result.error });
            }),
        remove: () => {
            if (window.confirm(t('Delete this provider connection?')))
                run(async () => {
                    await deleteProvider(provider.id);
                    return '';
                });
        },
    };
};

export type ProviderActions = ReturnType<typeof useProviderActions>;
