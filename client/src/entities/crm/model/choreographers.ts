import { $apiPrivate } from '@/shared/api/api';
import { PageResult } from './types';

export const RELATIONSHIP_STATUSES = ['NEW', 'CONTACTED', 'NEGOTIATING', 'ACTIVE', 'RETURNING', 'INACTIVE', 'DO_NOT_CONTACT'] as const;
export type RelationshipStatus = typeof RELATIONSHIP_STATUSES[number];

export interface ChoreographerPerson {
    id: string; firstName: string; lastName: string; displayName: string; email: string | null; phone: string | null;
    country: string | null; language: string | null; status: string;
}
export interface ChoreographerProfile {
    stageName: string | null; bioShort: string | null; bioFull: string | null; countryCode: string | null; city: string | null;
    timezone: string | null; relationshipStatus: RelationshipStatus; websiteUrl: string | null; instagramUrl: string | null;
    tiktokUrl: string | null; youtubeUrl: string | null; styles: string[]; languages: string[]; updatedAt: string;
}
export interface ChoreographerSummary {
    totalAssignments: number; lastEventYear: number | null; upcomingEvent: { id: string; name: string; startAt: string } | null; openTasks?: number;
}
export interface ChoreographerAssignment { id: string; status: string; roleTitle: string; event: { id: string; name: string; startAt: string; endAt: string } }
// coverPhotoId is the photo shown next to the name; null until a photo is uploaded.
export interface ChoreographerListItem { person: ChoreographerPerson; profile: ChoreographerProfile | null; summary: ChoreographerSummary; coverPhotoId: string | null }
export interface ChoreographerDetail {
    person: ChoreographerPerson; profile: ChoreographerProfile; summary: ChoreographerSummary; coverPhotoId: string | null;
    // Keys of what is still missing from the profile, e.g. "biography".
    checklist: string[];
    assignments: ChoreographerAssignment[];
}
export type ChoreographerProfileInput = Partial<Omit<ChoreographerProfile, 'updatedAt'>>;
export interface ChoreographerFilters { q?: string; relationshipStatus?: RelationshipStatus | '' }

export const CHOREOGRAPHER_PAGE_SIZE = 25;

export const listChoreographers = async (filters: ChoreographerFilters = {}, page = 1): Promise<PageResult<ChoreographerListItem>> => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(CHOREOGRAPHER_PAGE_SIZE) });
    if (filters.q?.trim()) params.set('q', filters.q.trim());
    if (filters.relationshipStatus) params.set('relationshipStatus', filters.relationshipStatus);
    const result = (await $apiPrivate.get<{ data: ChoreographerListItem[]; meta: { total: number } }>(`/choreographers?${params}`)).data;
    return { data: result.data, total: result.meta.total };
};
export const getChoreographer = async (personId: string) => (await $apiPrivate.get<{ data: ChoreographerDetail }>(`/choreographers/${personId}`)).data.data;
// Turns an existing person into a choreographer; calling it again for the same person is harmless.
export const createChoreographer = async (personId: string, profile: ChoreographerProfileInput = {}) =>
    (await $apiPrivate.post<{ data: ChoreographerDetail }>('/choreographers', { personId, ...profile })).data.data;
export const updateChoreographer = async (personId: string, profile: ChoreographerProfileInput) =>
    (await $apiPrivate.patch<{ data: ChoreographerDetail }>(`/choreographers/${personId}`, profile)).data.data;

const base = (personId: string) => `/choreographers/${personId}`;
const data = async <T,>(request: Promise<{ data: { data: T } }>) => (await request).data.data;

export const BIO_KINDS = ['SHORT', 'FULL', 'PROMO'] as const;
export type BioKind = typeof BIO_KINDS[number];
export interface BioVersion { id: string; locale: string; kind: BioKind; content: string; version: number; isCurrent: boolean; createdAt: string }
export const listBioVersions = async (personId: string) => data<BioVersion[]>($apiPrivate.get(`${base(personId)}/biographies`));
// Versions are immutable: saving adds the next version of that language and kind.
export const addBioVersion = async (personId: string, input: { locale: string; kind: BioKind; content: string }) =>
    data<BioVersion>($apiPrivate.post(`${base(personId)}/biographies`, input));

