import { StateSchema } from '@/shared/lib/store/StateSchema';

export const getLoginPassword = (state: StateSchema) => state?.loginForm?.password || '';
