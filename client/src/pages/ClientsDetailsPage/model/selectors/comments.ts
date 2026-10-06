import { StateSchema } from '@/app/providers/StoreProvider';

export const getClientCommentsIsLoading = (state: StateSchema) => state.clientDetailsComments?.isLoading;
export const getClientCommentsError = (state: StateSchema) => state.clientDetailsComments?.error;
