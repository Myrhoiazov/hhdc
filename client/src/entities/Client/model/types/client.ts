export interface ClientBranch {
    id: number;
    name: string;
    city?: string | null;
    address?: string | null;
    isActive?: boolean;
}

export interface ClientDanceGroup {
    id: number;
    name: string;
    style?: string;
    level?: string;
    branchId?: number | null;
}

export type ClientLanguage = 'EN' | 'NL' | 'RU';

export const CLIENT_LANGUAGE_LABELS: Record<ClientLanguage, string> = {
    EN: 'Английский',
    NL: 'Нидерландский',
    RU: 'Русский',
};

export const CLIENT_LANGUAGE_OPTIONS: Array<{ value: ClientLanguage; content: string }> = [
    { value: 'RU', content: CLIENT_LANGUAGE_LABELS.RU },
    { value: 'EN', content: CLIENT_LANGUAGE_LABELS.EN },
    { value: 'NL', content: CLIENT_LANGUAGE_LABELS.NL },
];

export interface Client {
    id?: string;
    firstName?: string;
    lastName?: string;
    birthday?: string;
    phoneNumber?: string
    email?: string
    branchId?: number | string | null
    branch?: ClientBranch | null
    groupMemberships?: Array<{
        groupId: number;
        group: ClientDanceGroup;
    }>
    anamnesis?: string
    description?: string
    social?: string
    image_3d?: boolean
    document?: boolean
    preferredLanguage?: ClientLanguage
    image?: File | string;
    createdAt?: string
    mollieLinks?: Array<{
        customerId: number;
        isPrimary?: boolean;
    }>
}

export enum ClientView {
    BIG = 'BIG',
    SMALL = 'SMALL',
}

export interface ServerError {
    status: number;
    message?: string;
}
