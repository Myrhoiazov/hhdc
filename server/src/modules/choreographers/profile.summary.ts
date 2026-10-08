// Pure read-model helpers for the choreographer profile: no database access, so the rules
// behind the header chips and the checklist can be tested directly.

export interface AssignmentEvent { id: string; name: string; startAt: Date; endAt: Date }
export interface AssignmentLike { id: string; status: string; roleTitle: string; event: AssignmentEvent }

export interface ChoreographerSummary {
    totalAssignments: number;
    lastEventYear: number | null;
    upcomingEvent: { id: string; name: string; startAt: Date } | null;
}

const COUNTED = (assignment: AssignmentLike) => assignment.status !== 'CANCELLED';

// "Last event" is the most recent one that has already started; "upcoming" the nearest that has
// not ended yet. Cancelled assignments do not count as collaborations.
export const summarizeAssignments = (assignments: AssignmentLike[], now: Date): ChoreographerSummary => {
    const active = assignments.filter(COUNTED);
    const past = active.filter(item => item.event.startAt <= now).sort((a, b) => b.event.startAt.getTime() - a.event.startAt.getTime());
    const upcoming = active.filter(item => item.event.endAt >= now).sort((a, b) => a.event.startAt.getTime() - b.event.startAt.getTime())[0];
    return {
        totalAssignments: active.length,
        lastEventYear: past.length ? past[0].event.startAt.getUTCFullYear() : null,
        upcomingEvent: upcoming ? { id: upcoming.event.id, name: upcoming.event.name, startAt: upcoming.event.startAt } : null,
    };
};

export interface ChecklistProfile {
    stageName: string | null; bioShort: string | null; bioFull: string | null; countryCode: string | null;
    instagramUrl: string | null; websiteUrl: string | null; styles: string[];
}

// What is still missing before the profile is usable for an event announcement.
export const profileChecklist = (profile: ChecklistProfile, person: { email: string | null }): string[] => [
    profile.stageName ? null : 'stage_name',
    profile.bioShort || profile.bioFull ? null : 'biography',
    profile.styles.length ? null : 'styles',
    profile.countryCode ? null : 'country',
    profile.instagramUrl || profile.websiteUrl ? null : 'social_link',
    person.email ? null : 'email',
].filter((item): item is string => item !== null);
