import { z } from 'zod';
import prisma from '../../../prisma/prisma-client';
import { eventFinancialOverview } from '../finance/finance.service';
import { allowedKnowledgeVisibility } from '../knowledge/visibility';
import { retrieveKnowledge } from '../knowledge/service';

// Read-only CRM tools for the assistant (ADR 0016). Each tool names the permission it needs;
// the assistant only ever sees tools the asking user is permitted to use. No tool accepts SQL.
export interface AiTool {
    name: string;
    description: string;
    permission: string;
    args: z.ZodTypeAny;
    run: (args: any, permissions: string[]) => Promise<unknown>;
}

const TAKE = 10;
const search = z.object({ query: z.string().trim().max(200).default('') }).strict();
const byId = z.object({ id: z.string().uuid() }).strict();
const byEvent = z.object({ eventId: z.string().uuid().optional(), status: z.string().max(40).optional() }).strict();
const contains = (query: string) => ({ contains: query, mode: 'insensitive' as const });
const personSummary = { id: true, displayName: true, email: true, language: true, country: true, status: true };

const searchPeople = ({ query }: z.infer<typeof search>) => prisma.person.findMany({
    where: { status: 'ACTIVE', OR: [{ displayName: contains(query) }, { email: contains(query) }] }, select: personSummary, take: TAKE,
});
const searchEvents = ({ query }: z.infer<typeof search>) => prisma.event.findMany({
    where: { name: contains(query) }, select: { id: true, name: true, status: true, startAt: true, endAt: true, capacity: true }, orderBy: { startAt: 'desc' }, take: TAKE,
});
const eventDetails = async ({ id }: z.infer<typeof byId>) => {
    const [event, registrations] = await Promise.all([
        prisma.event.findUnique({ where: { id }, select: { id: true, name: true, status: true, startAt: true, endAt: true, capacity: true, _count: { select: { sessions: true, choreographers: true } } } }),
        prisma.registration.groupBy({ by: ['status'], where: { eventId: id }, _count: true }),
    ]);
    return { event, registrationsByStatus: registrations.map(row => ({ status: row.status, count: row._count })) };
};
const searchRegistrations = async ({ eventId, status }: z.infer<typeof byEvent>) => {
    const where = { eventId, status: status as never };
    const [total, sample] = await Promise.all([
        prisma.registration.count({ where }),
        prisma.registration.findMany({ where, take: TAKE, select: { id: true, status: true, person: { select: { id: true, displayName: true } } } }),
    ]);
    return { total, sample };
};
const searchChoreographers = ({ eventId, status }: z.infer<typeof byEvent>) => prisma.eventChoreographer.findMany({
    where: { eventId, status: status as never }, take: TAKE,
    select: { id: true, status: true, travelStatus: true, hotelStatus: true, roleTitle: true, person: { select: { id: true, displayName: true } }, event: { select: { id: true, name: true } } },
});
const searchSessions = async ({ eventId }: z.infer<typeof byEvent>) => {
    const sessions = await prisma.eventSession.findMany({ where: { eventId }, take: 50, orderBy: { startAt: 'asc' }, select: { id: true, name: true, startAt: true, capacity: true, _count: { select: { attendance: true } } } });
    return sessions.map(session => ({ id: session.id, name: session.name, startAt: session.startAt, capacity: session.capacity, attendance: session._count.attendance }));
};

export const AI_TOOLS: AiTool[] = [
    { name: 'search_people', description: 'Find people by name or email', permission: 'people.read', args: search, run: searchPeople },
    { name: 'get_person', description: 'Get one person with roles and tags', permission: 'people.read', args: byId, run: ({ id }) => prisma.person.findUnique({ where: { id }, select: { ...personSummary, roles: { select: { role: true } }, tags: { select: { tag: { select: { name: true } } } } } }) },
    { name: 'search_events', description: 'Find events by name', permission: 'events.read', args: search, run: searchEvents },
    { name: 'get_event', description: 'Get an event with registration counts by status', permission: 'events.read', args: byId, run: eventDetails },
    { name: 'search_registrations', description: 'Count and sample registrations by event and status', permission: 'events.read', args: byEvent, run: searchRegistrations },
    { name: 'search_sessions', description: 'List event sessions with capacity and attendance', permission: 'events.read', args: byEvent, run: searchSessions },
    { name: 'search_choreographers', description: 'List choreographer assignments with travel/hotel status', permission: 'events.read', args: byEvent, run: searchChoreographers },
    { name: 'search_orders', description: 'List orders by event and status', permission: 'ticketing.read', args: byEvent, run: ({ eventId, status }) => prisma.order.findMany({ where: { eventId, status: status as never }, take: TAKE, orderBy: { orderedAt: 'desc' }, select: { id: true, status: true, total: true, currency: true, orderedAt: true } }) },
    { name: 'search_tickets', description: 'List tickets by event and status', permission: 'ticketing.read', args: byEvent, run: ({ eventId, status }) => prisma.ticket.findMany({ where: { eventId, status: status as never }, take: TAKE, select: { id: true, status: true, ticketType: true } }) },
    { name: 'search_conversations', description: 'Find conversations by subject', permission: 'communications.read', args: search, run: ({ query }) => prisma.conversation.findMany({ where: { subject: contains(query) }, take: TAKE, orderBy: { lastMessageAt: 'desc' }, select: { id: true, subject: true, status: true, priority: true, lastMessageAt: true } }) },
    { name: 'search_tasks', description: 'Find tasks by title', permission: 'tasks.read', args: search, run: ({ query }) => prisma.task.findMany({ where: { title: contains(query) }, take: TAKE, orderBy: { createdAt: 'desc' }, select: { id: true, title: true, status: true, priority: true, dueDate: true } }) },
    { name: 'get_event_financial_summary', description: 'Revenue, refunds, costs and estimated margin of an event', permission: 'finance.read', args: byId, run: ({ id }) => eventFinancialOverview(id) },
    { name: 'search_knowledge', description: 'Search the knowledge base', permission: 'knowledge.read', args: search, run: ({ query }, permissions) => retrieveKnowledge(query, null, allowedKnowledgeVisibility(permissions)) },
];

// RBAC boundary: a tool the user is not permitted to use does not exist for that request.
export const availableTools = (permissions: string[], tools: AiTool[] = AI_TOOLS) => tools.filter(tool => permissions.includes(tool.permission));

export const runTool = async (name: string, rawArgs: unknown, permissions: string[]) => {
    const tool = availableTools(permissions).find(candidate => candidate.name === name);
    if (!tool) throw new Error(`Tool ${name} is not available`);
    return tool.run(tool.args.parse(rawArgs ?? {}), permissions);
};
