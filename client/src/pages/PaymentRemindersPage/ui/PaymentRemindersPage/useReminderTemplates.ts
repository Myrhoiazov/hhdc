import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { $apiPrivate } from '@/shared/api/api';
import { useTemplateTestSend } from './useTemplateTestSend';

export type ReminderLanguage = 'RU' | 'EN' | 'NL';

export interface ReminderTemplate {
    language: ReminderLanguage;
    subject: string;
    bodyHtml: string;
}

export const useReminderTemplates = () => {
    const [templates, setTemplates] = useState<Record<ReminderLanguage, ReminderTemplate>>();
    const [placeholders, setPlaceholders] = useState<string[]>([]);
    const [activeLanguage, setActiveLanguage] = useState<ReminderLanguage>('RU');
    const [isTemplatesLoading, setIsTemplatesLoading] = useState(true);
    const [isTemplateSaving, setIsTemplateSaving] = useState(false);

    const loadTemplates = useCallback(() => {
        setIsTemplatesLoading(true);
        return $apiPrivate.get<{ templates: ReminderTemplate[]; placeholders: string[] }>('/payment-reminders/templates')
            .then(({ data }) => {
                const map = Object.fromEntries(data.templates.map((template) => [template.language, template])) as Record<ReminderLanguage, ReminderTemplate>;
                setTemplates(map);
                setPlaceholders(data.placeholders);
            })
            .catch(() => toast.error('Не удалось загрузить шаблоны писем'))
            .finally(() => setIsTemplatesLoading(false));
    }, []);

    useEffect(() => { loadTemplates(); }, [loadTemplates]);

    const activeTemplate = templates?.[activeLanguage];

    const onSaveTemplate = useCallback(async () => {
        if (!activeTemplate) return;
        setIsTemplateSaving(true);
        try {
            const { data } = await $apiPrivate.put<ReminderTemplate>(`/payment-reminders/templates/${activeLanguage}`, {
                subject: activeTemplate.subject,
                bodyHtml: activeTemplate.bodyHtml,
            });
            setTemplates((prev) => (prev ? { ...prev, [activeLanguage]: data } : prev));
            toast.success('Шаблон письма сохранён');
        } catch {
            toast.error('Не удалось сохранить шаблон');
        } finally {
            setIsTemplateSaving(false);
        }
    }, [activeTemplate, activeLanguage]);

    const testSend = useTemplateTestSend(activeLanguage, activeTemplate);

    return {
        templates, setTemplates, placeholders, activeLanguage, setActiveLanguage, activeTemplate,
        isTemplatesLoading, isTemplateSaving, onSaveTemplate,
        ...testSend,
    };
};
