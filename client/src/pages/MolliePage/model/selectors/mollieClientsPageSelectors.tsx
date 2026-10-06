import { StateSchema } from '@/app/providers/StoreProvider';

export const getMollieClientsPageIsLoading = (state: StateSchema) =>
    state.mollieClientsPage?.isLoading || state.customerDetailsMandates?.isLoading || false;
export const getMollieClientsPageError = (state: StateSchema) =>
    state.mollieClientsPage?.error || state.customerDetailsMandates?.error;
export const getMollieClientsPagePage = (state: StateSchema) =>
    state.mollieClientsPage?.page || 1;
export const getMollieClientsPageLimit = (state: StateSchema) =>
    state.mollieClientsPage?.limit || 15;
export const getMollieClientsPageTotal = (state: StateSchema) =>
    state.mollieClientsPage?.total || 0;
export const getMollieClientsPageTotalPages = (state: StateSchema) =>
    state.mollieClientsPage?.totalPages || 1;
export const getMollieClientsPageMandates = (state: StateSchema) =>
    state.customerDetailsMandates?.mandates || [];
export const getMollieClientsPageSubscriptions = (state: StateSchema) =>
    state.customerDetailsMandates?.subscriptions || [];