export const CONTACT_KINDS = ['SELF_SECONDARY', 'MANAGER', 'AGENT', 'ASSISTANT', 'ACCOUNTING', 'OTHER'] as const;
export type ContactKind = typeof CONTACT_KINDS[number];
export interface ChoreographerContact {
    id: string; kind: ContactKind; name: string | null; organization: string | null; email: string | null; phone: string | null;
    preferredChannel: string | null; isPrimary: boolean; isActive: boolean; validFrom: string | null; validTo: string | null; notes: string | null;
}
export type ChoreographerContactInput = Partial<Omit<ChoreographerContact, 'id'>> & { kind: ContactKind };
export const listChoreographerContacts = async (personId: string) => data<ChoreographerContact[]>($apiPrivate.get(`${base(personId)}/contacts`));
export const createChoreographerContact = async (personId: string, input: ChoreographerContactInput) =>
    data<ChoreographerContact>($apiPrivate.post(`${base(personId)}/contacts`, input));
export const updateChoreographerContact = async (personId: string, contactId: string, input: Partial<ChoreographerContactInput>) =>
    data<ChoreographerContact>($apiPrivate.patch(`${base(personId)}/contacts/${contactId}`, input));
// Deactivates instead of deleting: a former manager stays on record.
export const deactivateChoreographerContact = async (personId: string, contactId: string) =>
    data<ChoreographerContact>($apiPrivate.delete(`${base(personId)}/contacts/${contactId}`));

export const MEDIA_RIGHTS = ['UNKNOWN', 'PERMITTED', 'RESTRICTED'] as const;
export type MediaRights = typeof MEDIA_RIGHTS[number];
export const MAX_CHOREOGRAPHER_PHOTOS = 10;
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
export interface ChoreographerPhoto {
    id: string; position: number; isCover: boolean; caption: string | null; credit: string | null;
    rightsStatus: MediaRights; rightsNotes: string | null; width: number; height: number;
}
export interface PhotoDetails { caption?: string; credit?: string; rightsStatus?: MediaRights; rightsNotes?: string }
export const listChoreographerPhotos = async (personId: string) => data<ChoreographerPhoto[]>($apiPrivate.get(`${base(personId)}/media`));
export const uploadChoreographerPhoto = async (personId: string, file: File, details: PhotoDetails = {}) => {
    const form = new FormData();
    form.append('file', file);
    Object.entries(details).forEach(([name, value]) => { if (value) form.append(name, value); });
    return data<ChoreographerPhoto>($apiPrivate.post(`${base(personId)}/media`, form));
};
export const updateChoreographerPhoto = async (personId: string, mediaId: string, input: PhotoDetails & { isCover?: true }) =>
    data<ChoreographerPhoto>($apiPrivate.patch(`${base(personId)}/media/${mediaId}`, input));
export const reorderChoreographerPhotos = async (personId: string, ids: string[]) =>
    data<ChoreographerPhoto[]>($apiPrivate.patch(`${base(personId)}/media/reorder`, { ids }));
export const removeChoreographerPhoto = async (personId: string, mediaId: string) => { await $apiPrivate.delete(`${base(personId)}/media/${mediaId}`); };
// Photos are private: they are fetched with the staff session and shown from memory, never by a public URL.
export const fetchChoreographerPhoto = async (personId: string, mediaId: string, variant: 'thumb' | 'display' = 'thumb'): Promise<Blob> =>
    (await $apiPrivate.get<Blob>(`${base(personId)}/media/${mediaId}/file?variant=${variant}`, { responseType: 'blob' })).data;

