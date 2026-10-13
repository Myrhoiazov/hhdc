import { StateSchema } from '@/shared/lib/store/StateSchema';

export const getLoginError = (state: StateSchema) => state?.loginForm?.error;
