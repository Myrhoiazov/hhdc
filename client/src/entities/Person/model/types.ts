export const PERSON_SOURCES = ['WEEZTIX', 'EMAIL', 'MANUAL', 'IMPORT', 'SYSTEM'] as const;

export type PersonSource = (typeof PERSON_SOURCES)[number];

export interface PeopleFilters {
    q: string;
    role: PersonRole | '';
    source: PersonSource | '';
    purchases: 'yes' | 'no' | '';
}

// Every role a Person can have, in the order the interface lists them.
export const PERSON_ROLES = [
    'CUSTOMER',
    'PARTICIPANT',
    'CHOREOGRAPHER',
    'STAFF',
    'PARTNER',
] as const;

export type PersonRole = (typeof PERSON_ROLES)[number];

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
    country?: string | null;
    source?: string;
    createdAt?: string;
    _count?: { orders: number };
    removal?: PersonRemoval;
}

export type RemovalBlocker =
    | 'WEEZTIX'
    | 'PURCHASES'
    | 'EVENTS'
    | 'FINANCE'
    | 'CHOREOGRAPHER'
    | 'MAILINGS'
    | 'NOT_FROM_EMAIL';

export interface PersonRemoval {
    allowed: boolean;
    blockers: RemovalBlocker[];
}

export interface Activity {
    id: string;
    type: string;
    createdAt: string;
    entityType?: string;
}
