export const ASSIGNMENT_STATUSES = ['INVITED', 'CONFIRMED', 'CANCELLED', 'COMPLETED'] as const;

export const LOGISTICS_STATUSES = ['NOT_REQUIRED', 'PENDING', 'BOOKED', 'CANCELLED'] as const;

export type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number];

export type LogisticsStatus = (typeof LOGISTICS_STATUSES)[number];

export interface ChoreographerHistoryItem {
    id: string;
    status: AssignmentStatus;
    roleTitle: string;
    travelStatus: LogisticsStatus;
    hotelStatus: LogisticsStatus;
    notes: string | null;
    year: number;
    timing: 'PAST' | 'CURRENT' | 'UPCOMING';
    event: {
        id: string;
        name: string;
        status: string;
        startAt: string;
        endAt: string;
        city: string | null;
    };
    sessions: { id: string; name: string; startAt: string }[];
}

export interface AssignmentUpdate {
    roleTitle?: string;
    status?: AssignmentStatus;
    travelStatus?: LogisticsStatus;
    hotelStatus?: LogisticsStatus;
    notes?: string;
}
