// Pure rules for the Emails and Activity tabs of a choreographer profile.

export type Provenance = 'direct_person_email' | 'manual_link';

export interface ThreadLike { id: string; personId: string | null }
export interface LinkLike { conversationId: string; linkReason: string }

// Why a conversation is on this profile. A thread that is the person's own always says so, even
// if someone also linked it by hand.
export const provenanceOf = (thread: ThreadLike, personId: string): Provenance => (thread.personId === personId ? 'direct_person_email' : 'manual_link');

export interface ContactLike { kind: string; email: string | null; isActive: boolean }

// Addresses that are the choreographer's own: only those may suggest a thread as a candidate.
// A manager's or agency's address represents other people too, so it never suggests anything.
export const ownAddresses = (contacts: ContactLike[]): string[] => Array.from(new Set(contacts
    .filter(contact => contact.kind === 'SELF_SECONDARY' && contact.isActive && contact.email)
    .map(contact => (contact.email as string).toLowerCase())));

const FINANCE_PREFIXES = ['CHOREOGRAPHER_FEE_', 'CHOREOGRAPHER_EXPENSE_', 'CHOREOGRAPHER_PAYMENT_'];
const DOCUMENT_PREFIX = 'DOCUMENT_';

// The activity timeline is filtered by what the reader may know exists: finance entries need the
// finance permission and document entries the document permission.
export const canSeeActivity = (type: string, permissions: string[]): boolean => {
    if (FINANCE_PREFIXES.some(prefix => type.startsWith(prefix))) return permissions.includes('choreographers.finance.read');
    if (type.startsWith(DOCUMENT_PREFIX)) return permissions.includes('documents.read');
    return true;
};

// Activity types hidden from a reader, as prefixes for the database query.
export const hiddenActivityPrefixes = (permissions: string[]): string[] => [
    ...(permissions.includes('choreographers.finance.read') ? [] : FINANCE_PREFIXES),
    ...(permissions.includes('documents.read') ? [] : [DOCUMENT_PREFIX]),
];
