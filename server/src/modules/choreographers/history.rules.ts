// Pure shaping of a choreographer's event history.

export interface HistorySession { id: string; name: string; startAt: Date }
export interface HistoryRow {
    id: string; status: string; roleTitle: string; travelStatus: string; hotelStatus: string; notes: string | null;
    event: { id: string; name: string; status: string; startAt: Date; endAt: Date; city: string | null };
    sessions: HistorySession[];
}
export interface HistoryItem extends HistoryRow { year: number; timing: 'PAST' | 'CURRENT' | 'UPCOMING' }

const timing = (event: HistoryRow['event'], now: Date): HistoryItem['timing'] => {
    if (event.endAt < now) return 'PAST';
    return event.startAt > now ? 'UPCOMING' : 'CURRENT';
};

// The year comes from the event's own start date, never from something typed by hand; newest
// first, and sessions in the order they are taught.
export const toHistory = (rows: HistoryRow[], now: Date): HistoryItem[] => [...rows]
    .sort((a, b) => b.event.startAt.getTime() - a.event.startAt.getTime())
    .map(row => ({
        ...row,
        sessions: [...row.sessions].sort((a, b) => a.startAt.getTime() - b.startAt.getTime()),
        year: row.event.startAt.getUTCFullYear(),
        timing: timing(row.event, now),
    }));
