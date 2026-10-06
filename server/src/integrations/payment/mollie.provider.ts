import createMollieClient, { MollieClient } from '@mollie/api-client';
import { ExternalPayment, ExternalRefund, PaymentProvider, RefundInput } from './PaymentProvider';
import { mapMolliePaymentStatus, mapMollieRefundStatus } from './mollie.mapping';

export class MolliePaymentProvider implements PaymentProvider {
    private readonly client: MollieClient;

    constructor(credentials: Record<string, string>) {
        if (!credentials.apiKey) throw new Error('Mollie API key is not configured');
        this.client = createMollieClient({ apiKey: credentials.apiKey });
    }

    async testConnection() {
        await this.client.methods.list();
        return { success: true };
    }

    async getPayment(id: string): Promise<ExternalPayment> {
        const payment = await this.client.payments.get(id);
        return {
            externalId: payment.id,
            status: mapMolliePaymentStatus(payment.status, payment.amount.value, payment.amountRefunded?.value),
            amount: payment.amount.value,
            currency: payment.amount.currency,
            method: payment.method ?? null,
            paidAt: payment.paidAt ? new Date(payment.paidAt) : null,
        };
    }

    async createRefund(input: RefundInput): Promise<ExternalRefund> {
        const refund = await this.client.paymentRefunds.create({
            paymentId: input.paymentExternalId,
            amount: { currency: input.currency, value: input.amount },
            description: input.description,
            idempotencyKey: input.idempotencyKey,
        });
        return { externalId: refund.id, status: mapMollieRefundStatus(refund.status) };
    }

    async getRefund(paymentExternalId: string, refundExternalId: string): Promise<ExternalRefund> {
        const refund = await this.client.paymentRefunds.get(refundExternalId, { paymentId: paymentExternalId });
        return { externalId: refund.id, status: mapMollieRefundStatus(refund.status) };
    }
}
