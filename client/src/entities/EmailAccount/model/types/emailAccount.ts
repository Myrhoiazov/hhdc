export interface EmailAccount {
    id: number;
    label: string;
    imapHost: string;
    imapPort: number;
    imapSecure: boolean;
    smtpHost: string;
    smtpPort: number;
    smtpSecure: boolean;
    username: string;
    isActive: boolean;
    trashFolder: string;
    spamFolder: string;
    lastSyncedAt: string | null;
    createdAt: string;
}

export interface CreateEmailAccountPayload {
    label: string;
    imapHost: string;
    imapPort: number;
    imapSecure: boolean;
    smtpHost: string;
    smtpPort: number;
    smtpSecure: boolean;
    username: string;
    password: string;
    trashFolder?: string;
    spamFolder?: string;
}

export interface EmailSyncResult {
    created: number;
    updated: number;
    skipped: number;
    errors: number;
}
