import { getUnreadByMailbox } from '@/entities/Conversation';
import { NO_UNREAD } from '../ui/CommunicationsPage';

// The counters are a hint on the tabs: when they cannot be loaded the inbox still works without them.
export const loadUnread = async (): Promise<Record<string, number>> => {
    try {
        return await getUnreadByMailbox();
    } catch {
        return NO_UNREAD;
    }
};
