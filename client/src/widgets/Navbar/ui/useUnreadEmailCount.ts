import { useEffect, useState } from 'react';
import { fetchUnreadEmailCount } from '@/entities/EmailMessage';
import { EMAIL_MESSAGES_UPDATED_EVENT } from '@/shared/const/events';

const UNREAD_EMAIL_POLL_MS = 60000;

// The email module (and its unread count) is admin-only, both server- and
// client-side, so non-admins never even issue this request.
export const useUnreadEmailCount = (isAdmin: boolean) => {
    const [unreadEmailCount, setUnreadEmailCount] = useState(0);

    useEffect(() => {
        if (!isAdmin) {
            return undefined;
        }

        const loadUnreadCount = () => {
            fetchUnreadEmailCount().then(setUnreadEmailCount).catch(() => {});
        };

        loadUnreadCount();
        const interval = setInterval(loadUnreadCount, UNREAD_EMAIL_POLL_MS);
        window.addEventListener(EMAIL_MESSAGES_UPDATED_EVENT, loadUnreadCount);

        return () => {
            clearInterval(interval);
            window.removeEventListener(EMAIL_MESSAGES_UPDATED_EVENT, loadUnreadCount);
        };
    }, [isAdmin]);

    return unreadEmailCount;
};