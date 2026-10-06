import { StateSchema } from "@/app/providers/StoreProvider";

export const getTransactionFormData = (state: StateSchema) => state.addTransactionForm?.data;