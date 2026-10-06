import { StateSchema } from '@/app/providers/StoreProvider';
import { ClientSortField, ClientView } from '@/entities/Client';

export const getClientsPageIsLoading = (state: StateSchema) => state.clientsPage?.isLoading || false;
export const getClientsPageError = (state: StateSchema) => state.clientsPage?.error;
export const getClientsPageNum = (state: StateSchema) => state.clientsPage?.page || 1;
export const getClientsPageLimit = (state: StateSchema) => state.clientsPage?.limit || 9;
export const getClientsPageHasMore = (state: StateSchema) => state.clientsPage?.hasMore;
export const getClientsPageInited = (state: StateSchema) => state.clientsPage?._inited
export const getClientsPageView = (state: StateSchema) => state.clientsPage?.view || ClientView.BIG;
export const getClientsPageSearch = (state: StateSchema) =>
    state.clientsPage?.search ?? '';
export const getClientsPageSort = (state: StateSchema) =>
    state.clientsPage?.sort ?? ClientSortField.CREATED;
export const getClientsPageOrder = (state: StateSchema) =>
    state.clientsPage?.order ?? 'asc';
export const getClientsPageBranchId = (state: StateSchema) =>
    state.clientsPage?.branchId || 'all';
export const getClientsPagePaymentStatus = (state: StateSchema) =>
    state.clientsPage?.paymentStatus || 'all';
