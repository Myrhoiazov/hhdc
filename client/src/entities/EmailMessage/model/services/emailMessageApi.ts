import { $apiPrivate } from '@/shared/api/api';
import { EmailMessage, EmailMessagesFilter, EmailMessagesPage, SendEmailPayload } from '../types/emailMessage';

export const fetchEmailMessages = async (filter: EmailMessagesFilter = {}): Promise<EmailMessagesPage> => {
    const { data } = await $apiPrivate.get<EmailMessagesPage>('/email/messages', { params: filter });
    return data;
};

export const fetchEmailMessage = async (messageId: number): Promise<EmailMessage> => {
    const { data } = await $apiPrivate.get<EmailMessage>(`/email/messages/${messageId}`);
    return data;
};

const filesToFormData = (form: FormData, files?: File[]) => {
    files?.forEach((file) => form.append('attachments', file));
};

export const replyToEmailMessage = async (messageId: number, html: string, files?: File[]): Promise<EmailMessage> => {
    const form = new FormData();
    form.append('html', html);
    filesToFormData(form, files);

    const { data } = await $apiPrivate.post<EmailMessage>(`/email/messages/${messageId}/reply`, form);
    return data;
};

export const sendEmailMessage = async (payload: SendEmailPayload): Promise<EmailMessage> => {
    const form = new FormData();
    form.append('accountId', String(payload.accountId));
    form.append('to', JSON.stringify(payload.to));
    if (payload.cc?.length) {
        form.append('cc', JSON.stringify(payload.cc));
    }
    form.append('subject', payload.subject);
    form.append('html', payload.html);
    filesToFormData(form, payload.files);

    const { data } = await $apiPrivate.post<EmailMessage>('/email/send', form);
    return data;
};

export const deleteEmailMessage = async (messageId: number): Promise<void> => {
    await $apiPrivate.delete(`/email/messages/${messageId}`);
};

export const markEmailMessageAsSpam = async (messageId: number): Promise<void> => {
    await $apiPrivate.post(`/email/messages/${messageId}/spam`);
};

export const fetchUnreadEmailCount = async (): Promise<number> => {
    const { data } = await $apiPrivate.get<{ count: number }>('/email/messages/unread-count');
    return data.count;
};
