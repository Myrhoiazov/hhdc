import { Customer, Mandate, Payment, Subscription } from '@mollie/api-client';
import prisma from '../../../prisma/prisma-client';
import * as mollieService from './payments.mollie.service';
import { normalizePaymentStatus } from './payments.utils.service';
import { reconcileInvoiceMolliePayments } from '../invoices/invoices.mollie.service';
import {
    notifyNewMollieCustomers,
    type MollieMandateNotification,
    type MollieSubscriptionNotification,
    type NewMollieCustomerNotification,
} from '../communication';
import {
    announceMollieMandates,
    announceMollieSubscriptions,
    flattenMollieSubscription,
    toMandateNotification,
    toSubscriptionNotification,
} from './payments.notifications.service';

export interface SyncResult {
    created: number;
    updated: number;
    skipped: number;
    errors: number;
}

export interface FullSyncResult {
    customers: SyncResult;
    mandates: SyncResult;
    subscriptions: SyncResult;
    payments: SyncResult;
}

const createEmptySyncResult = (): SyncResult => ({
    created: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
});

const splitCustomerName = (name?: string | null) => {
    const parts = name?.trim().split(/\s+/).filter(Boolean) ?? [];

    return {
        givenName: parts[0] ?? null,
        familyName: parts.length > 1 ? parts.slice(1).join(' ') : null,
    };
};

const toDate = (value?: string | Date | null) => {
    if (!value) {
        return null;
    }

    return new Date(value);
};

const stringifyMetadata = (metadata?: unknown) => {
    if (!metadata) {
        return null;
    }

    return typeof metadata === 'string' ? metadata : JSON.stringify(metadata);
};

const getInvoiceIdFromMetadata = (metadata?: unknown) => {
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return null;
    const invoiceId = Number((metadata as Record<string, unknown>).invoiceId);
    return Number.isInteger(invoiceId) && invoiceId > 0 ? invoiceId : null;
};

const getPaymentAdjustmentData = async (payment: Payment) => {
    const status = normalizePaymentStatus(payment.status);
    let adjustmentAt: Date | null = null;

    if (payment.hasRefunds()) {
        for await (const refund of payment.getRefunds()) {
            const createdAt = toDate(refund.createdAt);

            if (createdAt && (!adjustmentAt || createdAt > adjustmentAt)) {
                adjustmentAt = createdAt;
            }
        }
    }

    if (payment.hasChargebacks()) {
        for await (const chargeback of payment.getChargebacks()) {
            if (!chargeback.reversedAt) {
                const createdAt = toDate(chargeback.createdAt);

                if (createdAt && (!adjustmentAt || createdAt > adjustmentAt)) {
                    adjustmentAt = createdAt;
                }

                return { status: 'charged_back', adjustmentAt };
            }
        }
    }

    return { status, adjustmentAt };
};

const findClientIdByEmail = async (email?: string | null) => {
    const normalizedEmail = email?.trim();

    if (!normalizedEmail) {
        return null;
    }

    const client = await prisma.client.findFirst({
        where: {
            email: normalizedEmail,
        },
        select: {
            id: true,
        },
    });

    return client?.id ?? null;
};

const upsertCustomerClientLink = async (
    customerId: number,
    clientId: number | null,
    linkSource: string,
    payerRelation = 'unknown',
) => {
    if (!clientId) {
        return;
    }

    await prisma.customerClientLink.upsert({
        where: {
            customerId_clientId: {
                customerId,
                clientId,
            },
        },
        update: {
            linkSource,
            payerRelation,
        },
        create: {
            customerId,
            clientId,
            linkSource,
            payerRelation,
            isPrimary: true,
        },
    });
};

