export type ProviderSettings = Record<string, string | number | boolean | undefined>;

export interface ProviderConnection {
    id: string;
    name: string;
    type: string;
    provider: string;
    status: string;
    settings: ProviderSettings;
    lastSyncAt?: string | null;
    lastSuccessAt?: string | null;
    lastError?: string | null;
    // The AI provider chosen to write answers and drafts.
    activeForGeneration?: boolean;
}

export interface ProviderInput {
    name: string;
    type: string;
    provider: string;
    status?: string;
    credentials?: Record<string, string>;
    settings?: ProviderSettings;
}

export interface ProviderTestResult {
    success: boolean;
    error: string | null;
    provider: ProviderConnection;
}

export interface EmailSyncSummary {
    created: number;
    skipped: number;
    failed: number;
}

// Weeztix is connected by approving access in Weeztix itself; no secret is ever typed into the CRM.
export interface WeeztixAuthorization {
    url: string;
    redirectUri: string;
    state: string;
}

export interface WeeztixCheckResult {
    success: boolean;
    error: string | null;
    account: { name: string; email: string } | null;
    provider: ProviderConnection;
}

// Buyers of Weeztix orders become people. A preview reads Weeztix and writes nothing.
export interface WeeztixContactsResult {
    dryRun: boolean;
    orders: number;
    contacts: number;
    created: number;
    linked: number;
    known: number;
    ambiguous: number;
    failed: number;
}

export interface WeeztixCatalogResult {
    events: number;
    created: number;
    updated: number;
    unchanged: number;
    ticketTypes: number;
    coupons: number;
    unreadable: number;
    failed: number;
}

export interface WeeztixSalesResult {
    catalog: WeeztixCatalogResult;
    sales: {
        orders: number;
        created: number;
        updated: number;
        unchanged: number;
        tickets: number;
        registrations: number;
        newPeople: number;
        withoutBuyer: number;
        unreadable: number;
        failed: number;
        firstError: string | null;
    };
}

// One run of a sync: when it ran, what it read and why it failed.
export interface SyncRun {
    id: string;
    type: string;
    status: string;
    startedAt: string;
    finishedAt: string | null;
    createdCount: number;
    updatedCount: number;
    skippedCount: number;
    failedCount: number;
    errorSummary: string | null;
    metadata: { scope?: string };
}
