import { useState } from 'react';
import type { CreateEmailAccountPayload } from '@/entities/EmailAccount';

const emptyForm: CreateEmailAccountPayload = {
    label: '', imapHost: '', imapPort: 993, imapSecure: true,
    smtpHost: '', smtpPort: 465, smtpSecure: true, username: '',
    password: '', trashFolder: '', spamFolder: '',
};

export const useEmailAccountForm = (onCreate: (payload: CreateEmailAccountPayload) => Promise<string | undefined>) => {
    const [form, setForm] = useState<CreateEmailAccountPayload>(emptyForm);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string>();

    const setField = <Key extends keyof CreateEmailAccountPayload>(field: Key) => (value: string) => {
        setForm((previous) => ({
            ...previous,
            [field]: field === 'imapPort' || field === 'smtpPort' ? Number(value) || 0 : value,
        }));
    };

    const setSecure = (field: 'imapSecure' | 'smtpSecure') => (value: boolean) => {
        setForm((previous) => ({ ...previous, [field]: value }));
    };

    const onSubmit = async () => {
        setError(undefined);
        setIsSaving(true);
        const errorMessage = await onCreate(form);
        setIsSaving(false);
        if (errorMessage) {
            setError(errorMessage);
        } else {
            setForm(emptyForm);
        }
    };

    return { form, isSaving, error, setField, setSecure, onSubmit };
};
