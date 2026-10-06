import { PaymentMethod } from "@/entities/PaymentMethod"
import { TransactionCategory } from "@/entities/TransactionCategory"
import { TransactionType } from "@/entities/TransactionType"


export interface Transaction {
    id?: string
    type?: TransactionType
    amount?: string | number
    category?: TransactionCategory
    description?: string
    date?: string
    paymentMethod?: PaymentMethod;
    currency?: string;
    source?: 'MANUAL' | 'MOLLIE';
    status?: string;
    externalId?: string | null;
    customerName?: string | null;
}
