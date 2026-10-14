import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { listUsers, updateUser } from '@/entities/User';
import { useResource } from '@/shared/lib/useResource/useResource';
import { Button } from '@/shared/ui/Button';
import { CrmLayout } from '@/widgets/Page';
import { RequestState } from '@/shared/ui/RequestState';
import { Panel } from '@/shared/ui/Panel';
import cls from '@/shared/ui/layout/layout.module.scss';
import { CreateUserForm } from './CreateUserForm';

export const UsersPage = memo(() => {
    const { t } = useTranslation();
    const users = useResource(listUsers);
    const [error, setError] = useState('');
    const toggle = async (id: string, isActive: boolean) => {
        try {
            await updateUser(id, { isActive });
            await users.refresh();
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : t('Request failed'));
        }
    };
    return (
        <CrmLayout title="Users & Roles">
            <RequestState error={error || users.error} loading={users.loading} />
            <Panel>
                {users.data?.data.map((user) => (
                    <div className={cls.row} key={user.id}>
                        <span>{user.name}</span>
                        <span>{user.email}</span>
                        <Button onClick={() => void toggle(user.id, !user.isActive)}>
                            {t(user.isActive ? 'Disable' : 'Enable')}
                        </Button>
                    </div>
                ))}
            </Panel>
            <CreateUserForm refresh={() => void users.refresh()} />
        </CrmLayout>
    );
});
