import { useCallback, useEffect, useState } from 'react';
import { composeEmail, ProviderConnection } from '@/entities/crm';

export interface ComposeFields {
    providerId: string;
    recipient: string;
    subject: string;
    content: string;
}

interface ComposeEmailFormParams {
    providers: ProviderConnection[];
    preferredProviderId: string;
    // Filled in when the letter is started from a person's page.
    recipient?: string;
    onSent: () => void;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Returns the translation key of the first problem, or an empty string for a sendable letter.
export const validateCompose = (fields: ComposeFields): string => {
    const required = [fields.providerId, fields.recipient, fields.subject, fields.content];
    if (required.some((value) => !value.trim())) return 'Fill in the sender, recipient, subject and message';
    return EMAIL_PATTERN.test(fields.recipient.trim()) ? '' : 'Enter a valid email address';
};

const sendComposed = (fields: ComposeFields, files: File[]) => composeEmail({
    providerConnectionId: fields.providerId,
    recipient: fields.recipient.trim(),
    subject: fields.subject.trim(),
    content: fields.content.trim(),
}, files);

export const useComposeEmailForm = ({ providers, preferredProviderId, recipient = '', onSent }: ComposeEmailFormParams) => {
    const defaultProviderId = preferredProviderId || providers[0]?.id || '';
    const [fields, setFields] = useState<ComposeFields>({ providerId: defaultProviderId, recipient, subject: '', content: '' });
    const [files, setFiles] = useState<File[]>([]);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    // Mailboxes load after the page mounts, so the sender is chosen once they arrive.
    useEffect(() => {
        if (defaultProviderId) setFields((previous) => (previous.providerId ? previous : { ...previous, providerId: defaultProviderId }));
    }, [defaultProviderId]);

    const setField = useCallback((name: keyof ComposeFields, value: string) => {
        setFields((previous) => ({ ...previous, [name]: value }));
    }, []);

    const submit = useCallback(async () => {
        const problem = validateCompose(fields);
        if (problem) { setError(problem); return; }
        setBusy(true); setError('');
        try {
            await sendComposed(fields, files);
            setFiles([]);
            setFields({ providerId: fields.providerId, recipient, subject: '', content: '' });
            onSent();
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'Request failed');
        } finally { setBusy(false); }
    }, [fields, files, recipient, onSent]);

    return { fields, files, error, busy, setField, setFiles, submit };
};
