import {
    notifyMollieCustomerDeleted,
    notifyMollieMandates,
    notifyMollieSubscriptions,
    type MollieMandateNotification,
    type MollieSubscriptionNotification,
} from '../communication';

// Telegram announcements of Mollie record changes. Every announce* call is fire-and-forget:
// the change is already saved, so a Telegram failure must not fail the request or the sync.

type CustomerName = { payerName?: string | null; givenName?: string | null; familyName?: string | null };
type AnnouncedCustomer = CustomerName & { id: number };

type AnnouncedSubscription = {
    amountValue: unknown;
    amountCurrency: string;
    interval?: string | null;
    startDate?: Date | string | null;
    description?: string | null;
};

type MollieSubscriptionAmount = { amount: { value: string; currency: string } };

type SubscriptionEvent = Pick<MollieSubscriptionNotification, 'action' | 'source'> & { actorEmail?: string | null };
type MandateEvent = Pick<MollieMandateNotification, 'action' | 'source' | 'canceledSubscriptions'> & {
    actorEmail?: string | null;
};

export const customerDisplayName = (customer: CustomerName) => (
    customer.payerName || [customer.givenName, customer.familyName].filter(Boolean).join(' ')
);

const toDateOnly = (value?: Date | string | null) => {
    if (!value) return null;
    return typeof value === 'string' ? value.slice(0, 10) : value.toISOString().slice(0, 10);
};

const logFailure = (subject: string) => (error: unknown) => (
    console.error(`Failed to send ${subject} Telegram notification:`, error)
);

export const toMandateNotification = (
    customer: AnnouncedCustomer,
    mandate: { method?: string | null },
    event: MandateEvent,
): MollieMandateNotification => ({
    ...event,
    customerId: customer.id,
    customerName: customerDisplayName(customer),
    method: mandate.method,
});

// Accepts a local Subscription row; a Mollie API subscription goes through
// flattenMollieSubscription first.
export const toSubscriptionNotification = (
    customer: AnnouncedCustomer,
    subscription: AnnouncedSubscription,
    event: SubscriptionEvent,
): MollieSubscriptionNotification => ({
    ...event,
    customerId: customer.id,
    customerName: customerDisplayName(customer),
    amountValue: String(subscription.amountValue),
    amountCurrency: subscription.amountCurrency,
    interval: subscription.interval,
    startDate: toDateOnly(subscription.startDate),
    description: subscription.description,
});

export const flattenMollieSubscription = <T extends MollieSubscriptionAmount>(subscription: T) => ({
    ...subscription,
    amountValue: subscription.amount.value,
    amountCurrency: subscription.amount.currency,
});

export const announceMollieCustomerDeleted = (customer: CustomerName, deletedByEmail?: string | null) => {
    void notifyMollieCustomerDeleted({ name: customerDisplayName(customer), deletedByEmail })
        .catch(logFailure('Mollie-customer-deleted'));
};

export const announceMollieMandates = (mandates: MollieMandateNotification[]) => {
    void notifyMollieMandates(mandates).catch(logFailure('Mollie-mandate'));
};

export const announceMollieSubscriptions = (subscriptions: MollieSubscriptionNotification[]) => {
    void notifyMollieSubscriptions(subscriptions).catch(logFailure('Mollie-subscription'));
};

// A subscription change made by an employee in the CRM.
export const announceCrmSubscription = (
    customer: AnnouncedCustomer,
    subscription: AnnouncedSubscription,
    action: MollieSubscriptionNotification['action'],
    actorEmail?: string | null,
) => {
    announceMollieSubscriptions([toSubscriptionNotification(customer, subscription, { action, source: 'CRM', actorEmail })]);
};
