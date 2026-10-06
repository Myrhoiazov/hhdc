import { PaymentMethod } from "@/entities/PaymentMethod";

export const mapPaymentMethodToEnum = (
    method?: PaymentMethod
): 'cash' | 'card' | 'bank_transfer' => {
    switch (method) {
        case PaymentMethod.CARD:
            return 'card';
        case PaymentMethod.BANK_TRANSFER:
            return 'bank_transfer';
        case PaymentMethod.CASH:
        default:
            return 'cash';
    }
};