const updateCustomerData = (existing: { id: number; email: string | null; givenName: string | null; familyName: string | null; payerName: string | null; payerRelation: string | null; linkSource: string | null; clientId: number | null }, mollieCustomer: Customer, matchedClientId: number | null) => {
    const shouldApplyEmailMatch = !existing.clientId && matchedClientId;
    const { givenName, familyName } = splitCustomerName(mollieCustomer.name);

    return {
        mollieId: mollieCustomer.id,
        email: mollieCustomer.email ?? existing.email,
        givenName: givenName ?? existing.givenName,
        familyName: familyName ?? existing.familyName,
        payerName: mollieCustomer.name ?? existing.payerName,
        payerRelation: existing.payerRelation ?? 'unknown',
        linkSource: shouldApplyEmailMatch ? 'email_match' : existing.linkSource,
        clientId: existing.clientId ?? matchedClientId ?? undefined,
    };
};

type CustomerSyncOutcome = {
    status: 'created' | 'updated' | 'skipped';
    // Set only for a customer this sync has just created; feeds the Telegram notification.
    createdCustomer?: NewMollieCustomerNotification;
};

const syncMollieCustomerRecord = async (mollieCustomer: Customer): Promise<CustomerSyncOutcome> => {
    if (!mollieCustomer.id) {
        return { status: 'skipped' };
    }

    const matchedClientId = await findClientIdByEmail(mollieCustomer.email);
    const existing = await prisma.customer.findFirst({
        where: {
            OR: [
                { mollieId: mollieCustomer.id },
                ...(mollieCustomer.email ? [{ email: mollieCustomer.email }] : []),
            ],
        },
    });

    if (existing) {
        await prisma.customer.update({
            where: { id: existing.id },
            data: updateCustomerData(existing, mollieCustomer, matchedClientId),
        });
        await upsertCustomerClientLink(existing.id, matchedClientId, 'email_match');

        return { status: 'updated' };
    }

    const customer = await prisma.customer.create({
        data: {
            mollieId: mollieCustomer.id,
            email: mollieCustomer.email,
            givenName: splitCustomerName(mollieCustomer.name).givenName,
            familyName: splitCustomerName(mollieCustomer.name).familyName,
            payerName: mollieCustomer.name ?? null,
            payerRelation: 'unknown',
            linkSource: matchedClientId ? 'email_match' : 'unlinked',
            clientId: matchedClientId,
        },
    });
    await upsertCustomerClientLink(customer.id, matchedClientId, 'email_match');

    return {
        status: 'created',
        createdCustomer: {
            id: customer.id,
            name: mollieCustomer.name,
            source: 'MOLLIE_SYNC',
            linkedToStudent: Boolean(matchedClientId),
        },
    };
};

// Fire-and-forget: the customers are already saved, a Telegram failure must not fail the sync.
const announceNewMollieCustomers = (customers: NewMollieCustomerNotification[]) => {
    void notifyNewMollieCustomers(customers)
        .catch((error) => console.error('Failed to send new-Mollie-customer Telegram notification:', error));
};

export const syncMollieCustomer = async (mollieCustomer: Customer): Promise<'created' | 'updated' | 'skipped'> => {
    const { status, createdCustomer } = await syncMollieCustomerRecord(mollieCustomer);
    if (createdCustomer) announceNewMollieCustomers([createdCustomer]);

    return status;
};

export const syncMollieCustomers = async (): Promise<SyncResult> => {
    const result = createEmptySyncResult();
    const createdCustomers: NewMollieCustomerNotification[] = [];
    const mollieCustomers = await mollieService.getAllCustomers();

    for (const mollieCustomer of mollieCustomers) {
        try {
            const { status, createdCustomer } = await syncMollieCustomerRecord(mollieCustomer);
            result[status] += 1;
            if (createdCustomer) createdCustomers.push(createdCustomer);
        } catch (error) {
            result.errors += 1;
            console.error('Mollie customer sync failed:', mollieCustomer.id, error);
        }
    }
    // One announcement for the whole run, so a large import becomes a single summary message.
    announceNewMollieCustomers(createdCustomers);

    return result;
};

const ensureCustomerSynced = async (payment: Payment) => {
    if (!payment.customerId) return null;

    const existingCustomer = await prisma.customer.findUnique({
        where: { mollieId: payment.customerId },
    });

    if (!existingCustomer) {
        const mollieCustomer = await mollieService.getCustomerById(payment.customerId);
        await syncMollieCustomer(mollieCustomer);
    }

    return prisma.customer.findUnique({ where: { mollieId: payment.customerId } });
};

