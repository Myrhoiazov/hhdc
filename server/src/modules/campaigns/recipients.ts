export interface RecipientCandidate {
    id: string;
    email: string | null;
    language: string | null;
    consents: { type: string; status: string; withdrawnAt: Date | null }[];
}

export interface ResolvedRecipient { personId: string; destination: string; language: string }

export interface RecipientResolution {
    recipients: ResolvedRecipient[];
    byLanguage: Record<string, number>;
    excluded: { noConsent: number; missingEmail: number };
}

export const MARKETING_EMAIL_CONSENT = 'MARKETING_EMAIL';

export const hasMarketingConsent = (candidate: RecipientCandidate) =>
    candidate.consents.some(consent => consent.type === MARKETING_EMAIL_CONSENT && consent.status === 'GRANTED' && !consent.withdrawnAt);

const countByLanguage = (recipients: ResolvedRecipient[]) => {
    const counts: Record<string, number> = {};
    for (const recipient of recipients) counts[recipient.language] = (counts[recipient.language] ?? 0) + 1;
    return counts;
};

// Bulk campaigns are opt-in: a person without an active MARKETING_EMAIL consent is excluded.
export const resolveRecipients = (candidates: RecipientCandidate[]): RecipientResolution => {
    const withEmail = candidates.filter(candidate => Boolean(candidate.email));
    const consenting = withEmail.filter(hasMarketingConsent);
    const recipients = consenting.map(candidate => ({
        personId: candidate.id,
        destination: candidate.email as string,
        language: candidate.language ?? 'unknown',
    }));
    return {
        recipients,
        byLanguage: countByLanguage(recipients),
        excluded: { noConsent: withEmail.length - consenting.length, missingEmail: candidates.length - withEmail.length },
    };
};
