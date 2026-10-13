// Why a conversation is on the profile: the person's own thread, or linked by staff with a reason.
export type ConversationProvenance = 'direct_person_email' | 'manual_link';

export interface ChoreographerThread {
    id: string;
    subject: string;
    status: string;
    lastMessageAt: string;
    event: { id: string; name: string } | null;
    person: { id: string; displayName: string; email: string | null } | null;
    latestMessage: {
        direction: string;
        sender: string;
        recipient: string;
        preview: string;
        createdAt: string;
    } | null;
    provenance?: ConversationProvenance;
    link?: { id: string; note: string | null; createdAt: string } | null;
}

export interface ChoreographerThreads {
    data: ChoreographerThread[];
    candidates: ChoreographerThread[];
    total: number;
}
