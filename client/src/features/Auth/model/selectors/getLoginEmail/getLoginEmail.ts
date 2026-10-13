import { StateSchema } from '@/shared/lib/store/StateSchema';

export const getLoginEmail = (state: StateSchema) => state?.loginForm?.email || '';
