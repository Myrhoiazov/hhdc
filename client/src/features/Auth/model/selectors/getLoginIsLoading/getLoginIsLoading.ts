import { StateSchema } from '@/shared/lib/store/StateSchema';

export const getLoginIsLoading = (state: StateSchema) => state?.loginForm?.isLoading || false;
