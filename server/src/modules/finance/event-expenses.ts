import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import prisma from '../../../prisma/prisma-client';
import { ApiError } from '../../common/http';
import { mayBePaid } from '../people/payees';
import { fromCents, toCents } from './refund-rules';

// The costs of an event. An expense is entered on the event and may name the person it is paid
// to — a choreographer or a staff member — so the same line shows up on that person's page. Costs kept on a choreographer's card (expenses and agreed fees) are not copied
// here: they are listed next to the event's own expenses and counted once.

export const EXPENSE_CATEGORIES = ['FEE', 'SALARY', 'TRAVEL', 'HOTEL', 'VENUE', 'MARKETING', 'EQUIPMENT', 'OTHER'] as const;
export const EXPENSE_STATUSES = ['PLANNED', 'PAID', 'CANCELLED'] as const;

const amount = z.union([z.string(), z.number()]).transform(value => String(value).trim().replace(',', '.'))
    .refine(value => /^\d+(\.\d{1,2})?$/.test(value) && Number(value) > 0, 'The amount must be a positive number with at most two decimals');

const fields = {
    category: z.enum(EXPENSE_CATEGORIES),
    description: z.string().trim().max(500).nullable().optional(),
    amount,
    currency: z.string().trim().length(3).toUpperCase().default('EUR'),
    status: z.enum(EXPENSE_STATUSES).default('PLANNED'),
    expenseDate: z.coerce.date().nullable().optional(),
    personId: z.string().uuid().nullable().optional(),
};
export const expenseSchema = z.object(fields).strict();
export const expenseChangeSchema = z.object({ ...fields, currency: fields.currency.optional(), status: z.enum(EXPENSE_STATUSES).optional() }).partial().strict();
export type ExpenseInput = z.infer<typeof expenseSchema>;
export type ExpenseChange = z.infer<typeof expenseChangeSchema>;

export type ExpenseSource = 'EVENT' | 'CHOREOGRAPHER_EXPENSE' | 'CHOREOGRAPHER_FEE';
export interface ExpenseLine {
    id: string; source: ExpenseSource; category: string; description: string | null; amount: string; currency: string; status: string;
    date: string | null; person: { id: string; displayName: string } | null; event?: { id: string; name: string };
}
export interface ExpenseTotals { total: string; paid: string; planned: string; byCategory: { category: string; amount: string }[] }

// A cancelled expense is kept for the record and counts for nothing. What is not paid yet is planned.
export const summariseExpenses = (lines: Pick<ExpenseLine, 'category' | 'amount' | 'status'>[]): ExpenseTotals => {
    const counted = lines.filter(line => line.status !== 'CANCELLED');
    const cents = (selected: typeof counted) => selected.reduce((sum, line) => sum + toCents(line.amount), 0);
    const categories = [...new Set(counted.map(line => line.category))];
    const paid = cents(counted.filter(line => line.status === 'PAID'));
    return {
        total: fromCents(cents(counted)), paid: fromCents(paid), planned: fromCents(cents(counted) - paid),
        byCategory: categories.map(category => ({ category, amount: fromCents(cents(counted.filter(line => line.category === category))) }))
            .sort((a, b) => toCents(b.amount) - toCents(a.amount)),
    };
};

// The moment of payment is remembered when an expense becomes paid and forgotten when it stops being paid.
export const paidAtFor = (status: string | undefined, current: Date | null, now = new Date()): Date | null | undefined => {
    if (status === undefined) return undefined;
    if (status !== 'PAID') return null;
    return current ?? now;
};

const PERSON = { select: { id: true, displayName: true } } as const;
const EXPENSE_FIELDS = { id: true, category: true, description: true, amount: true, currency: true, status: true, expenseDate: true, person: PERSON, event: { select: { id: true, name: true } } } as const;
type ExpenseRow = Prisma.EventExpenseGetPayload<{ select: typeof EXPENSE_FIELDS }>;

const day = (date: Date | null): string | null => date?.toISOString().slice(0, 10) ?? null;

const toLine = (row: ExpenseRow): ExpenseLine => ({
    id: row.id, source: 'EVENT', category: row.category, description: row.description, amount: row.amount.toFixed(2), currency: row.currency, status: row.status,
    date: day(row.expenseDate), person: row.person, event: row.event,
});

const requirePayee = async (personId: string | null | undefined): Promise<void> => {
    if (!personId) return;
    const person = await prisma.person.findUnique({ where: { id: personId }, select: { roles: { select: { role: true } } } });
    if (!person) throw new ApiError(400, 'PERSON_NOT_FOUND', 'The person this expense is paid to does not exist');
    if (!mayBePaid(person.roles.map(item => item.role))) throw new ApiError(400, 'PAYEE_ROLE_REQUIRED', 'An expense can be paid only to a choreographer or a staff member. Give the person that role first');
};

const requireEvent = async (eventId: string): Promise<void> => {
    if (!await prisma.event.count({ where: { id: eventId } })) throw new ApiError(404, 'EVENT_NOT_FOUND', 'Event not found');
};

