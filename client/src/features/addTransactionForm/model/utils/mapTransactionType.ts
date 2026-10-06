import { TransactionType } from "@/entities/TransactionType";

export const mapTransactionTypeToEnum = (type?: TransactionType): 'INCOME' | 'EXPENSE' => {

    switch (type) {
        case TransactionType.INCOME:
            return 'INCOME';
        case TransactionType.EXPENSE:
            return 'EXPENSE';
        default:
            return 'INCOME';
    }
};