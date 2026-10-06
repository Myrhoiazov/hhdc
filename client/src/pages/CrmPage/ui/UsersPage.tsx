import { FormEvent, memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createUser, listUsers, updateUser } from '@/entities/crm';
import { useResource } from '@/shared/lib/useResource/useResource';
import { Button } from '@/shared/ui/Button';
import { CrmLayout, Field, RequestState } from './common';
import cls from './CrmPage.module.scss';

const UserForm = memo(({ refresh }: {refresh: () => void}) => {
    const { t } = useTranslation();
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault(); const form = event.currentTarget; const input = new FormData(form); setBusy(true);
        try { await createUser({name: String(input.get('name')), email: String(input.get('email')), password: String(input.get('password')), roles: [String(input.get('role'))]}); form.reset(); refresh(); }
        catch (cause) { setError(cause instanceof Error ? cause.message : t('Request failed')); }
        finally { setBusy(false); }
    };
    return <form className={cls.panel} onSubmit={submit}><h2>{t('Create user')}</h2><div className={cls.grid}><Field label="Name"><input name="name" required /></Field><Field label="Email"><input name="email" type="email" required /></Field><Field label="Password"><input name="password" type="password" minLength={12} autoComplete="new-password" required /></Field><Field label="Role"><select name="role">{['OWNER', 'ADMIN', 'EVENT_MANAGER', 'SUPPORT', 'VIEWER'].map(role => <option key={role} value={role}>{t(role)}</option>)}</select></Field></div><RequestState error={error} loading={false} /><Button type="submit" disabled={busy}>{t('Save')}</Button></form>;
});

export const UsersPage = memo(() => {
    const { t } = useTranslation();
    const users = useResource(listUsers);
    const [error, setError] = useState('');
    const toggle = async (id: string, isActive: boolean) => {
        try { await updateUser(id, {isActive}); await users.refresh(); }
        catch (cause) { setError(cause instanceof Error ? cause.message : t('Request failed')); }
    };
    return <CrmLayout title="Users & Roles"><RequestState error={error || users.error} loading={users.loading} /><section className={cls.panel}>{users.data?.data.map(user => <div className={cls.row} key={user.id}><span>{user.name}</span><span>{user.email}</span><Button onClick={() => void toggle(user.id, !user.isActive)}>{t(user.isActive ? 'Disable' : 'Enable')}</Button></div>)}</section><UserForm refresh={() => void users.refresh()} /></CrmLayout>;
});
