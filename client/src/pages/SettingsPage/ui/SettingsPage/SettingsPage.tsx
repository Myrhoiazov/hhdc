import { useTranslation } from 'react-i18next';
import { memo } from 'react';
import { Page } from '@/widgets/Page/Page';
import { VStack } from '@/shared/ui/Stack';
import { Text } from '@/shared/ui/Text/Text';
import { UserFilters } from '@/widgets/UserFilters';
import {
    DynamicModuleLoader,
    ReducersList,
} from '@/shared/lib/components/DynamicModuleLoader/DynamicModuleLoader';
import { settingsPageReducer } from '../../model/slices/settingsPageSlice';
import { useInitialEffect } from '@/shared/lib/hooks/useInitialEffect/useInitialEffect';
import { fetchUsersList } from '../../model/services/fetchUsersList/fetchUsersList';
import { useAppDispatch } from '@/shared/lib/hooks/useAppDispatch/useAppDispatch';
import { useSelector } from 'react-redux';
import { getSettingsPageUsers } from '../../model/selectors/clientsPageSelectors';
import { UsersList } from '@/entities/User';
import { IProfile } from '@/entities/Profile';
import { EditUserDropdown } from '@/features/editUserDropdown';

interface SettingsPageProps {
    className?: string;
}

const reducers: ReducersList = {
    settingsPage: settingsPageReducer,
};

const SettingsPage = memo((props: SettingsPageProps) => {
    const { className } = props;
    const users = useSelector(getSettingsPageUsers);
    const { t } = useTranslation();
    const dispatch = useAppDispatch();

    useInitialEffect(() => {
        dispatch(fetchUsersList());
    });

    return (
        <DynamicModuleLoader reducers={reducers}>
            <Page className={className}>
                <VStack gap="16">
                    <Text title={t('Настройки пользователя')} />
                    <UserFilters reloadPage={() => dispatch(fetchUsersList())} />
                    <UsersList
                        users={users}
                        renderAction={(user: IProfile) => (
                            <EditUserDropdown
                                userId={user.id ?? ''}
                                isEnabled={user.isEnabled !== false}
                                reloadPage={() => dispatch(fetchUsersList())}
                            />
                        )}
                    />
                </VStack>
            </Page>
        </DynamicModuleLoader>
    );
});

export default SettingsPage;
