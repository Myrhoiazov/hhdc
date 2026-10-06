// Provider-neutral payment contract (ADR 0013). Mollie DTOs never leave the adapter.
export type ExternalPaymentStatus = 'PENDING' | 'AUTHORIZED' | 'PAID' | 'FAILED' | 'CANCELLED' | 'REFUNDED' | 'PARTIALLY_REFUNDED';
export type ExternalRefundStatus = 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface ExternalPayment {
    externalId: string;
    status: ExternalPaymentStatus;
    amount: string;
    currency: string;
    method: string | null;
    paidAt: Date | null;
}

export interface RefundInput {
    paymentExternalId: string;
    amount: string;
    currency: string;
    description: string;
    idempotencyKey: string;
}

export interface ExternalRefund { externalId: string; status: ExternalRefundStatus }

export interface PaymentProvider {
    testConnection(): Promise<{ success: boolean }>;
    getPayment(id: string): Promise<ExternalPayment>;
    createRefund(input: RefundInput): Promise<ExternalRefund>;
    getRefund(paymentExternalId: string, refundExternalId: string): Promise<ExternalRefund>;
}
