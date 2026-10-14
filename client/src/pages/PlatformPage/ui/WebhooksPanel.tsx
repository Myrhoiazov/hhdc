import { FormEvent, memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createWebhook, listWebhooks } from '@/entities/Platform';
import { useAction } from '@/shared/lib/useResource/useAction';
import { useResource } from '@/shared/lib/useResource/useResource';
import { Button } from '@/shared/ui/Button';
import { Field } from '@/shared/ui/Field';
import { RequestState } from '@/shared/ui/RequestState';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { Panel } from '@/shared/ui/Panel';
import cls from '@/shared/ui/layout/layout.module.scss';
import { OneTimeSecret } from './OneTimeSecret';
import { WEBHOOK_EVENTS } from '../model/webhookEvents';
import { readWebhook } from '../model/readPlatformForms';

export const WebhooksPanel = memo(() => {
    const { t } = useTranslation();
    const hooks = useResource(listWebhooks);
    const [secret, setSecret] = useState('');
    const action = useAction();
    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const form = event.currentTarget;
        const input = readWebhook(new FormData(form));
        void action.run(async () => {
            setSecret((await createWebhook(input)).secret || '');
            form.reset();
            await hooks.refresh();
        });
    };
    return (
        <Panel>
            <h2>{t('Webhooks')}</h2>
            <RequestState error={hooks.error || action.error} loading={hooks.loading} />
            {hooks.data?.map((item) => (
                <div className={cls.row} key={item.id}>
                    <span>{item.name}</span>
                    <span className={cls.muted}>
                        {item.url} · {item.events.join(', ')}
                    </span>
                    <StatusBadge status={item.status} />
                </div>
            ))}
            {secret && (
                <OneTimeSecret
                    label="Copy this signing secret now. It will not be shown again."
                    value={secret}
                />
            )}
            <form className={cls.grid} onSubmit={submit}>
                <Field label="Name">
                    <input name="name" required />
                </Field>
                <Field label="HTTPS URL">
                    <input name="url" type="url" pattern="https://.*" required />
                </Field>
                <Field label="Events">
                    <select name="events" multiple required>
                        {WEBHOOK_EVENTS.map((item) => (
                            <option key={item} value={item}>
                                {item}
                            </option>
                        ))}
                    </select>
                </Field>
                <Button type="submit" disabled={action.busy}>
                    {t('Create webhook')}
                </Button>
            </form>
        </Panel>
    );
});
