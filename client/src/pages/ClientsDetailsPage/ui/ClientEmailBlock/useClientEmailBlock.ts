import { EMAIL_MESSAGES_UPDATED_EVENT } from '@/shared/const/events';
import { useClientEmailList } from './useClientEmailList';
import { useClientEmailSelection } from './useClientEmailSelection';
import { useClientEmailModeration } from './useClientEmailModeration';

// Lets the Navbar's unread-email badge refetch immediately instead of waiting
// for its own poll interval, any time this block changes read/unread state.
const notifyEmailMessagesUpdated = () => {
    window.dispatchEvent(new Event(EMAIL_MESSAGES_UPDATED_EVENT));
};

export const useClientEmailBlock = (clientId: number, isAdmin: boolean) => {
    const {
        messages, total, isLoading, isLoadingMore, reloadMessages, onLoadMore,
    } = useClientEmailList(clientId, isAdmin);

    const {
        selectedMessage, setSelectedMessage, isSendingReply, onSelectMessage, onReply,
    } = useClientEmailSelection(reloadMessages, notifyEmailMessagesUpdated);

    const {
        isDeleting, isMarkingAsSpam, onDeleteMessage, onMarkMessageAsSpam,
    } = useClientEmailModeration(selectedMessage, setSelectedMessage, reloadMessages, notifyEmailMessagesUpdated);

    return {
        messages, total, isLoading, isLoadingMore, selectedMessage,
        isSendingReply, isDeleting, isMarkingAsSpam,
        onLoadMore, onSelectMessage, onReply, onDeleteMessage, onMarkMessageAsSpam,
    };
};
