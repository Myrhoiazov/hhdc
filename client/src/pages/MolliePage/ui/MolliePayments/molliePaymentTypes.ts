export type PaymentStatusFilter = 'all' | 'paid' | 'failed' | 'canceled' | 'expired' | 'pending' | 'open';
export type PaymentMethodFilter = 'all' | 'directdebit' | 'creditcard' | 'ideal' | 'banktransfer' | 'paypal' | 'unknown';

export interface MolliePaymentCustomer {
    id: number;
    mollieId?: string;
    email?: string;
    givenName?: string;
    familyName?: string;
    payerName?: string;
    payerRelation?: string;
    linkSource?: string;
    client?: {
        id: number;
        firstName?: string;
        lastName?: string;
        email?: string;
        phoneNumber?: string;
    } | null;
    clientLinks?: {
        id: number;
        payerRelation?: string;
        linkSource?: string;
        isPrimary?: boolean;
        client?: {
            id: number;
            firstName?: string;
            lastName?: string;
            email?: string;
            phoneNumber?: string;
        };
    }[];
}

export interface MolliePaymentSubscription {
    id: number;
    mollieId?: string;
    status?: string;
    description?: string;
}

export interface MolliePayment {
    id: number;
    mollieId?: string;
    amountValue: string | number;
    amountCurrency: string;
    description?: string;
    method?: string;
    status: string;
    paidAt?: string;
    createdAt: string;
    updatedAt: string;
    customer?: MolliePaymentCustomer;
    subscription?: MolliePaymentSubscription;
}

export interface MolliePaymentsResponse {
    items: MolliePayment[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface PaymentFilters {
    _q: string;
    status: PaymentStatusFilter;
    method: PaymentMethodFilter;
    issueOnly: boolean;
    dateFrom: string;
    dateTo: string;
}

export const PAGE_SIZE = 25;

export const defaultFilters: PaymentFilters = {
    _q: '',
    status: 'all',
    method: 'all',
    issueOnly: false,
    dateFrom: '',
    dateTo: '',
};

export const issueStatuses = ['failed', 'canceled', 'expired', 'charged_back', 'chargeback'];

export const buildPaymentParams = (filters: PaymentFilters, page: number) => ({
    _page: page,
    _limit: PAGE_SIZE,
    _q: filters._q.trim() || undefined,
    status: filters.status === 'all' ? undefined : filters.status,
    method: filters.method === 'all' ? undefined : filters.method,
    issueOnly: filters.issueOnly || undefined,
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
});

export const downloadBlob = (data: Blob, filename: string) => {
    const url = URL.createObjectURL(data);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
};
