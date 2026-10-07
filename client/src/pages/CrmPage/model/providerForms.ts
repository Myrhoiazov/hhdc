import type { ProviderInput, ProviderSettings } from '@/entities/crm';

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

const credential = (name: string, label: string, input: ProviderField['input'] = 'password'): ProviderField =>
    ({ name, label, target: 'credentials', input, required: true });
const setting = (name: string, label: string, input: ProviderField['input'], extra: Partial<ProviderField> = {}): ProviderField =>
    ({ name, label, target: 'settings', input, ...extra });

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
    { provider: 'OPENAI', type: 'AI', label: 'OpenAI', verified: false, fields: [credential('apiKey', 'API key'), ...AI_MODEL_FIELDS] },
    { provider: 'OLLAMA', type: 'AI', label: 'Ollama', verified: false, fields: [credential('baseUrl', 'Server URL', 'url'), ...AI_MODEL_FIELDS] },
    { provider: 'MOLLIE', type: 'PAYMENT', label: 'Mollie', verified: true, fields: [credential('apiKey', 'API key')] },
];

export const providerFormFor = (provider: string): ProviderForm | undefined =>
    PROVIDER_FORMS.find((form) => form.provider === provider);

type FormValues = Record<string, FormDataEntryValue | null | undefined>;

const fieldValue = (field: ProviderField, raw: FormDataEntryValue | null | undefined): string | number | boolean | undefined => {
    if (field.input === 'checkbox') return raw === 'on';
    const text = typeof raw === 'string' ? raw.trim() : '';
    // An emptied footer is sent as empty text, otherwise the saved one could never be removed.
    if (!text) return field.input === 'textarea' && typeof raw === 'string' ? '' : undefined;
    return field.input === 'number' ? Number(text) : text;
};

const collect = (form: ProviderForm, target: FieldTarget, values: FormValues): ProviderSettings => {
    const result: ProviderSettings = {};
    form.fields.filter((field) => field.target === target).forEach((field) => {
        const value = fieldValue(field, values[field.name]);
        if (value !== undefined) result[field.name] = value;
    });
    return result;
};

// Saved secrets are never sent back to the browser, so when editing they are either left
// untouched (all blank) or replaced as a complete set.
const credentialsFrom = (form: ProviderForm, values: FormValues, editing: boolean): Record<string, string> | undefined => {
    const filled = collect(form, 'credentials', values);
    if (editing && Object.keys(filled).length === 0) return undefined;
    const required = form.fields.filter((field) => field.target === 'credentials' && field.required);
    if (required.some((field) => filled[field.name] === undefined)) {
        throw new Error('Fill in every credential field to replace the saved credentials');
    }
    return Object.fromEntries(Object.entries(filled).map(([key, value]) => [key, String(value)]));
};

export const buildProviderInput = (form: ProviderForm, values: FormValues, editing = false): Partial<ProviderInput> => {
    const input: Partial<ProviderInput> = { name: String(values.name ?? '').trim(), settings: collect(form, 'settings', values) };
    const credentials = credentialsFrom(form, values, editing);
    if (credentials) input.credentials = credentials;
    if (editing) return input;
    return { ...input, type: form.type, provider: form.provider, ...(form.verified ? {} : { status: 'CONNECTED' }) };
};
