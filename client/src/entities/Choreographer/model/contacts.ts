export const CONTACT_KINDS = [
    'SELF_SECONDARY',
    'MANAGER',
    'AGENT',
    'ASSISTANT',
    'ACCOUNTING',
    'OTHER',
] as const;

export type ContactKind = (typeof CONTACT_KINDS)[number];

export interface ChoreographerContact {
    id: string;
    kind: ContactKind;
    name: string | null;
    organization: string | null;
    email: string | null;
    phone: string | null;
    preferredChannel: string | null;
    isPrimary: boolean;
    isActive: boolean;
    validFrom: string | null;
    validTo: string | null;
    notes: string | null;
}

export type ChoreographerContactInput = Partial<Omit<ChoreographerContact, 'id'>> & {
    kind: ContactKind;
};
