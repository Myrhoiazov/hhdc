import { ChoreographerPaymentStatus, ChoreographerPaymentType, ExpensePaidBy, FeeAgreementStatus, FeeBasis, Prisma } from '@prisma/client';
import { z } from 'zod';
import prisma from '../../../prisma/prisma-client';
import { ApiError } from '../../common/http';
import { assignmentTotals, canMovePayment, combineTotals, effectiveExpenseAmount } from './finance.rules';
import { assertChoreographer } from './profile.service';

const money = z.union([z.number(), z.string()]).transform(value => String(value).trim().replace(',', '.'))
    .refine(value => /^\d{1,10}(\.\d{1,2})?$/.test(value), 'Use an amount with at most two decimals');
const currency = z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, 'Use a three-letter currency code');
const optionalText = (max: number) => z.string().trim().max(max).nullable().optional().transform(value => (value === '' ? null : value));
const optionalDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional().or(z.literal('').transform((): null => null));

export const EXPENSE_CATEGORIES = ['TRAVEL', 'HOTEL', 'PER_DIEM', 'TRANSFER', 'EQUIPMENT', 'OTHER'] as const;
// A negotiation step is recorded as proposed, countered or agreed; the other states are set by the system or by cancelling.
const NEW_AGREEMENT_STATUSES = ['PROPOSED', 'COUNTERED', 'AGREED'] as const;

export const feeAgreementSchema = z.object({
    status: z.enum(NEW_AGREEMENT_STATUSES), amount: money, currency,
    feeBasis: z.nativeEnum(FeeBasis).default('EVENT'), scopeDescription: optionalText(500), notes: optionalText(2000),
}).strict();
export const expenseSchema = z.object({
    category: z.enum(EXPENSE_CATEGORIES), description: optionalText(500), currency,
    estimatedAmount: money.nullable().optional(), actualAmount: money.nullable().optional(),
    paidBy: z.nativeEnum(ExpensePaidBy).default('ORGANIZER'), reimbursable: z.boolean().default(false), expenseDate: optionalDate,
}).strict().refine(value => value.estimatedAmount != null || value.actualAmount != null, 'Give an estimated or an actual amount');
export const paymentSchema = z.object({
    type: z.nativeEnum(ChoreographerPaymentType), amount: money.refine(value => Number(value) > 0, 'The amount must be positive'), currency,
    status: z.enum(['PLANNED', 'PENDING']).default('PLANNED'), paymentDate: optionalDate, reference: optionalText(200),
    // The invoice this payment settles; it must be an invoice of the same choreographer.
    invoiceDocumentId: z.string().uuid().nullable().optional(),
}).strict();
export const paymentStatusSchema = z.object({ status: z.nativeEnum(ChoreographerPaymentStatus), paymentDate: optionalDate }).strict();

interface Actor { userId: string }

const toDate = (value: string | null | undefined): Date | null => (value ? new Date(`${value}T00:00:00Z`) : null);

const requireAssignment = async (assignmentId: string) => {
    const assignment = await prisma.eventChoreographer.findUnique({ where: { id: assignmentId }, select: { id: true, personId: true, eventId: true } });
    if (!assignment) throw new ApiError(404, 'ASSIGNMENT_NOT_FOUND', 'Assignment not found');
    return assignment;
};

type Assignment = Awaited<ReturnType<typeof requireAssignment>>;

// Activity says that finance changed, never by how much; the amounts live in the audit log.
const record = (tx: Prisma.TransactionClient, assignment: Assignment, actor: Actor, entry: { type: string; entityType: string; entityId: string; before?: unknown; after?: unknown }) => Promise.all([
    tx.activity.create({ data: { personId: assignment.personId, eventId: assignment.eventId, actorUserId: actor.userId, type: entry.type, entityType: entry.entityType, entityId: entry.entityId, metadata: {} } }),
    tx.auditLog.create({ data: {
        actorUserId: actor.userId, action: entry.type, entityType: entry.entityType, entityId: entry.entityId,
        before: entry.before === undefined ? Prisma.JsonNull : JSON.parse(JSON.stringify(entry.before)),
        after: entry.after === undefined ? Prisma.JsonNull : JSON.parse(JSON.stringify(entry.after)),
    } }),
]);

