export const RELATIONSHIP_STATUSES = [
    'NEW',
    'CONTACTED',
    'NEGOTIATING',
    'ACTIVE',
    'RETURNING',
    'INACTIVE',
    'DO_NOT_CONTACT',
] as const;

export type RelationshipStatus = (typeof RELATIONSHIP_STATUSES)[number];

export interface ChoreographerPerson {
    id: string;
    firstName: string;
    lastName: string;
    displayName: string;
    email: string | null;
    phone: string | null;
    country: string | null;
    language: string | null;
    status: string;
}

export interface ChoreographerProfile {
    stageName: string | null;
    bioShort: string | null;
    bioFull: string | null;
    countryCode: string | null;
    city: string | null;
    timezone: string | null;
    relationshipStatus: RelationshipStatus;
    websiteUrl: string | null;
    instagramUrl: string | null;
    tiktokUrl: string | null;
    youtubeUrl: string | null;
    styles: string[];
    languages: string[];
    updatedAt: string;
}

export interface ChoreographerSummary {
    totalAssignments: number;
    lastEventYear: number | null;
    upcomingEvent: { id: string; name: string; startAt: string } | null;
    openTasks?: number;
}

export interface ChoreographerAssignment {
    id: string;
    status: string;
    roleTitle: string;
    event: { id: string; name: string; startAt: string; endAt: string };
}

// coverPhotoId is the photo shown next to the name; null until a photo is uploaded.
export interface ChoreographerListItem {
    person: ChoreographerPerson;
    profile: ChoreographerProfile | null;
    summary: ChoreographerSummary;
    coverPhotoId: string | null;
}

export interface ChoreographerDetail {
    person: ChoreographerPerson;
    profile: ChoreographerProfile;
    summary: ChoreographerSummary;
    coverPhotoId: string | null;
    // Keys of what is still missing from the profile, e.g. "biography".
    checklist: string[];
    assignments: ChoreographerAssignment[];
}

export type ChoreographerProfileInput = Partial<Omit<ChoreographerProfile, 'updatedAt'>>;

export interface ChoreographerFilters {
    q?: string;
    relationshipStatus?: RelationshipStatus | '';
}

export const CHOREOGRAPHER_PAGE_SIZE = 25;
