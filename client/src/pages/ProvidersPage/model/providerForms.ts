export type FieldTarget = 'credentials' | 'settings';

export interface ProviderField {
    name: string;
    label: string;
    target: FieldTarget;
    input: 'text' | 'password' | 'email' | 'url' | 'number' | 'checkbox' | 'textarea';
    required?: boolean;
    defaultValue?: string | number | boolean;
}

export interface ProviderForm {
    provider: string;
    type: string;
    label: string;
    hint?: string;
    // Types the server can verify become CONNECTED by passing the check; the rest are trusted.
    verified: boolean;
    fields: ProviderField[];
}

const credential = (
    name: string,
    label: string,
    input: ProviderField['input'] = 'password'
): ProviderField => ({ name, label, target: 'credentials', input, required: true });

const setting = (
    name: string,
    label: string,
    input: ProviderField['input'],
    extra: Partial<ProviderField> = {}
): ProviderField => ({ name, label, target: 'settings', input, ...extra });

// What recipients see as the sender instead of the bare address.
const SENDER_NAME_FIELD: ProviderField = setting('senderName', 'Sender name', 'text');

// Added to every email sent from the mailbox, under the text of the reply.
const FOOTER_FIELD: ProviderField = setting('signatureHtml', 'Email footer (HTML)', 'textarea');

const MAILBOX_FIELDS: ProviderField[] = [
    credential('username', 'Mailbox address', 'email'),
    credential('password', 'Password'),
    setting('imapHost', 'IMAP host', 'text', { required: true }),
    setting('imapPort', 'IMAP port', 'number', { required: true, defaultValue: 993 }),
    setting('imapSecure', 'IMAP over TLS', 'checkbox', { defaultValue: true }),
    setting('smtpHost', 'SMTP host', 'text', { required: true }),
    setting('smtpPort', 'SMTP port', 'number', { required: true, defaultValue: 465 }),
    setting('smtpSecure', 'SMTP over TLS', 'checkbox', { defaultValue: true }),
    setting('sender', 'Sender address (optional)', 'email'),
    SENDER_NAME_FIELD,
    FOOTER_FIELD,
];

const AI_MODEL_FIELDS: ProviderField[] = [
    setting('model', 'Model', 'text', { required: true }),
    setting('embeddingModel', 'Embedding model (optional)', 'text'),
];

export const PROVIDER_FORMS: ProviderForm[] = [
    {
        provider: 'IMAP',
        type: 'EMAIL',
        label: 'Mailbox (IMAP / SMTP)',
        verified: true,
        hint: 'Use the mailbox login and password. Gmail and other providers with two-step verification need an app password.',
        fields: MAILBOX_FIELDS,
    },
    {
        provider: 'GMAIL',
        type: 'EMAIL',
        label: 'Gmail API (OAuth)',
        verified: true,
        hint: 'Requires an OAuth client and a refresh token issued for the mailbox.',
        fields: [
            credential('clientId', 'OAuth client ID', 'text'),
            credential('clientSecret', 'OAuth client secret'),
            credential('refreshToken', 'Refresh token'),
            setting('sender', 'Sender address', 'email', { required: true }),
            SENDER_NAME_FIELD,
            FOOTER_FIELD,
        ],
    },
    {
        provider: 'OPENAI',
        type: 'AI',
        label: 'OpenAI',
        verified: false,
        fields: [credential('apiKey', 'API key'), ...AI_MODEL_FIELDS],
    },
    {
        provider: 'OLLAMA',
        type: 'AI',
        label: 'Ollama',
        verified: false,
        fields: [credential('baseUrl', 'Server URL', 'url'), ...AI_MODEL_FIELDS],
    },
    {
        provider: 'MOLLIE',
        type: 'PAYMENT',
        label: 'Mollie',
        verified: true,
        fields: [credential('apiKey', 'API key')],
    },
];

export const providerFormFor = (provider: string): ProviderForm | undefined =>
    PROVIDER_FORMS.find((form) => form.provider === provider);