// A new agreed fee replaces the previous one: the old row is kept and marked superseded.
export const recordFeeAgreement = async (assignmentId: string, input: z.infer<typeof feeAgreementSchema>, actor: Actor) => {
    const assignment = await requireAssignment(assignmentId);
    return prisma.$transaction(async tx => {
        const previous = input.status === 'AGREED' ? await tx.choreographerFeeAgreement.findFirst({ where: { assignmentId, status: 'AGREED' } }) : null;
        if (previous) await tx.choreographerFeeAgreement.update({ where: { id: previous.id }, data: { status: 'SUPERSEDED' } });
        const created = await tx.choreographerFeeAgreement.create({ data: {
            assignmentId, status: input.status as FeeAgreementStatus, amount: input.amount, currency: input.currency, feeBasis: input.feeBasis,
            scopeDescription: input.scopeDescription, notes: input.notes, createdById: actor.userId,
            agreedAt: input.status === 'AGREED' ? new Date() : null, supersedesAgreementId: previous?.id ?? null,
        } });
        await record(tx, assignment, actor, {
            type: input.status === 'AGREED' ? 'CHOREOGRAPHER_FEE_AGREED' : 'CHOREOGRAPHER_FEE_OFFER_RECORDED', entityType: 'ChoreographerFeeAgreement', entityId: created.id,
            before: previous ? { amount: previous.amount, currency: previous.currency, status: 'AGREED' } : undefined,
            after: { amount: created.amount, currency: created.currency, status: created.status },
        });
        return created;
    }, { isolationLevel: 'Serializable' });
};

export const cancelFeeAgreement = async (agreementId: string, actor: Actor) => {
    const agreement = await prisma.choreographerFeeAgreement.findUnique({ where: { id: agreementId } });
    if (!agreement) throw new ApiError(404, 'AGREEMENT_NOT_FOUND', 'Fee agreement not found');
    if (['CANCELLED', 'SUPERSEDED'].includes(agreement.status)) throw new ApiError(409, 'AGREEMENT_CLOSED', 'This entry is already closed');
    const assignment = await requireAssignment(agreement.assignmentId);
    return prisma.$transaction(async tx => {
        const cancelled = await tx.choreographerFeeAgreement.update({ where: { id: agreementId }, data: { status: 'CANCELLED' } });
        await record(tx, assignment, actor, { type: 'CHOREOGRAPHER_FEE_CANCELLED', entityType: 'ChoreographerFeeAgreement', entityId: agreementId, before: { status: agreement.status, amount: agreement.amount, currency: agreement.currency }, after: { status: 'CANCELLED' } });
        return cancelled;
    });
};

type ExpenseInput = z.infer<typeof expenseSchema>;
const expenseData = (input: ExpenseInput) => ({
    type: input.category, description: input.description, currency: input.currency, paidBy: input.paidBy, reimbursable: input.reimbursable,
    estimatedAmount: input.estimatedAmount ?? null, actualAmount: input.actualAmount ?? null, expenseDate: toDate(input.expenseDate),
    amount: effectiveExpenseAmount({ actualAmount: input.actualAmount ?? null, estimatedAmount: input.estimatedAmount ?? null }),
    // The event finance overview counts PAID costs as actual and PLANNED ones as estimated.
    status: input.actualAmount != null ? 'PAID' : 'PLANNED',
});

export const recordExpense = async (assignmentId: string, input: ExpenseInput, actor: Actor) => {
    const assignment = await requireAssignment(assignmentId);
    return prisma.$transaction(async tx => {
        const created = await tx.choreographerCost.create({ data: { ...expenseData(input), eventChoreographerId: assignmentId, createdById: actor.userId } });
        await record(tx, assignment, actor, { type: 'CHOREOGRAPHER_EXPENSE_RECORDED', entityType: 'ChoreographerCost', entityId: created.id, after: created });
        return created;
    });
};

const requireExpense = async (expenseId: string) => {
    const expense = await prisma.choreographerCost.findUnique({ where: { id: expenseId } });
    if (!expense) throw new ApiError(404, 'EXPENSE_NOT_FOUND', 'Expense not found');
    return expense;
};

// An expense is corrected in place (the estimate becomes an actual); both versions go to the audit log.
export const updateExpense = async (expenseId: string, input: ExpenseInput, actor: Actor) => {
    const before = await requireExpense(expenseId);
    const assignment = await requireAssignment(before.eventChoreographerId);
    return prisma.$transaction(async tx => {
        const after = await tx.choreographerCost.update({ where: { id: expenseId }, data: expenseData(input) });
        await record(tx, assignment, actor, { type: 'CHOREOGRAPHER_EXPENSE_UPDATED', entityType: 'ChoreographerCost', entityId: expenseId, before, after });
        return after;
    });
};

// A wrong expense is cancelled, not deleted, so the record of it survives.
export const cancelExpense = async (expenseId: string, actor: Actor) => {
    const before = await requireExpense(expenseId);
    const assignment = await requireAssignment(before.eventChoreographerId);
    return prisma.$transaction(async tx => {
        const after = await tx.choreographerCost.update({ where: { id: expenseId }, data: { status: 'CANCELLED' } });
        await record(tx, assignment, actor, { type: 'CHOREOGRAPHER_EXPENSE_CANCELLED', entityType: 'ChoreographerCost', entityId: expenseId, before: { status: before.status }, after: { status: 'CANCELLED' } });
        return after;
    });
};

