import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { paymentLinkExpiry } from './invoices.payment-link.service';

describe('invoice Mollie payment link expiry', () => {
    it('expires at the end of the due date in Amsterdam during summer time', () => {
        const now = new Date('2026-06-01T00:00:00.000Z');
        assert.equal(
            paymentLinkExpiry(new Date('2026-06-25T00:00:00.000Z'), now)?.toISOString(),
            '2026-06-25T21:59:59.999Z',
        );
    });

    it('expires at the end of the due date in Amsterdam during winter time', () => {
        const now = new Date('2026-12-01T00:00:00.000Z');
        assert.equal(
            paymentLinkExpiry(new Date('2026-12-25T00:00:00.000Z'), now)?.toISOString(),
            '2026-12-25T22:59:59.999Z',
        );
    });

    it('does not return an expiry for a due date that has already passed', () => {
        const now = new Date('2026-06-01T00:00:00.000Z');
        assert.equal(paymentLinkExpiry(new Date('2020-01-01T00:00:00.000Z'), now), null);
    });

    it('defaults to the real current time when now is not provided', () => {
        const farFuture = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
        assert.notEqual(paymentLinkExpiry(farFuture), null);
        assert.equal(paymentLinkExpiry(new Date('2020-01-01T00:00:00.000Z')), null);
    });
});
