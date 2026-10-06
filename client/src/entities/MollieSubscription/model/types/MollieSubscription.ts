export type Payment = {
    currency: string,
    value: string
}

export type Status = 'active' | 'canceled' | 'completed' | 'pending' | 'suspended';

export interface MollieSubscription {
    id?: string,
    customerId?: string,
    mandateId?: string,
    amount?: Payment,
    times?: number,
    interval?: string,
    startDate?: string, //YYYY-MM-DD format
    nextPaymentDate?: string,
    description?: string,
    createdAt?: string,
    updatedAt?: string,
    method?: string,
    status?: Status,
}
