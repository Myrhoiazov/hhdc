export type PayerRelation = 'unknown' | 'self' | 'parent' | 'guardian' | 'other';

export const getStudentName = (client?: {
    id?: string | number;
    firstName?: string;
    lastName?: string;
    email?: string;
} | null) => (
    [client?.firstName, client?.lastName].filter(Boolean).join(' ')
    || client?.email
    || (client?.id ? `Ученик #${client.id}` : 'Ученик')
);
