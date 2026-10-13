export interface Campaign {
    id: string;
    name: string;
    status: string;
    segment?: { name: string };
}

export interface CampaignPreview {
    recipients: number;
    byLanguage: Record<string, number>;
    excluded: { noConsent: number; missingEmail: number };
}
