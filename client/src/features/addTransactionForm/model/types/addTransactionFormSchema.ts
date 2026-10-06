import { Transaction } from "@/entities/Transaction";

export interface AddTransactionFormSchema {
    readonly: boolean,
    isLoading: boolean,
    error: undefined,
    data?: Transaction,
}