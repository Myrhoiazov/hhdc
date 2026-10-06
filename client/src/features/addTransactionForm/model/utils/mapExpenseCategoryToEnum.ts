import { TransactionCategory } from "@/entities/TransactionCategory";


export const mapExpenseCategoryToEnum = (
    category?: TransactionCategory
): keyof typeof TransactionCategory => {
    switch (category) {
        case TransactionCategory.HUIS:
            return 'HUIS';
        case TransactionCategory.HEALTH:
            return 'HEALTH';
        case TransactionCategory.AUTO:
            return 'AUTO';
        case TransactionCategory.PRODUCTS:
            return 'PRODUCTS';
        case TransactionCategory.PHARMACY:
            return 'PHARMACY';
        case TransactionCategory.OTHER:
            return 'OTHER';
        default:
            return 'KOMUNALKA';
    }
};
