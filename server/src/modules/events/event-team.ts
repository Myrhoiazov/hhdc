import { Prisma } from '@prisma/client';
import { z } from 'zod';
import prisma from '../../../prisma/prisma-client';
import { ApiError } from '../../common/http';
import { expenseAmount, paidAtFor, summariseExpenses } from '../finance/event-expenses';
import { requireEvent } from './events.service';

// The team of an event: who works on it besides the choreographers, in which role, and what they
// do. A person may hold several roles on one event. What a role is paid is not kept here — it is
// the expenses of the event that name the role, so the pay is counted once in every report.

// The role a person gets in the CRM when joining a team: a staff member or an outside partner.
export const TEAM_PERSON_ROLES = ['STAFF', 'PARTNER'] as const;
export type TeamPersonRole = typeof TEAM_PERSON_ROLES[number];

const note = z.string().trim().max(2000).nullable().optional();
const fields = { roleTitle: z.string().trim().min(1, 'Name the role on the event').max(120), duties: note, notes: note };

export const teamMemberSchema = z.object({
    ...fields,
    personId: z.string().uuid(),
    personRole: z.enum(TEAM_PERSON_ROLES).default('STAFF'),
    // What the role is paid: becomes a planned salary among the expenses of the event.
    amount: expenseAmount.optional(),
    currency: z.string().trim().length(3).toUpperCase().default('EUR'),
}).strict();
export const teamMemberChangeSchema = z.object(fields).partial().strict();
export type TeamMemberInput = z.infer<typeof teamMemberSchema>;
export type TeamMemberChange = z.infer<typeof teamMemberChangeSchema>;

export interface TeamPay { total: string; paid: string; planned: string; currency: string }
export interface TeamMemberLine {
    id: string; roleTitle: string; duties: string | null; notes: string | null;
    person: { id: string; displayName: string; email: string | null; phone: string | null };
    pay?: TeamPay;
}

// Who asks: money is shown to, and entered by, only those who may see finance.
export interface TeamActor { userId: string; seesMoney: boolean }
interface HistoryInput { type: string; entityType: string; entityId: string; personId?: string; eventId?: string }
export type RecordHistory = (tx: Prisma.TransactionClient, input: HistoryInput) => Promise<void>;
export interface TeamMemberRef { eventId: string; memberId: string }

// Somebody already known as staff or as a partner keeps that role; anybody else gets the one chosen.
export const roleToGrant = (current: string[], wanted: TeamPersonRole): TeamPersonRole | null =>
    (current.some(role => (TEAM_PERSON_ROLES as readonly string[]).includes(role)) ? null : wanted);

// What a role costs the event: every expense that names it, the cancelled ones left out.
export const payOf = (expenses: { amount: { toString(): string }; currency: string; status: string }[]): TeamPay => {
    const totals = summariseExpenses(expenses.map(expense => ({ category: 'SALARY', amount: expense.amount.toString(), status: expense.status })));
    return { total: totals.total, paid: totals.paid, planned: totals.planned, currency: expenses[0]?.currency ?? 'EUR' };
};

const MEMBER_FIELDS = {
    id: true, roleTitle: true, duties: true, notes: true,
    person: { select: { id: true, displayName: true, email: true, phone: true } },
    expenses: { select: { amount: true, currency: true, status: true } },
} as const;
type MemberRow = Prisma.EventTeamMemberGetPayload<{ select: typeof MEMBER_FIELDS }>;

const toLine = (row: MemberRow, seesMoney: boolean): TeamMemberLine => ({
    id: row.id, roleTitle: row.roleTitle, duties: row.duties, notes: row.notes, person: row.person,
    ...(seesMoney ? { pay: payOf(row.expenses) } : {}),
});

export const listEventTeam = async (eventId: string, seesMoney: boolean): Promise<TeamMemberLine[]> => {
    await requireEvent(eventId);
    const rows = await prisma.eventTeamMember.findMany({ where: { eventId }, select: MEMBER_FIELDS, orderBy: [{ createdAt: 'asc' }] });
    return rows.map(row => toLine(row, seesMoney));
};

// The roles one person held on events, for the page of that person.
export const listPersonTeamRoles = async (personId: string) => prisma.eventTeamMember.findMany({
    where: { personId }, orderBy: [{ event: { startAt: 'desc' } }], take: 200,
    select: { id: true, roleTitle: true, duties: true, event: { select: { id: true, name: true, startAt: true } } },
});

const isTaken = (cause: unknown): boolean => cause instanceof Prisma.PrismaClientKnownRequestError && cause.code === 'P2002';
const taken = () => new ApiError(409, 'TEAM_ROLE_TAKEN', 'This person already holds this role on the event');

