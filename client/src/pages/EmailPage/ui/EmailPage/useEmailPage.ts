import { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { getUserAuthData } from '@/entities/User';
import { RoleKey } from '@/entities/Role';
import { EMAIL_MESSAGES_UPDATED_EVENT } from '@/shared/const/events';
import { useEmailAccounts } from './useEmailAccounts';
import { useEmailAccountSync } from './useEmailAccountSync';
import { useEmailSearch } from './useEmailSearch';
import { useEmailMessageList, EmailTab } from './useEmailMessageList';
import { useEmailMessageSelection } from './useEmailMessageSelection';
import { useEmailMessageModeration } from './useEmailMessageModeration';
import { useEmailCompose } from './useEmailCompose';

// Lets the Navbar's unread-email badge refetch immediately instead of waiting
// for its own poll interval, any time this page changes read/unread state.
const notifyEmailMessagesUpdated = () => {
    window.dispatchEvent(new Event(EMAIL_MESSAGES_UPDATED_EVENT));
};

export type { EmailTab };

export const useEmailPage = () => {
    const authData = useSelector(getUserAuthData);
    const isAdmin = authData?.role === RoleKey.ADMIN;

    const [activeTab, setActiveTab] = useState<EmailTab>('messages');

    const {
        accounts, loadAccounts, selectedMailboxId, setSelectedMailboxId, onCreateAccount, onDeleteAccount,
    } = useEmailAccounts(isAdmin);
    const { syncingAccountId, syncAccount } = useEmailAccountSync(loadAccounts);
    const { searchInput, setSearchInput, search } = useEmailSearch();
    const {
        messages, setMessages, isLoadingMessages, isLoadingMore, hasMore, reloadMessages, onLoadMore,
    } = useEmailMessageList(selectedMailboxId, search);
    const {
        selectedMessage, setSelectedMessage, isSendingReply, onSelectMessage, onReply,
    } = useEmailMessageSelection(reloadMessages, setMessages, notifyEmailMessagesUpdated);
    const {
        isDeleting, isMarkingAsSpam, onDeleteMessage, onMarkMessageAsSpam,
    } = useEmailMessageModeration(selectedMessage, setSelectedMessage, reloadMessages, notifyEmailMessagesUpdated);
    const { isComposeOpen, setIsComposeOpen, isSendingCompose, onSendCompose } = useEmailCompose(reloadMessages);

    // Message data only matters while the "Письма" tab is visible — no point fetching
    // it (or keeping an old selection open) while the user manages mailbox connections.
    useEffect(() => {
        if (isAdmin && activeTab === 'messages') {
            reloadMessages();
            setSelectedMessage(undefined);
        }
    }, [isAdmin, activeTab, reloadMessages, setSelectedMessage]);

    const onSyncAccount = useCallback((accountId: number) => syncAccount(accountId, async () => {
        await reloadMessages();
        notifyEmailMessagesUpdated();
    }), [syncAccount, reloadMessages]);

    return {
        isAdmin,
        activeTab, setActiveTab,
        accounts, selectedMailboxId, setSelectedMailboxId, syncingAccountId,
        onCreateAccount, onDeleteAccount, onSyncAccount,
        searchInput, setSearchInput,
        messages, isLoadingMessages, isLoadingMore, hasMore, onLoadMore,
        selectedMessage, isSendingReply, onSelectMessage, onReply,
        isDeleting, isMarkingAsSpam, onDeleteMessage, onMarkMessageAsSpam,
        isComposeOpen, setIsComposeOpen, isSendingCompose, onSendCompose,
    };
};
