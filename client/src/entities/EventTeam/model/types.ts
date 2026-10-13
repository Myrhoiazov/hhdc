// The team of an event: who works on it besides the choreographers. `pay` is what the role costs
// the event, summed from its expenses; it comes only to those who may see finance.
export const TEAM_PERSON_ROLES = ['STAFF', 'PARTNER'] as const;

export type TeamPersonRole = (typeof TEAM_PERSON_ROLES)[number];

export interface TeamPay {
    total: string;
    paid: string;
    planned: string;
    currency: string;
}

export interface TeamMember {
    id: string;
    roleTitle: string;
    duties: string | null;
    notes: string | null;
    person: { id: string; displayName: string; email: string | null; phone: string | null };
    pay?: TeamPay;
}

export interface TeamMemberInput {
    personId: string;
    roleTitle: string;
    duties?: string | null;
    notes?: string | null;
    personRole: TeamPersonRole;
    amount?: string;
}

export type TeamMemberChange = Partial<Pick<TeamMemberInput, 'roleTitle' | 'duties' | 'notes'>>;

export interface PersonTeamRole {
    id: string;
    roleTitle: string;
    duties: string | null;
    event: { id: string; name: string; startAt: string };
}