const currentRoles = async (personId: string): Promise<string[]> => {
    const person = await prisma.person.findUnique({ where: { id: personId }, select: { roles: { select: { role: true } } } });
    if (!person) throw new ApiError(400, 'PERSON_NOT_FOUND', 'The person does not exist');
    return person.roles.map(item => item.role);
};

const grantRole = async (tx: Prisma.TransactionClient, personId: string, role: TeamPersonRole | null, record: RecordHistory) => {
    if (!role) return;
    await tx.personRole.upsert({ where: { personId_role: { personId, role } }, create: { personId, role }, update: {} });
    await record(tx, { type: 'ROLE_ADDED', entityType: 'Person', entityId: personId, personId });
};

interface PlannedPay { eventId: string; teamMemberId: string; personId: string; input: TeamMemberInput; actorUserId: string }

const planPay = async (tx: Prisma.TransactionClient, pay: PlannedPay) => {
    if (!pay.input.amount) return;
    const expense = await tx.eventExpense.create({ data: {
        eventId: pay.eventId, teamMemberId: pay.teamMemberId, personId: pay.personId, category: 'SALARY',
        amount: pay.input.amount, currency: pay.input.currency, status: 'PLANNED', paidAt: paidAtFor('PLANNED', null), createdById: pay.actorUserId,
    } });
    const after = { category: 'SALARY', amount: expense.amount.toFixed(2), currency: expense.currency, status: 'PLANNED', teamMemberId: pay.teamMemberId };
    await tx.auditLog.create({ data: { actorUserId: pay.actorUserId, action: 'EVENT_EXPENSE_CREATED', entityType: 'EventExpense', entityId: expense.id, after } });
};

export const addTeamMember = async (eventId: string, input: TeamMemberInput, actor: TeamActor, record: RecordHistory): Promise<TeamMemberLine> => {
    await requireEvent(eventId);
    if (input.amount && !actor.seesMoney) throw new ApiError(403, 'FORBIDDEN', 'Entering pay needs the right to see finance');
    const role = roleToGrant(await currentRoles(input.personId), input.personRole);
    try {
        return await prisma.$transaction(async tx => {
            const data = { eventId, personId: input.personId, roleTitle: input.roleTitle, duties: input.duties || null, notes: input.notes || null };
            const created = await tx.eventTeamMember.create({ data, select: { id: true } });
            await grantRole(tx, input.personId, role, record);
            await planPay(tx, { eventId, teamMemberId: created.id, personId: input.personId, input, actorUserId: actor.userId });
            await record(tx, { type: 'TEAM_MEMBER_ADDED', entityType: 'EventTeamMember', entityId: created.id, personId: input.personId, eventId });
            return toLine(await tx.eventTeamMember.findUniqueOrThrow({ where: { id: created.id }, select: MEMBER_FIELDS }), actor.seesMoney);
        });
    } catch (cause) {
        throw isTaken(cause) ? taken() : cause;
    }
};

const requireMember = async (ref: TeamMemberRef) => {
    const member = await prisma.eventTeamMember.findFirst({ where: { id: ref.memberId, eventId: ref.eventId }, select: { id: true, personId: true } });
    if (!member) throw new ApiError(404, 'TEAM_MEMBER_NOT_FOUND', 'This person is not in the team of the event');
    return member;
};

export const updateTeamMember = async (ref: TeamMemberRef, change: TeamMemberChange, actor: TeamActor, record: RecordHistory): Promise<TeamMemberLine> => {
    const member = await requireMember(ref);
    try {
        return await prisma.$transaction(async tx => {
            const after = await tx.eventTeamMember.update({ where: { id: member.id }, data: change, select: MEMBER_FIELDS });
            await record(tx, { type: 'TEAM_MEMBER_UPDATED', entityType: 'EventTeamMember', entityId: member.id, personId: member.personId, eventId: ref.eventId });
            return toLine(after, actor.seesMoney);
        });
    } catch (cause) {
        throw isTaken(cause) ? taken() : cause;
    }
};

// The role leaves the team; what was planned for and paid to it stays among the expenses of the
// event, still naming the person.
export const removeTeamMember = async (ref: TeamMemberRef, record: RecordHistory): Promise<{ deleted: true }> => {
    const member = await requireMember(ref);
    return prisma.$transaction(async tx => {
        await tx.eventTeamMember.delete({ where: { id: member.id } });
        await record(tx, { type: 'TEAM_MEMBER_REMOVED', entityType: 'EventTeamMember', entityId: member.id, personId: member.personId, eventId: ref.eventId });
        return { deleted: true as const };
    });
};