const resolvePaymentInvoiceId = async (payment: Payment, existingInvoiceId: number | null, invoiceIdHint?: number | null) => {
    const metadataInvoiceId = getInvoiceIdFromMetadata(payment.metadata);
    const metadataInvoice = metadataInvoiceId
        ? await prisma.invoice.findUnique({ where: { id: metadataInvoiceId }, select: { id: true } })
        : null;
    const hintedInvoice = invoiceIdHint
        ? await prisma.invoice.findUnique({ where: { id: invoiceIdHint }, select: { id: true } })
        : null;

    return metadataInvoice?.id ?? existingInvoiceId ?? hintedInvoice?.id ?? null;
};

const paymentUpsertPayload = (
    payment: Payment,
    context: { status: string; adjustmentAt: Date | null },
    customerId: number | null,
    subscriptionId: number | null,
    invoiceId: number | null,
) => {
    const shared = {
        amountValue: payment.amount.value,
        amountCurrency: payment.amount.currency,
        refundedAmount: payment.amountRefunded?.value ?? '0',
        chargedBackAmount: payment.amountChargedBack?.value ?? '0',
        adjustmentAt: context.adjustmentAt,
        description: payment.description,
        method: payment.method ?? 'unknown',
        status: context.status,
        checkoutUrl: payment.getCheckoutUrl(),
        isCancelable: payment.isCancelable,
        paidAt: toDate(payment.paidAt),
    };

    return {
        update: {
            ...shared,
            customerId: customerId ?? undefined,
            subscriptionId: subscriptionId ?? undefined,
            invoiceId,
        },
        create: {
            ...shared,
            mollieId: payment.id,
            createdAt: toDate(payment.createdAt) ?? new Date(),
            customerId,
            subscriptionId,
            invoiceId,
        },
    };
};

export const syncMolliePayment = async (
    payment: Payment,
    invoiceIdHint?: number | null,
): Promise<'created' | 'updated' | 'skipped'> => {
    if (!payment.id) {
        return 'skipped';
    }

    const subscription = payment.subscriptionId
        ? await prisma.subscription.findUnique({
            where: { mollieId: payment.subscriptionId },
            include: {
                customer: true,
            },
        })
        : null;
    const customer = await ensureCustomerSynced(payment) ?? subscription?.customer ?? null;
    const existing = await prisma.payment.findUnique({ where: { mollieId: payment.id } });
    const { status, adjustmentAt } = await getPaymentAdjustmentData(payment);
    const invoiceId = await resolvePaymentInvoiceId(payment, existing?.invoiceId ?? null, invoiceIdHint);

    const syncedPayment = await prisma.payment.upsert({
        where: { mollieId: payment.id },
        ...paymentUpsertPayload(payment, { status, adjustmentAt }, customer?.id ?? null, subscription?.id ?? null, invoiceId),
    });

    if (syncedPayment.invoiceId) {
        await reconcileInvoiceMolliePayments(syncedPayment.invoiceId);
    }

    return existing ? 'updated' : 'created';
};

export const syncMolliePayments = async (): Promise<SyncResult> => {
    const result = createEmptySyncResult();
    const payments = await mollieService.getAllPayments();

    for (const payment of payments) {
        try {
            const status = await syncMolliePayment(payment);
            result[status] += 1;
        } catch (error) {
            result.errors += 1;
            console.error('Mollie payment sync failed:', payment.id, error);
        }
    }

    return result;
};

export const resolveSyncStatus = (
    mollieId: string | null | undefined,
    existingMollieIds: ReadonlySet<string>,
): 'created' | 'updated' | 'skipped' => {
    if (!mollieId) {
        return 'skipped';
    }
    return existingMollieIds.has(mollieId) ? 'updated' : 'created';
};

