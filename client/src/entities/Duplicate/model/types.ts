interface PersonBrief {
    id: string;
    displayName: string;
    email?: string | null;
    phone?: string | null;
}

export interface DuplicateCandidate {
    id: string;
    score: number;
    reasons: string[];
    personA?: PersonBrief;
    personB?: PersonBrief;
}