export const ASSIGNMENT_STATUSES = ['INVITED', 'CONFIRMED', 'CANCELLED', 'COMPLETED'] as const;
export const LOGISTICS_STATUSES = ['NOT_REQUIRED', 'PENDING', 'BOOKED', 'CANCELLED'] as const;
export type AssignmentStatus = typeof ASSIGNMENT_STATUSES[number];
export type LogisticsStatus = typeof LOGISTICS_STATUSES[number];
export interface ChoreographerHistoryItem {
    id: string; status: AssignmentStatus; roleTitle: string; travelStatus: LogisticsStatus; hotelStatus: LogisticsStatus; notes: string | null;
    year: number; timing: 'PAST' | 'CURRENT' | 'UPCOMING';
    event: { id: string; name: string; status: string; startAt: string; endAt: string; city: string | null };
    sessions: { id: string; name: string; startAt: string }[];
}
export interface AssignmentUpdate { roleTitle?: string; status?: AssignmentStatus; travelStatus?: LogisticsStatus; hotelStatus?: LogisticsStatus; notes?: string }
export const listChoreographerHistory = async (personId: string) => data<ChoreographerHistoryItem[]>($apiPrivate.get(`${base(personId)}/events`));
// The event must already exist under Events; this works for past editions as well as upcoming ones.
export const assignChoreographerToEvent = async (personId: string, input: { eventId: string; roleTitle?: string; status?: AssignmentStatus }) =>
    data<{ id: string }>($apiPrivate.post(`${base(personId)}/events`, input));
export const updateChoreographerAssignment = async (personId: string, assignmentId: string, input: AssignmentUpdate) =>
    data<{ id: string }>($apiPrivate.patch(`${base(personId)}/events/${assignmentId}`, input));

export const FEE_STATUSES = ['PROPOSED', 'COUNTERED', 'AGREED'] as const;
export const EXPENSE_CATEGORIES = ['TRAVEL', 'HOTEL', 'PER_DIEM', 'TRANSFER', 'EQUIPMENT', 'OTHER'] as const;
export const EXPENSE_PAYERS = ['ORGANIZER', 'CHOREOGRAPHER', 'OTHER'] as const;
export const PAYOUT_TYPES = ['ADVANCE', 'FEE', 'REIMBURSEMENT', 'OTHER'] as const;
export type PayoutStatus = 'PLANNED' | 'PENDING' | 'CONFIRMED' | 'FAILED' | 'CANCELLED';

// Money arrives as decimal strings, one block per currency: currencies are never added together.
export interface CurrencyTotals {
    currency: string; agreedFee: string | null; estimatedExpenses: string; actualExpenses: string;
    confirmedPayments: string; outstandingFee: string | null; organizerTotalCost: string;
}
export interface FeeAgreement { id: string; status: string; amount: string; currency: string; feeBasis: string; scopeDescription: string | null; notes: string | null; createdAt: string }
export interface ChoreographerExpense {
    id: string; type: string; description: string | null; currency: string; estimatedAmount: string | null; actualAmount: string | null;
    paidBy: string; reimbursable: boolean; status: string; expenseDate: string | null;
}
export interface PayoutRecord { id: string; type: string; amount: string; currency: string; status: PayoutStatus; paymentDate: string | null; reference: string | null }
export interface FinanceAssignment {
    id: string; roleTitle: string; status: string; year: number; event: { id: string; name: string; startAt: string };
    agreements: FeeAgreement[]; expenses: ChoreographerExpense[]; payments: PayoutRecord[]; totals: CurrencyTotals[];
}
export interface ChoreographerFinance { assignments: FinanceAssignment[]; years: { year: number; totals: CurrencyTotals[] }[] }

const ledger = '/choreographer-assignments';
export const getChoreographerFinance = async (personId: string) => data<ChoreographerFinance>($apiPrivate.get(`${base(personId)}/finance`));
export const recordFeeAgreement = async (assignmentId: string, input: { status: string; amount: string; currency: string; notes?: string }) =>
    data<FeeAgreement>($apiPrivate.post(`${ledger}/${assignmentId}/fee-agreements`, input));
