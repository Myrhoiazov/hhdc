export interface DuplicateSubject { id: string; firstName: string; lastName: string; email: string | null; phone: string | null }

export const normalizeEmail = (email: string | null) => email?.trim().toLowerCase() || null;
export const normalizePhone = (phone: string | null) => {
    const digits = phone?.replace(/\D/g, '').replace(/^00/, '') ?? '';
    return digits.length >= 7 ? digits : null;
};
const normalizeName = (person: DuplicateSubject) => `${person.firstName} ${person.lastName}`.trim().toLowerCase().replace(/\s+/g, ' ');

const SIGNALS: { reason: string; weight: number; matches: (a: DuplicateSubject, b: DuplicateSubject) => boolean }[] = [
    { reason: 'SAME_EMAIL', weight: 0.6, matches: (a, b) => Boolean(normalizeEmail(a.email)) && normalizeEmail(a.email) === normalizeEmail(b.email) },
    { reason: 'SAME_PHONE', weight: 0.3, matches: (a, b) => Boolean(normalizePhone(a.phone)) && normalizePhone(a.phone) === normalizePhone(b.phone) },
    { reason: 'SAME_NAME', weight: 0.2, matches: (a, b) => normalizeName(a).length > 2 && normalizeName(a) === normalizeName(b) },
];

// Scores only SUGGEST duplicates. Nothing here merges anyone: a human always decides.
export const scoreDuplicate = (a: DuplicateSubject, b: DuplicateSubject) => {
    const matched = SIGNALS.filter(signal => signal.matches(a, b));
    return { score: Math.min(1, Number(matched.reduce((total, signal) => total + signal.weight, 0).toFixed(2))), reasons: matched.map(signal => signal.reason) };
};

export const MIN_CANDIDATE_SCORE = 0.3;

// Candidate pairs are stored in a stable order so (A,B) and (B,A) are the same record.
export const orderedPair = (a: string, b: string): [string, string] => (a < b ? [a, b] : [b, a]);

const bucket = <T,>(people: T[], key: (person: T) => string | null) => {
    const buckets = new Map<string, T[]>();
    for (const person of people) {
        const value = key(person);
        if (value) buckets.set(value, [...(buckets.get(value) ?? []), person]);
    }
    return [...buckets.values()].filter(group => group.length > 1);
};

export const findDuplicatePairs = (people: DuplicateSubject[]) => {
    const pairs = new Map<string, { personAId: string; personBId: string; score: number; reasons: string[] }>();
    const groups = [...bucket(people, person => normalizeEmail(person.email)), ...bucket(people, person => normalizePhone(person.phone))];
    for (const group of groups) {
        for (let i = 0; i < group.length; i += 1) {
            for (let j = i + 1; j < group.length; j += 1) {
                const [personAId, personBId] = orderedPair(group[i].id, group[j].id);
                const result = scoreDuplicate(group[i], group[j]);
                if (result.score >= MIN_CANDIDATE_SCORE) pairs.set(`${personAId}:${personBId}`, { personAId, personBId, ...result });
            }
        }
    }
    return [...pairs.values()];
};

export const MERGE_FIELDS = ['firstName', 'lastName', 'email', 'phone', 'birthDate', 'language', 'country', 'notes'] as const;
export type MergeField = typeof MERGE_FIELDS[number];
export type FieldDecisions = Partial<Record<MergeField, 'source' | 'target'>>;

// Target values win by default; the human picks, field by field, what to take from the source.
export const planFieldUpdates = (source: Record<string, unknown>, decisions: FieldDecisions) => {
    const updates: Record<string, unknown> = {};
    for (const field of MERGE_FIELDS) if (decisions[field] === 'source') updates[field] = source[field];
    return updates;
};
