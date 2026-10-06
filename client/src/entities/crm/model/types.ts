export type PersonRole = 'CUSTOMER' | 'PARTICIPANT' | 'CHOREOGRAPHER' | 'STAFF';
export interface Person {
    id: string;
    firstName: string;
    lastName: string;
    displayName?: string;
    email?: string | null;
    phone?: string | null;
    notes?: string | null;
    status: 'ACTIVE' | 'ARCHIVED';
    roles: { role: PersonRole }[];
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
    registrations?: { id: string; status: string; person: Person }[];
    choreographers?: { id: string; status: string; person: Person; roleTitle: string }[];
}
export interface Activity {
    id: string;
    type: string;
    createdAt: string;
    entityType?: string;
}
export interface PageResult<T> { data: T[]; total: number }
