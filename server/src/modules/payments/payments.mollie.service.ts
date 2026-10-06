import { Payment, Mandate, MandateMethod, Customer, Profile, SequenceType, Subscription, Locale } from '@mollie/api-client';
import dotenv from 'dotenv';
import { getMollieClient } from './payments.auth.service';

dotenv.config();

const getRequiredEnv = (key: string) => {
    const value = process.env[key];

    if (!value) {
        throw new Error(`${key} is required`);
    }

    return value;
};

export const getPaymentReturnUrl = () => (
    process.env.PUBLIC_SITE_URL?.replace(/\/+$/, '')
    ?? 'https://talentcenterddc.nl'
);

// === PROFILE ===
export const getProfile = async (): Promise<Profile> => {
    const mollie = await getMollieClient();
    return mollie.profiles.getCurrent();
};

// === PAYMENTS ===
export const getAllPayments = async (): Promise<Payment[]> => {
    const mollie = await getMollieClient();
    const payments: Payment[] = [];

    for await (const payment of mollie.payments.iterate()) {
        payments.push(payment);
    }

    return payments;

};

export const getPaymentById = async (id: string): Promise<Payment> => {
    const mollie = await getMollieClient();
    return mollie.payments.get(id);
};

export const cancelPaymentById = async (id: string): Promise<Payment> => {
    const mollie = await getMollieClient();
    return mollie.payments.cancel(id);
};

export const updatePaymentReturnUrl = async (id: string): Promise<Payment> => {
    const mollie = await getMollieClient();
    return mollie.payments.update(id, { redirectUrl: getPaymentReturnUrl() });
};

interface InvoicePaymentLinkDTO {
    amountValue: string;
    description: string;
    redirectUrl: string;
    webhookUrl: string;
    expiresAt?: string;
}

export const createInvoicePaymentLink = async ({
    amountValue,
    description,
    redirectUrl,
    webhookUrl,
    expiresAt,
}: InvoicePaymentLinkDTO) => {
    const mollie = await getMollieClient();
    return mollie.paymentLinks.create({
        amount: {
            currency: 'EUR',
            value: amountValue,
        },
        description,
        redirectUrl,
        webhookUrl,
        reusable: false,
        ...(expiresAt ? { expiresAt } : {}),
    });
};

export const archivePaymentLink = async (id: string) => {
    const mollie = await getMollieClient();
    return mollie.paymentLinks.update(id, { archived: true });
};

interface CustomerPaymentLinkDTO {
    customerId?: string;
    amountValue: string;
    description: string;
    redirectUrl: string;
    metadata?: Record<string, string | number>;
}

export const createCustomerPaymentLink = async ({
    customerId,
    amountValue,
    description,
    redirectUrl,
    metadata,
}: CustomerPaymentLinkDTO): Promise<Payment> => {
    const mollie = await getMollieClient();
    return mollie.payments.create({
        ...(customerId ? { customerId } : {}),
        amount: {
            currency: 'EUR',
            value: amountValue,
        },
        description,
        redirectUrl,
        webhookUrl: getRequiredEnv('MOLLIE_WEBHOOK_URL'),
        sequenceType: SequenceType.oneoff,
        metadata: { source: 'crm_payment_link', ...metadata },
    });
};

// === CUSTOMERS ===
export const createCustomer = async ({
    name,
    email,
    locale,
}: {
    name: string;
    email: string;
    locale?: Locale;
}): Promise<Customer> => {
    const mollie = await getMollieClient();
    return mollie.customers.create({ name, email, ...(locale ? { locale } : {}) });
};

export const updateCustomerById = async (id: string, data: { name: string; email?: string }): Promise<Customer> => {
    const mollie = await getMollieClient();
    return mollie.customers.update(id, data);
};

export const deleteCustomerById = async (id: string) => {
    const mollie = await getMollieClient();
    return mollie.customers.delete(id);
}


export const getAllCustomers = async (): Promise<Customer[]> => {
    const mollie = await getMollieClient();
    const customers: Customer[] = [];

    for await (const customer of mollie.customers.iterate()) {
        customers.push(customer);
    }

    return customers;
};

export const getCustomerById = async (id: string): Promise<Customer> => {
    const mollie = await getMollieClient();
    return mollie.customers.get(id);
};

