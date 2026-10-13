import { StateSchema } from '@/shared/lib/store/StateSchema';

export const getUserAuthData = (state: StateSchema) => state.user.authData;
