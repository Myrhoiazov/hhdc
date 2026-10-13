export const DOCUMENT_TYPES = ['CONTRACT', 'INVOICE', 'RIDER', 'TRAVEL', 'HOTEL', 'OTHER'] as const;

export const CONTRACT_STATUSES = [
    'DRAFT',
    'READY',
    'SENT',
    'SIGNED',
    'EXPIRED',
    'CANCELLED',
] as const;

export const INVOICE_STATUSES = [
    'RECEIVED',
    'REVIEWED',
    'APPROVED',
    'PARTIALLY_PAID',
    'PAID',
    'CANCELLED',
    'DISPUTED',
] as const;

export type DocumentKind = (typeof DOCUMENT_TYPES)[number];

export const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024;

// NONE: nothing confirmed. PARTIAL / PAID: from confirmed payments linked to the invoice. MANUAL: someone set a paid label by hand.
export type PaymentEvidence = 'NONE' | 'PARTIAL' | 'PAID' | 'MANUAL';

export interface DocumentVersionInfo {
    version: number;
    originalFilename: string;
    mimeType: string;
    bytes: number;
    createdAt: string;
}

export interface FileDocument {
    id: string;
    type: DocumentKind;
    title: string;
    notes: string | null;
    entityId: string;
    eventId: string | null;
    assignmentId: string | null;
    currentVersion: number;
    archivedAt: string | null;
    createdAt: string;
    event: { id: string; name: string } | null;
    contract: {
        status: string;
        sentAt: string | null;
        signedAt: string | null;
        expiresAt: string | null;
    } | null;
    invoice: {
        status: string;
        invoiceNumber: string | null;
        issuerName: string | null;
        amount: string | null;
        currency: string | null;
        dueDate: string | null;
    } | null;
    paymentEvidence: PaymentEvidence | null;
    versions: DocumentVersionInfo[];
    // Set when another invoice has the same issuer and number.
    duplicateOfDocumentId?: string | null;
}

export interface DocumentUploadInput {
    type: DocumentKind;
    title: string;
    assignmentId?: string;
    contractStatus?: string;
    invoiceNumber?: string;
    issuerName?: string;
    amount?: string;
    currency?: string;
}