export const getCustomerFullInfo = async (customerId: string) => {
    const mollie = await getMollieClient();
    const customer = await mollie.customers.get(customerId);

    const mandates: any[] = [];
    for await (const mandate of mollie.customerMandates.iterate({ customerId })) {
        mandates.push(mandate);
    }

    const lastMandate = mandates[mandates.length - 1];

    return {
        id: customer.id,
        email: customer.email,
        name: lastMandate?.details?.consumerName ?? null,
        iban: lastMandate?.details?.consumerAccount ?? null,
        bic: lastMandate?.details?.consumerBic ?? null,
        status: lastMandate?.status ?? 'unknown',
        metadata: customer.metadata ?? null,
        createdAt: customer.createdAt,
    };
};


// === MANDATES ===
interface CustomerMandate {
    customerId: string;
    consumerBic?: string;
    consumerName: string;
    signatureDate: string;
    mandateReference?: string;
    consumerAccount: string;
    method?: MandateMethod;
}

export const createMandate = async ({
    customerId,
    consumerBic,
    consumerName,
    signatureDate,
    consumerAccount,
    mandateReference,
    method = MandateMethod.directdebit,
}: CustomerMandate): Promise<Mandate> => {
    const mollie = await getMollieClient();
    const mandate = await mollie.customerMandates.create({
        customerId,
        consumerBic,
        method: method as MandateMethod,
        consumerAccount,
        consumerName,
        mandateReference: mandateReference ?? `MD-${Date.now()}`,
        signatureDate: signatureDate ?? new Date().toISOString().split('T')[0],
    });

    return mandate;
};

export const getMandateById = async (mandateId: string, customerId: string): Promise<Mandate> => {
    const mollie = await getMollieClient();
    const mandate = await mollie.customerMandates.get(mandateId, {
        customerId,
    });
    return mandate;
};

export const getMandateByCustomerId = async (customerId: string): Promise<Mandate[]> => {
    const mollie = await getMollieClient();
    const mandates: Mandate[] = [];

    const mandatesIterator = mollie.customerMandates.iterate({ customerId });

    for await (const mandate of mandatesIterator) {
        console.log("mandate: ", mandate);
        mandates.push(mandate);
    }
    return mandates;

};

interface SubscriptionDTO {
    customerId: string,
    mandateId: string,
    amount: {
        currency: string,
        value: string
    },
    times?: number,
    interval: string,
    startDate: string,
    description: string

}

export const createMandateSubscription = async (customerId: string, data: SubscriptionDTO) => {
    const mollie = await getMollieClient();

    const subscription = await mollie.customerSubscriptions.create({
        customerId,
        amount: {
            currency: 'EUR',
            value: data.amount.value
        },
        ...(data.times ? { times: data.times } : {}),
        interval: data.interval,
        mandateId: data.mandateId,
        startDate: data.startDate,
        description: data.description,
        webhookUrl: getRequiredEnv('MOLLIE_WEBHOOK_URL'),
    });

    return subscription;
}

export const getSubscriptionsByCustomerId = async (customerId: string): Promise<Subscription[]> => {
    const mollie = await getMollieClient();
    const subscriptions: Subscription[] = [];

    const subscriptionIterator = mollie.customerSubscriptions.iterate({ customerId });

    for await (const subscription of subscriptionIterator) {
        subscriptions.push(subscription);
    }
    return subscriptions;

};

export const deleteSubscriptionById = async (customerId: string, subscriptionId: string) => {
    const mollie = await getMollieClient();
    return mollie.customerSubscriptions.cancel(subscriptionId, {
        customerId: customerId,
    });
}

interface UpdateSubscriptionDTO {
    mandateId: string;
    amountValue?: string;
    interval?: string;
    times?: number;
    description?: string;
}

export const updateSubscriptionById = async (
    customerId: string,
    subscriptionId: string,
    data: UpdateSubscriptionDTO,
) => {
    const mollie = await getMollieClient();

    return mollie.customerSubscriptions.update(subscriptionId, {
        customerId,
        mandateId: data.mandateId,
        ...(data.amountValue ? {
            amount: {
                currency: 'EUR',
                value: data.amountValue,
            },
        } : {}),
        ...(data.interval ? { interval: data.interval } : {}),
        ...(data.times ? { times: data.times } : {}),
        ...(data.description ? { description: data.description } : {}),
    });
};

export const revokeMandateById = async (customerId: string, mandateId: string) => {
    const mollie = await getMollieClient();
    return mollie.customerMandates.revoke(mandateId, { customerId });
};
