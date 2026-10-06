import { $apiPrivate } from '@/shared/api/api';
import {
    deleteEmailMessage,
    fetchEmailMessage,
    fetchEmailMessages,
    fetchUnreadEmailCount,
    markEmailMessageAsSpam,
    replyToEmailMessage,
    sendEmailMessage,
} from './emailMessageApi';

jest.mock('@/shared/api/api', () => ({
    $apiPrivate: { get: jest.fn(), post: jest.fn(), delete: jest.fn() },
}));

beforeEach(() => {
    jest.clearAllMocks();
});

describe('emailMessageApi', () => {
    test('fetchEmailMessages GETs with the given filter', async () => {
        const page = { items: [], total: 0 };
        ($apiPrivate.get as jest.Mock).mockResolvedValue({ data: page });

        const result = await fetchEmailMessages({ accountId: 1 } as never);

        expect($apiPrivate.get).toHaveBeenCalledWith('/email/messages', { params: { accountId: 1 } });
        expect(result).toEqual(page);
    });

    test('fetchEmailMessages defaults to an empty filter', async () => {
        ($apiPrivate.get as jest.Mock).mockResolvedValue({ data: { items: [], total: 0 } });

        await fetchEmailMessages();

        expect($apiPrivate.get).toHaveBeenCalledWith('/email/messages', { params: {} });
    });

    test('fetchEmailMessage GETs by id', async () => {
        const message = { id: 1 };
        ($apiPrivate.get as jest.Mock).mockResolvedValue({ data: message });

        const result = await fetchEmailMessage(1);

        expect($apiPrivate.get).toHaveBeenCalledWith('/email/messages/1');
        expect(result).toEqual(message);
    });

    test('replyToEmailMessage POSTs html and attachments as form data', async () => {
        const message = { id: 1 };
        ($apiPrivate.post as jest.Mock).mockResolvedValue({ data: message });
        const file = new File(['content'], 'file.txt');

        const result = await replyToEmailMessage(1, '<p>hi</p>', [file]);

        expect($apiPrivate.post).toHaveBeenCalledWith('/email/messages/1/reply', expect.any(FormData));
        const form = ($apiPrivate.post as jest.Mock).mock.calls[0][1] as FormData;
        expect(form.get('html')).toBe('<p>hi</p>');
        expect(form.get('attachments')).toBe(file);
        expect(result).toEqual(message);
    });

    test('sendEmailMessage POSTs the payload as form data', async () => {
        const message = { id: 2 };
        ($apiPrivate.post as jest.Mock).mockResolvedValue({ data: message });

        const result = await sendEmailMessage({
            accountId: 1,
            to: ['a@b.com'],
            cc: ['c@d.com'],
            subject: 'Hi',
            html: '<p>hi</p>',
        } as never);

        expect($apiPrivate.post).toHaveBeenCalledWith('/email/send', expect.any(FormData));
        const form = ($apiPrivate.post as jest.Mock).mock.calls[0][1] as FormData;
        expect(form.get('accountId')).toBe('1');
        expect(form.get('to')).toBe(JSON.stringify(['a@b.com']));
        expect(form.get('cc')).toBe(JSON.stringify(['c@d.com']));
        expect(form.get('subject')).toBe('Hi');
        expect(result).toEqual(message);
    });

    test('sendEmailMessage omits cc when not provided', async () => {
        ($apiPrivate.post as jest.Mock).mockResolvedValue({ data: {} });

        await sendEmailMessage({ accountId: 1, to: ['a@b.com'], subject: 'Hi', html: '<p>hi</p>' } as never);

        const form = ($apiPrivate.post as jest.Mock).mock.calls[0][1] as FormData;
        expect(form.get('cc')).toBeNull();
    });

    test('deleteEmailMessage DELETEs by id', async () => {
        ($apiPrivate.delete as jest.Mock).mockResolvedValue({});

        await deleteEmailMessage(1);

        expect($apiPrivate.delete).toHaveBeenCalledWith('/email/messages/1');
    });

    test('markEmailMessageAsSpam POSTs to the spam endpoint', async () => {
        ($apiPrivate.post as jest.Mock).mockResolvedValue({});

        await markEmailMessageAsSpam(1);

        expect($apiPrivate.post).toHaveBeenCalledWith('/email/messages/1/spam');
    });

    test('fetchUnreadEmailCount GETs and returns the count', async () => {
        ($apiPrivate.get as jest.Mock).mockResolvedValue({ data: { count: 5 } });

        const result = await fetchUnreadEmailCount();

        expect($apiPrivate.get).toHaveBeenCalledWith('/email/messages/unread-count');
        expect(result).toBe(5);
    });
});
