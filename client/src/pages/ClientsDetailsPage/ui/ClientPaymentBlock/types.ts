export interface PaymentCustomer {
    id: number;
    mollieId?: string;
    email?: string;
    payerName?: string;
    givenName?: string;
    familyName?: string;
}

export interface ClientPayment {
    id: number;
    mollieId?: string;
    amountValue: string | number;
    amountCurrency: string;
    description?: string;
    method?: string;
    status: string;
    checkoutUrl?: string;
    isCancelable?: boolean;
    paidAt?: string;
    createdAt: string;
    updatedAt: string;
    customer?: PaymentCustomer | null;
}

export interface ClientSubscription {
    id: number;
    mollieId?: string;
    description?: string;
    amountValue: string | number;
    amountCurrency: string;
    interval?: string;
    status: string;
    startDate?: string;
    nextPaymentDate?: string;
    times?: number;
    createdAt?: string;
    updatedAt?: string;
    mandate?: {
        mollieId?: string;
        status?: string;
    } | null;
    customer?: PaymentCustomer | null;
}

export interface ClientMandate {
    id: number;
    mollieId?: string;
    status: string;
    method: string;
    signatureDate?: string;
    createdAt?: string;
    updatedAt?: string;
    customer?: PaymentCustomer | null;
}

export interface ClientPayerLink {
    id: number;
    payerRelation?: string;
    linkSource?: string;
    isPrimary?: boolean;
    customer?: PaymentCustomer | null;
}

export interface ClientPaymentSummary {
    payers: ClientPayerLink[];
    latestPayments: ClientPayment[];
    paymentLinks: ClientPayment[];
    subscriptions: ClientSubscription[];
    activeSubscriptions: ClientSubscription[];
    mandates: ClientMandate[];
    summary: {
        payerCount: number;
        activeSubscriptionCount: number;
        paymentStatus: 'issue' | 'active' | 'unknown';
        lastPayment?: ClientPayment | null;
        latestIssue?: ClientPayment | null;
    };
}
