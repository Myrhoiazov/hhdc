import prisma from '../../../prisma/prisma-client';
import { ApiError } from '../../common/http';
import { eventFinancialOverview } from '../finance/finance.service';

const rate = (part: number, whole: number) => (whole ? Number((part / whole).toFixed(4)) : null);
const breakdown = (rows: { key: string | null; count: number }[]) =>
    rows.map(row => ({ key: row.key ?? 'unknown', count: row.count })).sort((a, b) => b.count - a.count).slice(0, 20);

const participantBreakdown = async (eventId: string) => {
    const where = { registrations: { some: { eventId } } };
    const [countries, languages] = await Promise.all([
        prisma.person.groupBy({ by: ['country'], where, _count: true }),
        prisma.person.groupBy({ by: ['language'], where, _count: true }),
    ]);
    return {
        countries: breakdown(countries.map(row => ({ key: row.country, count: row._count }))),
        languages: breakdown(languages.map(row => ({ key: row.language, count: row._count }))),
    };
};

// "Repeat participant" = registered for this event and for at least one other event.
const repeatParticipants = (eventId: string) =>
    prisma.person.count({ where: { AND: [{ registrations: { some: { eventId } } }, { registrations: { some: { eventId: { not: eventId } } } }] } });

const sessionAttendance = async (eventId: string) => {
    const sessions = await prisma.eventSession.findMany({ where: { eventId }, orderBy: { startAt: 'asc' }, take: 200, select: { id: true, name: true, capacity: true, _count: { select: { attendance: true } } } });
    return sessions.map(session => ({ id: session.id, name: session.name, capacity: session.capacity, attendance: session._count.attendance }));
};

export const eventAnalytics = async (eventId: string, includeFinance: boolean) => {
    const event = await prisma.event.findUnique({ where: { id: eventId }, select: { id: true, name: true } });
    if (!event) throw new ApiError(404, 'EVENT_NOT_FOUND', 'Event not found');
    const [byStatus, ticketsSold, openConversations, people, repeat, sessions] = await Promise.all([
        prisma.registration.groupBy({ by: ['status'], where: { eventId }, _count: true }),
        prisma.ticket.count({ where: { eventId, status: { in: ['VALID', 'USED'] } } }),
        prisma.conversation.count({ where: { eventId, status: 'OPEN' } }),
        participantBreakdown(eventId), repeatParticipants(eventId), sessionAttendance(eventId),
    ]);
    const count = (status: string) => byStatus.find(row => row.status === status)?._count ?? 0;
    const participants = byStatus.reduce((total, row) => total + (row.status === 'CANCELLED' ? 0 : row._count), 0);
    return {
        event, ticketsSold, participants, repeatParticipants: repeat, openConversations,
        checkInRate: rate(count('CHECKED_IN'), participants), noShowRate: rate(count('NO_SHOW'), participants),
        ...people, sessions,
        // Finance figures are only included for users who may read finance.
        finance: includeFinance ? await eventFinancialOverview(eventId) : null,
    };
};