export const cancelFeeAgreement = async (agreementId: string) => data<FeeAgreement>($apiPrivate.post(`${ledger}/fee-agreements/${agreementId}/cancel`));
export interface ExpenseInput { category: string; currency: string; estimatedAmount?: string | null; actualAmount?: string | null; paidBy: string; reimbursable: boolean; description?: string }
export const recordChoreographerExpense = async (assignmentId: string, input: ExpenseInput) => data<ChoreographerExpense>($apiPrivate.post(`${ledger}/${assignmentId}/expenses`, input));
export const cancelChoreographerExpense = async (expenseId: string) => data<ChoreographerExpense>($apiPrivate.post(`${ledger}/expenses/${expenseId}/cancel`));
export const recordPayout = async (assignmentId: string, input: { type: string; amount: string; currency: string; status: 'PLANNED' | 'PENDING'; reference?: string }) =>
    data<PayoutRecord>($apiPrivate.post(`${ledger}/${assignmentId}/payments`, input));
// Recording a payment never moves money; confirming one states that it reached the choreographer.
export const movePayout = async (paymentId: string, status: PayoutStatus) => data<PayoutRecord>($apiPrivate.post(`${ledger}/payments/${paymentId}/status`, { status }));

export const DOCUMENT_TYPES = ['CONTRACT', 'INVOICE', 'RIDER', 'TRAVEL', 'HOTEL', 'OTHER'] as const;
export const CONTRACT_STATUSES = ['DRAFT', 'READY', 'SENT', 'SIGNED', 'EXPIRED', 'CANCELLED'] as const;
export const INVOICE_STATUSES = ['RECEIVED', 'REVIEWED', 'APPROVED', 'PARTIALLY_PAID', 'PAID', 'CANCELLED', 'DISPUTED'] as const;
export type DocumentKind = typeof DOCUMENT_TYPES[number];
export const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024;
// NONE: nothing confirmed. PARTIAL / PAID: from confirmed payments linked to the invoice. MANUAL: someone set a paid label by hand.
export type PaymentEvidence = 'NONE' | 'PARTIAL' | 'PAID' | 'MANUAL';
export interface DocumentVersionInfo { version: number; originalFilename: string; mimeType: string; bytes: number; createdAt: string }
export interface FileDocument {
    id: string; type: DocumentKind; title: string; notes: string | null; entityId: string; eventId: string | null; assignmentId: string | null;
    currentVersion: number; archivedAt: string | null; createdAt: string; event: { id: string; name: string } | null;
    contract: { status: string; sentAt: string | null; signedAt: string | null; expiresAt: string | null } | null;
    invoice: { status: string; invoiceNumber: string | null; issuerName: string | null; amount: string | null; currency: string | null; dueDate: string | null } | null;
    paymentEvidence: PaymentEvidence | null;
    versions: DocumentVersionInfo[];
    // Set when another invoice has the same issuer and number.
    duplicateOfDocumentId?: string | null;
}
export interface DocumentUploadInput {
    type: DocumentKind; title: string; assignmentId?: string; contractStatus?: string;
    invoiceNumber?: string; issuerName?: string; amount?: string; currency?: string;
}
export const listChoreographerDocuments = async (personId: string) => data<FileDocument[]>($apiPrivate.get(`${base(personId)}/documents`));
export const listEventDocuments = async (eventId: string) => data<FileDocument[]>($apiPrivate.get(`/documents/by-event/${eventId}`));
const fileForm = (file: File, fields: Record<string, string | undefined> = {}) => {
    const form = new FormData();
    form.append('file', file);
    Object.entries(fields).forEach(([name, value]) => { if (value) form.append(name, value); });
    return form;
};
export const uploadChoreographerDocument = async (personId: string, file: File, input: DocumentUploadInput) =>
    data<FileDocument>($apiPrivate.post(`${base(personId)}/documents`, fileForm(file, { ...input })));
// Replacing a file adds a version; earlier versions stay available.
export const uploadDocumentVersion = async (documentId: string, file: File) => data<FileDocument>($apiPrivate.post(`/documents/${documentId}/versions`, fileForm(file)));
export const updateDocumentMetadata = async (documentId: string, input: { contractStatus?: string; invoiceStatus?: string; archived?: boolean }) =>
    data<FileDocument>($apiPrivate.patch(`/documents/${documentId}/metadata`, input));
