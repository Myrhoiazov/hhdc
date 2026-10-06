import { useCallback, useState } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';
import { $apiPrivate } from '@/shared/api/api';
import { ReminderLanguage, ReminderTemplate } from './useReminderTemplates';

export const useTemplateTestSend = (activeLanguage: ReminderLanguage, activeTemplate: ReminderTemplate | undefined) => {
    const [testEmail, setTestEmail] = useState('');
    const [isSendingTest, setIsSendingTest] = useState(false);

    const onSendTest = useCallback(async () => {
        if (!activeTemplate || !testEmail.trim()) return;
        setIsSendingTest(true);
        try {
            await $apiPrivate.post(`/payment-reminders/templates/${activeLanguage}/test`, {
                to: testEmail.trim(),
                subject: activeTemplate.subject,
                bodyHtml: activeTemplate.bodyHtml,
            });
            toast.success(`Тестовое письмо отправлено на ${testEmail.trim()}`);
        } catch (error) {
            const message = axios.isAxiosError(error) ? error.response?.data?.message : undefined;
            toast.error(message || 'Не удалось отправить тестовое письмо');
        } finally {
            setIsSendingTest(false);
        }
    }, [activeTemplate, activeLanguage, testEmail]);

    return {
        testEmail, setTestEmail, isSendingTest, onSendTest,
    };
};
