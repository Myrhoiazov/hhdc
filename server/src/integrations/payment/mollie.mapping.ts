import { ExternalPaymentStatus, ExternalRefundStatus } from './PaymentProvider';

const PAYMENT_STATUSES: Record<string, ExternalPaymentStatus> = {
    open: 'PENDING', pending: 'PENDING', authorized: 'AUTHORIZED', paid: 'PAID',
    failed: 'FAILED', expired: 'FAILED', canceled: 'CANCELLED',
};

const toCents = (value: string | undefined) => Math.round(Number(value ?? '0') * 100);

export const mapMolliePaymentStatus = (status: string, amount: string, amountRefunded?: string): ExternalPaymentStatus => {
    const mapped = PAYMENT_STATUSES[status];
    if (!mapped) throw new Error(`Unknown Mollie payment status: ${status}`);
    const refunded = toCents(amountRefunded);
    if (mapped !== 'PAID' || refunded === 0) return mapped;
    return refunded >= toCents(amount) ? 'REFUNDED' : 'PARTIALLY_REFUNDED';
};

const REFUND_STATUSES: Record<string, ExternalRefundStatus> = {
    queued: 'PROCESSING', pending: 'PROCESSING', processing: 'PROCESSING', refunded: 'COMPLETED', failed: 'FAILED',
};

export const mapMollieRefundStatus = (status: string): ExternalRefundStatus => {
    const mapped = REFUND_STATUSES[status];
    if (!mapped) throw new Error(`Unknown Mollie refund status: ${status}`);
    return mapped;
};