const audit = (tx: Prisma.TransactionClient, action: string, actorUserId: string, change: { id: string; before?: unknown; after: unknown }) => tx.auditLog.create({
    data: { actorUserId, action, entityType: 'EventExpense', entityId: change.id, before: change.before as Prisma.InputJsonValue | undefined, after: change.after as Prisma.InputJsonValue },
});

export const createEventExpense = async (eventId: string, input: ExpenseInput, actorUserId: string): Promise<ExpenseLine> => {
    await requireEvent(eventId);
    await requirePayee(input.personId);
    return prisma.$transaction(async tx => {
        const data: Prisma.EventExpenseUncheckedCreateInput = {
            eventId, category: input.category, amount: input.amount, currency: input.currency, status: input.status, description: input.description ?? null,
            expenseDate: input.expenseDate ?? null, personId: input.personId ?? null, paidAt: paidAtFor(input.status, null), createdById: actorUserId,
        };
        const created = await tx.eventExpense.create({ data, select: EXPENSE_FIELDS });
        await audit(tx, 'EVENT_EXPENSE_CREATED', actorUserId, { id: created.id, after: toLine(created) });
        return toLine(created);
    });
};

interface ExpenseRef { eventId: string; expenseId: string }

export const updateEventExpense = async (ref: ExpenseRef, change: ExpenseChange, actorUserId: string): Promise<ExpenseLine> => {
    const before = await prisma.eventExpense.findFirst({ where: { id: ref.expenseId, eventId: ref.eventId }, select: { ...EXPENSE_FIELDS, paidAt: true } });
    if (!before) throw new ApiError(404, 'EXPENSE_NOT_FOUND', 'Expense not found');
    await requirePayee(change.personId);
    return prisma.$transaction(async tx => {
        const data: Prisma.EventExpenseUncheckedUpdateInput = { ...change, paidAt: paidAtFor(change.status, before.paidAt) };
        const after = await tx.eventExpense.update({ where: { id: ref.expenseId }, data, select: EXPENSE_FIELDS });
        await audit(tx, 'EVENT_EXPENSE_UPDATED', actorUserId, { id: after.id, before: toLine(before), after: toLine(after) });
        return toLine(after);
    });
};

// An expense entered by mistake is removed for good; what it was stays in the audit log.
export const deleteEventExpense = async (ref: ExpenseRef, actorUserId: string): Promise<{ deleted: true }> => {
    const before = await prisma.eventExpense.findFirst({ where: { id: ref.expenseId, eventId: ref.eventId }, select: EXPENSE_FIELDS });
    if (!before) throw new ApiError(404, 'EXPENSE_NOT_FOUND', 'Expense not found');
    return prisma.$transaction(async tx => {
        await tx.eventExpense.delete({ where: { id: ref.expenseId } });
        await audit(tx, 'EVENT_EXPENSE_DELETED', actorUserId, { id: before.id, before: toLine(before), after: { deleted: true } });
        return { deleted: true as const };
    });
};

// Expenses and agreed fees entered on the cards of the event's choreographers. They are managed
// there; here they are shown so the whole cost of the event is in one place.
const loadChoreographerLines = async (eventId: string): Promise<ExpenseLine[]> => {
    const assignment = { select: { person: PERSON } };
    const [costs, fees] = await Promise.all([
        prisma.choreographerCost.findMany({ where: { eventChoreographer: { eventId } }, select: { id: true, type: true, description: true, amount: true, currency: true, status: true, expenseDate: true, eventChoreographer: assignment } }),
        prisma.choreographerFeeAgreement.findMany({ where: { assignment: { eventId }, status: 'AGREED' }, select: { id: true, amount: true, currency: true, assignment } }),
    ]);
    return [
        ...costs.map((cost): ExpenseLine => ({ id: cost.id, source: 'CHOREOGRAPHER_EXPENSE', category: cost.type, description: cost.description, amount: cost.amount.toFixed(2), currency: cost.currency, status: cost.status, date: day(cost.expenseDate), person: cost.eventChoreographer.person })),
        ...fees.map((fee): ExpenseLine => ({ id: fee.id, source: 'CHOREOGRAPHER_FEE', category: 'FEE', description: null, amount: fee.amount.toFixed(2), currency: fee.currency, status: 'PLANNED', date: null, person: fee.assignment.person })),
    ];
};

export const listEventExpenses = async (eventId: string) => {
    await requireEvent(eventId);
    const own = await prisma.eventExpense.findMany({ where: { eventId }, select: EXPENSE_FIELDS, orderBy: [{ expenseDate: 'desc' }, { createdAt: 'desc' }] });
    const lines = [...own.map(toLine), ...await loadChoreographerLines(eventId)];
    return { lines, totals: summariseExpenses(lines) };
};

// What was planned for and paid to one person across all events, from the events' expenses.
export const listPersonExpenses = async (personId: string) => {
    const rows = await prisma.eventExpense.findMany({ where: { personId }, select: EXPENSE_FIELDS, orderBy: [{ expenseDate: 'desc' }, { createdAt: 'desc' }], take: 200 });
    const lines = rows.map(toLine);
    return { lines, totals: summariseExpenses(lines) };
};