// Documents are private: the file is fetched with the staff session, never linked by a public URL.
export const fetchDocumentFile = async (documentId: string, version?: number): Promise<Blob> =>
    (await $apiPrivate.get<Blob>(`/documents/${documentId}/download${version ? `?version=${version}` : ''}`, { responseType: 'blob' })).data;

// Why a conversation is on the profile: the person's own thread, or linked by staff with a reason.
export type ConversationProvenance = 'direct_person_email' | 'manual_link';
export interface ChoreographerThread {
    id: string; subject: string; status: string; lastMessageAt: string;
    event: { id: string; name: string } | null; person: { id: string; displayName: string; email: string | null } | null;
    latestMessage: { direction: string; sender: string; recipient: string; preview: string; createdAt: string } | null;
    provenance?: ConversationProvenance;
    link?: { id: string; note: string | null; createdAt: string } | null;
}
export interface ChoreographerThreads { data: ChoreographerThread[]; candidates: ChoreographerThread[]; total: number }
export const listChoreographerThreads = async (personId: string, q = '', page = 1): Promise<ChoreographerThreads> => {
    const params = new URLSearchParams({ page: String(page) });
    if (q.trim()) params.set('q', q.trim());
    const result = (await $apiPrivate.get<{ data: ChoreographerThread[]; candidates: ChoreographerThread[]; meta: { total: number } }>(`${base(personId)}/conversations?${params}`)).data;
    return { data: result.data, candidates: result.candidates, total: result.meta.total };
};
// A link is always explicit and carries the reason; the conversation itself is not changed.
export const linkChoreographerThread = async (personId: string, conversationId: string, note: string) =>
    data<{ id: string }>($apiPrivate.post(`${base(personId)}/conversations/${conversationId}/link`, { note }));
export const unlinkChoreographerThread = async (personId: string, conversationId: string, note: string) =>
    data<{ unlinked: boolean }>($apiPrivate.delete(`${base(personId)}/conversations/${conversationId}/link`, { data: { note } }));

export interface ChoreographerActivityItem { id: string; type: string; entityType: string; createdAt: string; actor: string | null; event: { id: string; name: string } | null }
export interface ChoreographerActivityPage { data: ChoreographerActivityItem[]; nextBefore: string | null }
export const listChoreographerActivity = async (personId: string, filters: { type?: string; before?: string } = {}) => {
    const params = new URLSearchParams();
    if (filters.type) params.set('type', filters.type);
    if (filters.before) params.set('before', filters.before);
    return data<ChoreographerActivityPage>($apiPrivate.get(`${base(personId)}/activity?${params}`));
};

// Internal notes: staff only, never shown outside the CRM.
export interface ChoreographerNote { id: string; content: string; isPinned: boolean; createdAt: string; updatedAt: string; createdByName: string | null }
export const listChoreographerNotes = async (personId: string) => data<ChoreographerNote[]>($apiPrivate.get(`${base(personId)}/notes`));
export const addChoreographerNote = async (personId: string, content: string, isPinned = false) => data<ChoreographerNote>($apiPrivate.post(`${base(personId)}/notes`, { content, isPinned }));
export const updateChoreographerNote = async (personId: string, noteId: string, input: { content?: string; isPinned?: boolean }) =>
    data<ChoreographerNote>($apiPrivate.patch(`${base(personId)}/notes/${noteId}`, input));
export const removeChoreographerNote = async (personId: string, noteId: string) => data<{ deleted: boolean }>($apiPrivate.delete(`${base(personId)}/notes/${noteId}`));

// Follow-ups are ordinary tasks tied to the choreographer; they also show up in Operations.
export const TASK_PRIORITIES = ['LOW', 'NORMAL', 'HIGH'] as const;
export interface ChoreographerTask { id: string; title: string; description: string | null; status: string; priority: string; dueDate: string | null; assignee: { id: string; name: string } | null }
export const listChoreographerTasks = async (personId: string) => data<ChoreographerTask[]>($apiPrivate.get(`${base(personId)}/tasks`));
export const addChoreographerTask = async (personId: string, input: { title: string; dueDate?: string | null; priority?: string }) =>
    data<ChoreographerTask>($apiPrivate.post(`${base(personId)}/tasks`, input));
