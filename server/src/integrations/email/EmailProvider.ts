export interface SendEmailInput {
    sender: string;
    recipient: string;
    subject: string;
    content: string;
    threadId?: string;
    replyToMessageId?: string;
    messageId?: string;
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
}

export interface EmailProvider {
    testConnection(): Promise<{ success: boolean }>;
    syncMessages(cursor?: string): Promise<{ messages: NormalizedEmail[]; cursor?: string }>;
    sendMessage(input: SendEmailInput): Promise<{ externalId: string; threadId?: string }>;
}
