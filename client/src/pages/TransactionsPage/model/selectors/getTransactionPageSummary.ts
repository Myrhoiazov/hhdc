import { StateSchema } from "@/app/providers/StoreProvider";

export const getTransactionPageSummaryData = (state: StateSchema) => state.transactionPage?.summary || undefined;
