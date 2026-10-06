import { StateSchema } from '@/app/providers/StoreProvider';

export const getClientDetailsData = (state: StateSchema) => state.clientDetails?.data;
export const getClientDetailsIsLoading = (state: StateSchema) => state.clientDetails?.isLoading || false;
export const getClientDetailsError = (state: StateSchema) => state.clientDetails?.error;