import { RefundStatus } from '@prisma/client';
import { ApiError } from '../../common/http';

type Money = string | number | { toString(): string };

// Money is compared in integer cents; decimals never pass through floating-point sums.
export const toCents = (value: Money) => {
    const cents = Math.round(Number(value.toString()) * 100);
    if (!Number.isFinite(cents)) throw new ApiError(400, 'INVALID_AMOUNT', 'Amount is not a number');
    return cents;
};
export const fromCents = (cents: number) => (cents / 100).toFixed(2);

const TRANSITIONS: Record<RefundStatus, RefundStatus[]> = {
    REQUESTED: ['APPROVED', 'REJECTED'],
    APPROVED: ['PROCESSING', 'REJECTED'],
    PROCESSING: ['COMPLETED', 'FAILED'],
    FAILED: ['PROCESSING'],
    COMPLETED: [],
    REJECTED: [],
};

export const canTransition = (from: RefundStatus, to: RefundStatus) => TRANSITIONS[from].includes(to);

export const assertTransition = (from: RefundStatus, to: RefundStatus) => {
    if (!canTransition(from, to)) throw new ApiError(409, 'INVALID_REFUND_STATE', `Refund cannot move from ${from} to ${to}`);
};

// Refunds that still hold (or already consumed) part of the payment.
const RESERVING: RefundStatus[] = ['REQUESTED', 'APPROVED', 'PROCESSING', 'COMPLETED'];

export interface RefundLike { amount: Money; status: RefundStatus }

export const refundableCents = (paymentAmount: Money, refunds: RefundLike[]) =>
    toCents(paymentAmount) - refunds.filter(refund => RESERVING.includes(refund.status)).reduce((sum, refund) => sum + toCents(refund.amount), 0);

export const REFUNDABLE_PAYMENT_STATUSES = ['PAID', 'PARTIALLY_REFUNDED'];

export interface RefundRequestCheck { paymentStatus: string; paymentAmount: Money; refunds: RefundLike[]; amount: Money }

export const assertRefundRequest = ({ paymentStatus, paymentAmount, refunds, amount }: RefundRequestCheck) => {
    if (!REFUNDABLE_PAYMENT_STATUSES.includes(paymentStatus)) throw new ApiError(409, 'PAYMENT_NOT_REFUNDABLE', 'Only paid payments can be refunded');
    const requested = toCents(amount);
    if (requested <= 0) throw new ApiError(400, 'INVALID_AMOUNT', 'Refund amount must be positive');
    if (requested > refundableCents(paymentAmount, refunds)) throw new ApiError(409, 'REFUND_EXCEEDS_PAYMENT', 'Refund exceeds the remaining refundable amount');
};

export const paymentStatusAfterRefunds = (paymentAmount: Money, refunds: RefundLike[]) => {
    const completed = refunds.filter(refund => refund.status === 'COMPLETED').reduce((sum, refund) => sum + toCents(refund.amount), 0);
    if (completed === 0) return 'PAID';
    return completed >= toCents(paymentAmount) ? 'REFUNDED' : 'PARTIALLY_REFUNDED';
};
