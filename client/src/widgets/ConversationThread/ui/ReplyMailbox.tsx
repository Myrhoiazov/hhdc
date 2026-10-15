import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { ProviderConnection } from '@/entities/Provider';
import cls from './ConversationThread.module.scss';

// A reply leaves from the mailbox the letter came to, so that mailbox is only named; a thread
// that no mailbox owns (none of its letters came through one) still lets the sender be chosen.
export const ReplyMailbox = memo(
    ({
        providers,
        threadMailboxId,
        providerId,
        onChange,
    }: {
        providers: ProviderConnection[];
        threadMailboxId: string;
        providerId: string;
        onChange: (id: string) => void;
    }) => {
        const { t } = useTranslation();
        const own = providers.find((provider) => provider.id === threadMailboxId);
        if (own)
            return (
                <p className={cls.providerSelect}>
                    <span>{t('From')}</span>
                    <strong>{own.name}</strong>
                </p>
            );
        return (
            <label className={cls.providerSelect}>
                <span>{t('From')}</span>
                <select value={providerId} onChange={(event) => onChange(event.target.value)}>
                    {providers.map((provider) => (
                        <option key={provider.id} value={provider.id}>
                            {provider.name}
                        </option>
                    ))}
                </select>
            </label>
        );
    }
);
