import { StateSchema } from '@/app/providers/StoreProvider';

export const getClientDetailsData = (state: StateSchema) => state.mollieClientDetails?.data;
export const getClientDetailsIsLoading = (state: StateSchema) => state.mollieClientDetails?.isLoading || false;
export const getClientDetailsError = (state: StateSchema) => state.mollieClientDetails?.error;