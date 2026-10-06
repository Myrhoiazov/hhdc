import { Prisma } from '@prisma/client';

// Minimal projections for the Transactions API. Manual transactions expose the
// same fields as before; Mollie payments load only fields needed to build the
// FinancialTransaction view used by list, summary, chart, and CSV export.

export const manualTransactionSelect = Prisma.validator<Prisma.TransactionSelect>()({
    id: true,
    type: true,
    amount: true,
    category: true,
    description: true,
    date: true,
    createdAt: true,
    updatedAt: true,
    paymentMethod: true,
});

export const molliePaymentTransactionSelect = Prisma.validator<Prisma.PaymentSelect>()({
    id: true,
    mollieId: true,
    amountValue: true,
    amountCurrency: true,
    refundedAmount: true,
    chargedBackAmount: true,
    adjustmentAt: true,
    description: true,
    method: true,
    status: true,
    paidAt: true,
    createdAt: true,
    updatedAt: true,
    customer: {
        select: {
            givenName: true,
            familyName: true,
            consumerName: true,
            email: true,
        },
    },
});
