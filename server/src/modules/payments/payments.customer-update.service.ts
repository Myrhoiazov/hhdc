import prisma from '../../../prisma/prisma-client';
import * as mollieService from './payments.mollie.service';

// Editing a Mollie customer in the CRM. The name and email also live in the Mollie account, and
// the Mollie sync copies them back, so a local-only edit would be reverted by the next sync.

export interface StoredCustomerIdentity {
    mollieId: string | null;
    email: string | null;
    givenName: string | null;
    familyName: string | null;
    payerName: string | null;
}

export interface CustomerChanges {
    email?: string | null;
    givenName?: string | null;
    familyName?: string | null;
    payerName?: string | null;
    [field: string]: unknown;
}

export interface MollieCustomerUpdate {
    name: string;
    email?: string;
}

const joinName = (givenName?: string | null, familyName?: string | null) => (
    [givenName, familyName].map((part) => part?.trim()).filter(Boolean).join(' ')
);

const pick = <T>(change: T | undefined, stored: T) => (change === undefined ? stored : change);

// The edit form has no payer-name input and sends the stored value back, so the payer name
// follows the given and family name unless the request really changes it.
const resolvePayerName = (existing: StoredCustomerIdentity, changes: CustomerChanges) => {
    const isEditedExplicitly = changes.payerName !== undefined && changes.payerName !== existing.payerName;
    if (isEditedExplicitly) return changes.payerName?.trim() || null;

    const fullName = joinName(pick(changes.givenName, existing.givenName), pick(changes.familyName, existing.familyName));
    return fullName || existing.payerName;
};

export const planCustomerUpdate = <T extends CustomerChanges>(existing: StoredCustomerIdentity, changes: T) => {
    const payerName = resolvePayerName(existing, changes);
    const email = pick(changes.email, existing.email);
    const isPayerNameChanged = payerName !== existing.payerName;
    const needsMollieUpdate = Boolean(existing.mollieId && payerName) && (isPayerNameChanged || email !== existing.email);
    const { payerName: _sentPayerName, ...otherChanges } = changes;

    return {
        data: { ...otherChanges, ...(isPayerNameChanged ? { payerName } : {}) },
        mollieUpdate: needsMollieUpdate
            ? { name: payerName as string, ...(email ? { email } : {}) } satisfies MollieCustomerUpdate
            : null,
    };
};

const pushToMollie = async (mollieId: string, update: MollieCustomerUpdate) => {
    try {
        await mollieService.updateCustomerById(mollieId, update);
        return true;
    } catch (error) {
        console.error('Error updating customer in Mollie:', error instanceof Error ? error.message : error);
        return false;
    }
};

// Mollie first: when it refuses the change nothing is saved, so the CRM and Mollie cannot
// drift apart.
export const updateCustomerInCrmAndMollie = async (customerId: number, changes: CustomerChanges) => {
    const existing = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!existing) return { failure: 'NOT_FOUND' as const };

    const { data, mollieUpdate } = planCustomerUpdate(existing, changes);
    const isMollieUpdated = !existing.mollieId || !mollieUpdate || await pushToMollie(existing.mollieId, mollieUpdate);
    if (!isMollieUpdated) return { failure: 'MOLLIE_REJECTED' as const };

    return { customer: await prisma.customer.update({ where: { id: customerId }, data }) };
};