export const buildMandateUpsertArgs = (customerId: number, mandate: Mandate) => ({
    where: { mollieId: mandate.id },
    update: {
        status: mandate.status,
        method: mandate.method,
        signatureDate: toDate(mandate.signatureDate),
        mandateReference: mandate.mandateReference ?? undefined,
        customerId,
    },
    create: {
        mollieId: mandate.id,
        status: mandate.status,
        method: mandate.method,
        signatureDate: toDate(mandate.signatureDate),
        mandateReference: mandate.mandateReference ?? null,
        customerId,
    },
});

export const syncMollieMandate = async (
    customerId: number,
    mandate: Mandate,
): Promise<'created' | 'updated' | 'skipped'> => {
    if (!mandate.id) {
        return 'skipped';
    }

    const existing = await prisma.mandate.findUnique({ where: { mollieId: mandate.id } });
    await prisma.mandate.upsert(buildMandateUpsertArgs(customerId, mandate));

    return existing ? 'updated' : 'created';
};

type SyncedCustomer = {
    id: number;
    mollieId: string | null;
    payerName?: string | null;
    givenName?: string | null;
    familyName?: string | null;
};

// Collects what one sync run adds to the CRM; announced once the run is over, so a large
// import becomes a single summary instead of a message per record.
type SyncRun<T> = { result: SyncResult; created: T[] };

const syncMollieMandatesForCustomer = async (
    customer: SyncedCustomer,
    run: SyncRun<MollieMandateNotification>,
): Promise<void> => {
    const mandates = await mollieService.getMandateByCustomerId(customer.mollieId);
    const mollieIds = mandates
        .map((mandate) => mandate.id)
        .filter((id): id is string => Boolean(id));
    const existingMandates = mollieIds.length
        ? await prisma.mandate.findMany({
            where: { mollieId: { in: mollieIds } },
            select: { mollieId: true },
        })
        : [];
    const existingMollieIds = new Set(
        existingMandates.map((mandate) => mandate.mollieId).filter((id): id is string => Boolean(id)),
    );

    for (const mandate of mandates) {
        const status = resolveSyncStatus(mandate.id, existingMollieIds);
        run.result[status] += 1;
        if (status === 'skipped') continue;
        await prisma.mandate.upsert(buildMandateUpsertArgs(customer.id, mandate));
        if (status === 'created') {
            run.created.push(toMandateNotification(customer, mandate, { action: 'CREATED', source: 'MOLLIE_SYNC' }));
        }
    }
};

export const syncMollieMandates = async (): Promise<SyncResult> => {
    const run: SyncRun<MollieMandateNotification> = { result: createEmptySyncResult(), created: [] };
    const customers = await prisma.customer.findMany({
        where: {
            mollieId: {
                not: null,
            },
        },
    });

    for (const customer of customers) {
        try {
            await syncMollieMandatesForCustomer(customer, run);
        } catch (error) {
            run.result.errors += 1;
            console.error('Mollie mandates sync failed:', customer.mollieId, error);
        }
    }
    announceMollieMandates(run.created);

    return run.result;
};

export const buildSubscriptionUpsertArgs = (
    customerId: number,
    subscription: Subscription,
    localMandateId: number | null,
) => ({
    where: { mollieId: subscription.id },
    update: {
        description: subscription.description,
        amountValue: subscription.amount.value,
        amountCurrency: subscription.amount.currency,
        interval: subscription.interval,
        metadata: stringifyMetadata(subscription.metadata),
        startDate: toDate(subscription.startDate),
        nextPaymentDate: toDate(subscription.nextPaymentDate),
        status: subscription.status,
        times: subscription.times ?? undefined,
        mandateId: localMandateId ?? undefined,
        customerId,
    },
    create: {
        mollieId: subscription.id,
        description: subscription.description,
        amountValue: subscription.amount.value,
        amountCurrency: subscription.amount.currency,
        interval: subscription.interval,
        metadata: stringifyMetadata(subscription.metadata),
        startDate: toDate(subscription.startDate),
        nextPaymentDate: toDate(subscription.nextPaymentDate),
        status: subscription.status,
        times: subscription.times ?? null,
        customerId,
        mandateId: localMandateId ?? null,
    },
});

