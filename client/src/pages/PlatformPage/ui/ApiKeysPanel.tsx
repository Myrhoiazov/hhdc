import { FormEvent, memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ApiKey, createApiKey, listApiKeys, revokeApiKey } from '@/entities/Platform';
import { useAction } from '@/shared/lib/useResource/useAction';
import { useResource } from '@/shared/lib/useResource/useResource';
import { Button } from '@/shared/ui/Button';
import { Field } from '@/shared/ui/Field';
import { RequestState } from '@/shared/ui/RequestState';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { Panel } from '@/shared/ui/Panel';
import cls from '@/shared/ui/layout/layout.module.scss';
import { OneTimeSecret } from './OneTimeSecret';
import { readApiKey } from '../model/readPlatformForms';

const ApiKeyRow = memo(({ apiKey, refresh }: { apiKey: ApiKey; refresh: () => void }) => {
    const { t } = useTranslation();
    const action = useAction(refresh);
    const revoke = () => {
        if (window.confirm(t('Revoke this API key?')))
            void action.run(() => revokeApiKey(apiKey.id));
    };
    return (
        <div className={cls.row}>
            <span>{apiKey.name}</span>
            <span
                className={cls.muted}
            >{`hhdc_${apiKey.prefix}_… · ${apiKey.permissions.join(', ')}`}</span>
            <StatusBadge status={apiKey.status} />
            {apiKey.status === 'ACTIVE' && (
                <Button disabled={action.busy} onClick={revoke}>
                    {t('Revoke')}
                </Button>
            )}
        </div>
    );
});

export const ApiKeysPanel = memo(() => {
    const { t } = useTranslation();
    const keys = useResource(listApiKeys);
    const [created, setCreated] = useState('');
    const action = useAction();
    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const form = event.currentTarget;
        const { name, permissions } = readApiKey(new FormData(form));
        void action.run(async () => {
            setCreated((await createApiKey(name, permissions)).key || '');
            form.reset();
            await keys.refresh();
        });
    };
    const refresh = useCallback(() => {
        void keys.refresh();
    }, [keys]);
    return (
        <Panel>
            <h2>{t('API keys')}</h2>
            <RequestState error={keys.error || action.error} loading={keys.loading} />
            {keys.data?.map((item) => (
                <ApiKeyRow key={item.id} apiKey={item} refresh={refresh} />
            ))}
            {created && (
                <OneTimeSecret
                    label="Copy this key now. It will not be shown again."
                    value={created}
                />
            )}
            <form className={cls.grid} onSubmit={submit}>
                <Field label="Name">
                    <input name="name" required />
                </Field>
                <Field label="Permissions (comma separated)">
                    <input name="permissions" placeholder="events.read, people.read" required />
                </Field>
                <Button type="submit" disabled={action.busy}>
                    {t('Create API key')}
                </Button>
            </form>
        </Panel>
    );
});
