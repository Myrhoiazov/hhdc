export interface EmailAttachment {
    filename: string;
    contentType: string;
    content: Buffer;
}

export interface SendEmailInput {
    sender: string;
    // Display name of the sender; without it mail clients show the part of the address before @.
    senderName?: string;
    recipient: string;
    subject: string;
    content: string;
    // HTML version of the body; when present the email is sent as text + HTML alternatives.
    html?: string;
    threadId?: string;
    replyToMessageId?: string;
    messageId?: string;
    attachments?: EmailAttachment[];
}

export interface NormalizedEmail {
    externalId: string;
    threadId: string;
    sender: string;
    recipient: string;
    subject: string;
    bodyText: string;
    receivedAt: Date;
    messageId?: string;
    // Reply-To, only when it names someone other than the sender (e.g. a website contact form).
    replyTo?: string;
    bodyHtml?: string;
    // Opaque provider reference used for remote mailbox operations (for example an IMAP UID).
    providerRef?: string;
    // Read state in the mailbox itself, so a message already read there is not shown as unread here.
    isRead?: boolean;
}

export type EmailDisposition = 'SPAM' | 'TRASH';

export interface RemoteEmailRef {
    externalId: string;
    threadId?: string;
    providerRef?: string;
}

export interface EmailSyncPage {
    messages: NormalizedEmail[];
    // Opaque resume point. It is persisted between runs, so it must stay valid indefinitely.
    cursor?: string;
    // Messages the provider returned but that could not be normalized (no usable sender, etc.).
    skipped?: number;
}

export interface EmailProvider {
    testConnection(): Promise<{ success: boolean }>;
    syncMessages(cursor?: string): Promise<EmailSyncPage>;
    sendMessage(input: SendEmailInput): Promise<{ externalId: string; threadId?: string }>;
    applyDisposition(messages: RemoteEmailRef[], disposition: EmailDisposition): Promise<void>;
    // Mirrors the CRM read state back into the mailbox (\Seen flag / UNREAD label).
    markRead(messages: RemoteEmailRef[]): Promise<void>;
}

// Who the message is really from, for CRM matching and replies.
export const contactAddress = (email: Pick<NormalizedEmail, 'sender' | 'replyTo'>): string =>
    (email.replyTo ?? email.sender).toLowerCase();
