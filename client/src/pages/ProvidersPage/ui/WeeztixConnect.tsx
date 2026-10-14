import { FormEvent, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/Button';
import { Field } from '@/shared/ui/Field';
import { Panel } from '@/shared/ui/Panel';
import { WeeztixData } from './WeeztixData';
import cls from '@/shared/ui/layout/layout.module.scss';
import own from './WeeztixConnect.module.scss';
import { useWeeztixConnect } from '../model/useWeeztixConnect';

const FinishStep = memo(
    ({
        redirectUri,
        busy,
        onFinish,
    }: {
        redirectUri: string;
        busy: boolean;
        onFinish: (address: string) => void;
    }) => {
        const { t } = useTranslation();
        const submit = (event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            const address = String(new FormData(event.currentTarget).get('address') ?? '').trim();
            if (address) onFinish(address);
        };
        return (
            <form
                className={own.finish}
                onSubmit={submit}
                aria-label={t('Finish connecting Weeztix')}
            >
                <p className={cls.muted}>
                    {t(
                        'After you approve access, Weeztix returns you to {{address}}. Copy the whole address from the address bar of that page (or just the code from it) and paste it here. It works once and for 15 minutes.',
                        { address: redirectUri }
                    )}
                </p>
                <Field label="Address of the page you were returned to, or the code">
                    <input name="address" autoComplete="off" required />
                </Field>
                <div className={cls.actions}>
                    <Button type="submit" disabled={busy}>
                        {t('Finish connecting')}
                    </Button>
                </div>
            </form>
        );
    }
);

export const WeeztixConnect = memo(
    ({ connectionId, onConnected }: { connectionId?: string; onConnected: () => void }) => {
        const connected = Boolean(connectionId);
        const { t } = useTranslation();
        const flow = useWeeztixConnect(onConnected);
        return (
            <Panel aria-label={t('Weeztix')}>
                <div className={own.header}>
                    <div className={own.intro}>
                        <h2>{t('Weeztix')}</h2>
                        <p className={cls.muted}>
                            {t(
                                'Events, ticket types, orders and buyers are read from Weeztix. You approve access in Weeztix; no password is stored in the CRM.'
                            )}
                        </p>
                    </div>
                    <Button disabled={flow.busy} onClick={() => void flow.start()}>
                        {t(connected ? 'Reconnect Weeztix' : 'Connect Weeztix')}
                    </Button>
                </div>
                {flow.redirectUri && (
                    <FinishStep
                        redirectUri={flow.redirectUri}
                        busy={flow.busy}
                        onFinish={(address) => void flow.finish(address)}
                    />
                )}
                {flow.notice && <p role="status">{flow.notice}</p>}
                {flow.error && (
                    <p role="alert" className={cls.error}>
                        {flow.error}
                    </p>
                )}
                {connectionId && <WeeztixData connectionId={connectionId} />}
            </Panel>
        );
    }
);
