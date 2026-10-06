interface EmailAddress {
    address?: string;
    name?: string;
}

interface EmailMessageClient {
    id: number;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
}

export interface EmailAttachment {
    id: number;
    filename: string;
    mimeType: string;
    sizeBytes: number;
}

export interface EmailMessage {
    id: number;
    mailboxId: number;
    imapUid: number | null;
    messageId: string | null;
    inReplyToMessageId: string | null;
    isOutgoing: boolean;
    fromAddress: string;
    fromName: string | null;
    // Reply-To when it differs from From (e.g. the visitor behind a website contact form);
    // replies go here when it is set.
    replyToAddress?: string | null;
    toAddresses: EmailAddress[];
    ccAddresses: EmailAddress[] | null;
    subject: string | null;
    // Only present on a single-message fetch (getMessage) — the list endpoint (listMessages)
    // omits these to avoid shipping full email bodies in every page of results.
    bodyText?: string | null;
    bodyHtml?: string | null;
    receivedAt: string;
    isRead: boolean;
    clientId: number | null;
    client: EmailMessageClient | null;
    attachments: EmailAttachment[];
    createdAt: string;
}

export interface EmailMessagesFilter {
    mailboxId?: number;
    clientId?: number;
    page?: number;
    limit?: number;
    search?: string;
}

export interface EmailMessagesPage {
    items: EmailMessage[];
    total: number;
}

export interface SendEmailPayload {
    accountId: number;
    to: string[];
    cc?: string[];
    subject: string;
    html: string;
    files?: File[];
}
