export interface MollieProfile {
    resource: 'profile';
    id: string;
    mode: 'live' | 'test';
    name: string;
    email?: string;
    phone?: string;
    website?: string;
    businessCategory?: string;
    createdAt: string;
}

export interface MolliePayment {
    resource: 'payment';
    id: string;
    mode: 'live' | 'test';
    amount: {
        currency: string;
        value: string;
    };
    description: string;
    method: string;
    status: 'open' | 'paid' | 'failed' | 'canceled' | 'expired' | 'pending';
    customerId?: string;
    mandateId?: string;
    sequenceType?: 'first' | 'recurring' | 'oneoff';
    redirectUrl?: string;
    webhookUrl?: string;
    createdAt: string;
    paidAt?: string;
    _links: {
        checkout?: { href: string; type: string };
        self: { href: string; type: string };
    };
}

export interface MollieCustomer {
    resource: 'customer';
    id: string;
    name: string;
    email: string;
    locale?: string;
    metadata?: Record<string, unknown>;
    recentlyUsedMethods?: string[];
    createdAt: string;
}

// export interface MollieMandate {
//     resource: 'mandate';
//     id: string;
//     mode: 'live' | 'test';
//     method: 'directdebit';
//     status: 'valid' | 'pending' | 'invalid';
//     signatureDate: string;
//     mandateReference: string;
//     createdAt: string;
//     details: {
//         consumerName: string;
//         consumerAccount: string;
//         consumerBic?: string;
//     };
// }

export interface MollieProduct {
    resource: 'product';
    id: string;
    name: string;
    type: string;
    description: string;
    amount: {
        currency: string;
        value: string;
    };
    createdAt: string;
}

export interface MandateFormData {
    customerId: string;
    consumerName: string;
    consumerBic?: string;
    consumerAccount: string;
    mandateReference?: string;
    signatureDate?: string;
    method: string;
}