const assertOwnInvoice = async (personId: string, documentId: string | null | undefined): Promise<void> => {
    if (!documentId) return;
    const invoice = await prisma.document.count({ where: { id: documentId, entityType: 'Person', entityId: personId, type: 'INVOICE' } });
    if (!invoice) throw new ApiError(400, 'INVOICE_MISMATCH', 'The invoice does not belong to this choreographer');
};

export const recordPayment = async (assignmentId: string, input: z.infer<typeof paymentSchema>, actor: Actor) => {
    const assignment = await requireAssignment(assignmentId);
    await assertOwnInvoice(assignment.personId, input.invoiceDocumentId);
    return prisma.$transaction(async tx => {
        const agreed = await tx.choreographerFeeAgreement.findFirst({ where: { assignmentId, status: 'AGREED', currency: input.currency }, select: { id: true } });
        const created = await tx.choreographerPaymentRecord.create({ data: {
            assignmentId, agreementId: input.type === 'REIMBURSEMENT' ? null : agreed?.id ?? null, amount: input.amount, currency: input.currency,
            type: input.type, status: input.status, paymentDate: toDate(input.paymentDate), reference: input.reference, recordedById: actor.userId,
            invoiceDocumentId: input.invoiceDocumentId ?? null,
        } });
        await record(tx, assignment, actor, { type: 'CHOREOGRAPHER_PAYMENT_RECORDED', entityType: 'ChoreographerPaymentRecord', entityId: created.id, after: created });
        return created;
    });
};

export interface PaymentActor extends Actor { canConfirm: boolean }

// Confirming a payment states that money reached the choreographer, so it needs its own permission.
export const movePayment = async (paymentId: string, input: z.infer<typeof paymentStatusSchema>, actor: PaymentActor) => {
    const before = await prisma.choreographerPaymentRecord.findUnique({ where: { id: paymentId } });
    if (!before) throw new ApiError(404, 'PAYMENT_NOT_FOUND', 'Payment record not found');
    if (!canMovePayment(before.status, input.status)) throw new ApiError(409, 'PAYMENT_TRANSITION_INVALID', `A ${before.status} payment cannot become ${input.status}`);
    const sensitive = input.status === 'CONFIRMED' || before.status === 'CONFIRMED';
    if (sensitive && !actor.canConfirm) throw new ApiError(403, 'FORBIDDEN', 'Confirming a payment requires its own permission');
    const assignment = await requireAssignment(before.assignmentId);
    return prisma.$transaction(async tx => {
        const after = await tx.choreographerPaymentRecord.update({ where: { id: paymentId }, data: {
            status: input.status, confirmedById: input.status === 'CONFIRMED' ? actor.userId : before.confirmedById,
            paymentDate: input.paymentDate !== undefined ? toDate(input.paymentDate) : before.paymentDate ?? (input.status === 'CONFIRMED' ? new Date() : null),
        } });
        await record(tx, assignment, actor, { type: `CHOREOGRAPHER_PAYMENT_${input.status}`, entityType: 'ChoreographerPaymentRecord', entityId: paymentId, before: { status: before.status }, after: { status: after.status, amount: after.amount, currency: after.currency } });
        return after;
    });
};

const LEDGER = {
    id: true, roleTitle: true, status: true,
    event: { select: { id: true, name: true, startAt: true } },
    feeAgreements: { orderBy: { createdAt: 'desc' } },
    costs: { orderBy: { createdAt: 'desc' } },
    payoutRecords: { orderBy: { createdAt: 'desc' } },
} satisfies Prisma.EventChoreographerSelect;

// The whole financial history of a choreographer: per assignment and per year, per currency.
export const getFinance = async (personId: string) => {
    await assertChoreographer(personId);
    const rows = await prisma.eventChoreographer.findMany({ where: { personId }, select: LEDGER, orderBy: { event: { startAt: 'desc' } } });
    const assignments = rows.map(({ feeAgreements, costs, payoutRecords, ...assignment }) => ({
        ...assignment, year: assignment.event.startAt.getUTCFullYear(),
        agreements: feeAgreements, expenses: costs, payments: payoutRecords,
        totals: assignmentTotals({ agreements: feeAgreements, expenses: costs, payments: payoutRecords }),
    }));
    const years = Array.from(new Set(assignments.map(item => item.year))).sort((a, b) => b - a)
        .map(year => ({ year, totals: combineTotals(assignments.filter(item => item.year === year).map(item => item.totals)) }));
    return { assignments, years };
};
