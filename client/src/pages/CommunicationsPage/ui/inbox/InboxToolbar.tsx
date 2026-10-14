import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import SearchIcon from '@/shared/assets/icons/search.svg';
import { ProviderConnection } from '@/entities/Provider';
import cls from './Inbox.module.scss';
import layout from '@/shared/ui/layout/layout.module.scss';
import { totalUnread } from '../../model/inbox';

const SEARCH_GLASS = '8 8 16 16';

interface ToolbarProps {
    providers: ProviderConnection[];
    providerId: string;
    query: string;
    // Conversations with unread mail per mailbox id.
    unread: Record<string, number>;
    onProviderChange: (id: string) => void;
    onQueryChange: (query: string) => void;
}

const MailboxPill = memo(
    ({
        label,
        count,
        active,
        onSelect,
    }: {
        label: string;
        count: number;
        active: boolean;
        onSelect: () => void;
    }) => {
        const { t } = useTranslation();
        return (
            <button
                className={active ? cls.activeMailbox : ''}
                aria-pressed={active}
                aria-label={count ? `${label} — ${t('Unread')}: ${count}` : label}
                onClick={onSelect}
            >
                {label}
                {count > 0 && (
                    <span className={cls.mailboxCount} aria-hidden="true">
                        {count}
                    </span>
                )}
            </button>
        );
    }
);

export const InboxToolbar = memo((props: ToolbarProps) => {
    const { t } = useTranslation();
    const { providers, providerId, query, unread, onProviderChange, onQueryChange } = props;
    return (
        <div className={cls.inboxToolbar}>
            {providers.length > 1 && (
                <div className={cls.mailboxPills} aria-label={t('Email accounts')}>
                    <MailboxPill
                        label={t('All inboxes')}
                        count={totalUnread(unread, providers)}
                        active={!providerId}
                        onSelect={() => onProviderChange('')}
                    />
                    {providers.map((provider) => (
                        <MailboxPill
                            key={provider.id}
                            label={provider.name}
                            count={unread[provider.id] ?? 0}
                            active={providerId === provider.id}
                            onSelect={() => onProviderChange(provider.id)}
                        />
                    ))}
                </div>
            )}
            <label className={cls.searchBox}>
                {/* The glass is drawn in the middle of a larger canvas; the view is cut to the glass itself. */}
                <SearchIcon aria-hidden="true" viewBox={SEARCH_GLASS} />
                <span className={layout.srOnly}>{t('Search email')}</span>
                <input
                    value={query}
                    onChange={(event) => onQueryChange(event.target.value)}
                    placeholder={t('Search by subject, sender, or text…')}
                />
            </label>
        </div>
    );
});
