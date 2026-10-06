import { StateSchema } from "@/app/providers/StoreProvider";
import { Month } from "@/entities/Month";
import { TransactionSortField } from "@/entities/Transaction";
import { TransactionType } from "@/entities/TransactionType";

export const getTransactionPageIsLoading = (state: StateSchema) => state.transactionPage?.isLoading || false;
export const getTransactionPageData = (state: StateSchema) => state.transactionPage?.items || [];
export const getTransactionPageInited = (state: StateSchema) => state.transactionPage?._inited;
export const getTransactionPageSearch = (state: StateSchema) =>
    state.transactionPage?.search ?? '';
export const getTransactionPageSort = (state: StateSchema) =>
    state.transactionPage?.sort ?? TransactionSortField.DATE;
export const getTransactionPageOrder = (state: StateSchema) =>
    state.transactionPage?.order ?? 'asc';
export const getTransactionPageType = (state: StateSchema) =>
    state.transactionPage?.type || TransactionType.ALL;
export const getTransactionPageError = (state: StateSchema) => state.transactionPage?.error;
export const getTransactionPageMonth = (state: StateSchema) => state.transactionPage?.month || Month.ALL;
export const getTransactionPagePage = (state: StateSchema) => state.transactionPage?.page ?? 1;
export const getTransactionPageLimit = (state: StateSchema) => state.transactionPage?.limit ?? 20;
export const getTransactionPageTotal = (state: StateSchema) => state.transactionPage?.total ?? 0;
export const getTransactionPageTotalPages = (state: StateSchema) => state.transactionPage?.totalPages ?? 1;