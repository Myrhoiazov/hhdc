import { Person } from '@/entities/Person/@x/event';

export const EVENT_STATUSES = [
    'DRAFT',
    'PUBLISHED',
    'ACTIVE',
    'COMPLETED',
    'CANCELLED',
    'ARCHIVED',
] as const;

export interface EventFilters {
    q: string;
    status: (typeof EVENT_STATUSES)[number] | '';
    period: 'upcoming' | 'past' | '';
}

export interface TicketType {
    id: string;
    name: string;
    description: string | null;
    price: string;
    currency: string;
    status: string;
    availableFrom: string | null;
    availableUntil: string | null;
    soldCount: number;
}

export interface SalesLine {
    name: string;
    tickets: number;
    revenue: string;
}

export interface EventSales {
    currency: string;
    tickets: number;
    withdrawn: number;
    orders: number;
    buyers: number;
    revenue: string;
    discount: string;
    byType: SalesLine[];
    byMonth: SalesLine[];
    coupons: { name: string; tickets: number; discount: string }[];
}

export interface Event {
    id: string;
    name: string;
    slug: string;
    status: string;
    startAt: string;
    endAt: string;
    timezone: string;
    venueName?: string | null;
    city?: string | null;
    capacity?: number | null;
    _count?: { tickets: number; registrations: number };
    registrations?: { id: string; status: string; person: Person }[];
    choreographers?: { id: string; status: string; person: Person; roleTitle: string }[];
}
