import { StateSchema } from '@/app/providers/StoreProvider';

export const getSettingsPageUsers = (state: StateSchema) => state.settingsPage?.users || [];
