import { FormEvent, memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createUser } from '@/entities/User';
import { Button } from '@/shared/ui/Button';
import { Field } from '@/shared/ui/Field';
import { RequestState } from '@/shared/ui/RequestState';
import { Panel } from '@/shared/ui/Panel';
import cls from '@/shared/ui/layout/layout.module.scss';
import { readNewUser } from '../model/readNewUser';

export const CreateUserForm = memo(({ refresh }: { refresh: () => void }) => {
    const { t } = useTranslation();
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const form = event.currentTarget;
        setBusy(true);
        try {
            await createUser(readNewUser(new FormData(form)));
            form.reset();
            refresh();
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : t('Request failed'));
        } finally {
            setBusy(false);
        }
    };
    return (
        <Panel as="form" onSubmit={submit}>
            <h2>{t('Create user')}</h2>
            <div className={cls.grid}>
                <Field label="Name">
                    <input name="name" required />
                </Field>
                <Field label="Email">
                    <input name="email" type="email" required />
                </Field>
                <Field label="Password">
                    <input
                        name="password"
                        type="password"
                        minLength={12}
                        autoComplete="new-password"
                        required
                    />
                </Field>
                <Field label="Role">
                    <select name="role">
                        {['OWNER', 'ADMIN', 'EVENT_MANAGER', 'SUPPORT', 'VIEWER'].map((role) => (
                            <option key={role} value={role}>
                                {t(role)}
                            </option>
                        ))}
                    </select>
                </Field>
            </div>
            <RequestState error={error} loading={false} />
            <Button type="submit" disabled={busy}>
                {t('Save')}
            </Button>
        </Panel>
    );
});
