import { useEffect, useState } from 'react';
import { EmailAccount } from '@/entities/EmailAccount';
import { EmailComposerSendPayload, SendEmailPayload } from '@/entities/EmailMessage';

interface UseComposeEmailFormParams {
    isOpen: boolean;
    accounts: EmailAccount[];
    onSend: (payload: SendEmailPayload) => Promise<boolean>;
    onClose: () => void;
}

export const useComposeEmailForm = ({ isOpen, accounts, onSend, onClose }: UseComposeEmailFormParams) => {
    const [accountId, setAccountId] = useState<string>(String(accounts[0]?.id ?? ''));
    const [to, setTo] = useState('');
    const [subject, setSubject] = useState('');
    const [error, setError] = useState<string>();

    // `accounts` is almost always still empty when this component first mounts
    // (it loads async), so the useState initializer above locks in an empty
    // accountId that a subsequent accounts-load never revisits. Re-sync it each
    // time the modal is opened, once real accounts are available.
    useEffect(() => {
        if (isOpen && !accountId && accounts.length) {
            setAccountId(String(accounts[0].id));
        }
    }, [isOpen, accounts, accountId]);

    const onComposerSend = async ({ html, files }: EmailComposerSendPayload) => {
        setError(undefined);

        if (!accountId || !to.trim() || !subject.trim()) {
            setError('Заполните ящик-отправитель, получателя и тему письма');
            return false;
        }

        const ok = await onSend({
            accountId: Number(accountId),
            to: to.split(',').map((address) => address.trim()).filter(Boolean),
            subject,
            html,
            files,
        });

        if (ok) {
            setTo('');
            setSubject('');
            onClose();
        } else {
            setError('Не удалось отправить письмо');
        }

        return ok;
    };

    return { accountId, to, subject, error, setAccountId, setTo, setSubject, onComposerSend };
};