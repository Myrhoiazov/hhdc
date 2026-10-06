import { Summary } from "@/entities/Summary";
import { Transaction } from "./transaction";

export interface TransactionSchema {
    items?: Transaction,
    summary?: Summary,
    isLoading: boolean,
    error?: string
}