export const syncMollieSubscription = async (
    customerId: number,
    subscription: Subscription,
): Promise<'created' | 'updated' | 'skipped'> => {
    if (!subscription.id) {
        return 'skipped';
    }

    const mandate = subscription.mandateId
        ? await prisma.mandate.findUnique({ where: { mollieId: subscription.mandateId } })
        : null;
    const existing = await prisma.subscription.findUnique({ where: { mollieId: subscription.id } });

    await prisma.subscription.upsert(buildSubscriptionUpsertArgs(customerId, subscription, mandate?.id ?? null));

    return existing ? 'updated' : 'created';
};

// What the CRM already knows about a customer's Mollie subscriptions: which of them are stored
// and the local ids of the mandates they refer to.
const loadSubscriptionSyncLookups = async (subscriptions: Subscription[]) => {
    const mollieIds = subscriptions
        .map((subscription) => subscription.id)
        .filter((id): id is string => Boolean(id));
    const mandateMollieIds = subscriptions
        .map((subscription) => subscription.mandateId)
        .filter((id): id is string => Boolean(id));

    const [existingSubscriptions, localMandates] = await Promise.all([
        mollieIds.length
            ? prisma.subscription.findMany({
                where: { mollieId: { in: mollieIds } },
                select: { mollieId: true },
            })
            : Promise.resolve([]),
        mandateMollieIds.length
            ? prisma.mandate.findMany({
                where: { mollieId: { in: mandateMollieIds } },
                select: { id: true, mollieId: true },
            })
            : Promise.resolve([]),
    ]);

    const existingMollieIds = new Set(
        existingSubscriptions.map((subscription) => subscription.mollieId).filter((id): id is string => Boolean(id)),
    );
    const mandateIdByMollieId = new Map(
        localMandates
            .filter((mandate): mandate is typeof mandate & { mollieId: string } => Boolean(mandate.mollieId))
            .map((mandate) => [mandate.mollieId, mandate.id]),
    );

    return { existingMollieIds, mandateIdByMollieId };
};

const syncMollieSubscriptionsForCustomer = async (
    customer: SyncedCustomer,
    run: SyncRun<MollieSubscriptionNotification>,
): Promise<void> => {
    const subscriptions = await mollieService.getSubscriptionsByCustomerId(customer.mollieId);
    const { existingMollieIds, mandateIdByMollieId } = await loadSubscriptionSyncLookups(subscriptions);

    for (const subscription of subscriptions) {
        const status = resolveSyncStatus(subscription.id, existingMollieIds);
        run.result[status] += 1;
        if (status === 'skipped') continue;
        const localMandateId = subscription.mandateId
            ? mandateIdByMollieId.get(subscription.mandateId) ?? null
            : null;
        await prisma.subscription.upsert(
            buildSubscriptionUpsertArgs(customer.id, subscription, localMandateId),
        );
        if (status === 'created') {
            run.created.push(toSubscriptionNotification(
                customer,
                flattenMollieSubscription(subscription),
                { action: 'CREATED', source: 'MOLLIE_SYNC' },
            ));
        }
    }
};

export const syncMollieSubscriptions = async (): Promise<SyncResult> => {
    const run: SyncRun<MollieSubscriptionNotification> = { result: createEmptySyncResult(), created: [] };
    const customers = await prisma.customer.findMany({
        where: {
            mollieId: {
                not: null,
            },
        },
    });

    for (const customer of customers) {
        try {
            await syncMollieSubscriptionsForCustomer(customer, run);
        } catch (error) {
            run.result.errors += 1;
            console.error('Mollie subscriptions sync failed:', customer.mollieId, error);
        }
    }
    announceMollieSubscriptions(run.created);

    return run.result;
};

export const syncAllMollieData = async (): Promise<FullSyncResult> => {
    const customers = await syncMollieCustomers();
    const mandates = await syncMollieMandates();
    const subscriptions = await syncMollieSubscriptions();
    const payments = await syncMolliePayments();

    return {
        customers,
        mandates,
        subscriptions,
        payments,
    };
};
