import { Dispatch, memo, SetStateAction } from 'react';
import { Card } from '@/shared/ui/Card/Card';
import { Text } from '@/shared/ui/Text/Text';
import { Button, ButtonTheme } from '@/shared/ui/Button';
import { HStack, VStack } from '@/shared/ui/Stack';
import { Input } from '@/shared/ui/Input/Input';
import { Skeleton } from '@/shared/ui/Skeleton/Skeleton';
import { RichTextEditor } from '@/shared/ui/RichTextEditor';
import { ReminderLanguage, ReminderTemplate } from './usePaymentReminders';
import s from './PaymentRemindersPage.module.scss';

const LANGUAGE_LABELS: Record<ReminderLanguage, string> = { RU: 'Русский', EN: 'English', NL: 'Nederlands' };

interface PaymentReminderTemplateCardProps {
    isLoading: boolean;
    activeLanguage: ReminderLanguage;
    setActiveLanguage: (language: ReminderLanguage) => void;
    activeTemplate?: ReminderTemplate;
    setTemplates: Dispatch<SetStateAction<Record<ReminderLanguage, ReminderTemplate> | undefined>>;
    placeholders: string[];
    isSaving: boolean;
    onSaveTemplate: () => void;
    testEmail: string;
    setTestEmail: (value: string) => void;
    isSendingTest: boolean;
    onSendTest: () => void;
}

const TemplateLanguageTabs = ({ activeLanguage, onSelect }: {
    activeLanguage: ReminderLanguage;
    onSelect: (language: ReminderLanguage) => void;
}) => (
    <HStack gap="8" wrap="wrap">
        {(Object.keys(LANGUAGE_LABELS) as ReminderLanguage[]).map((language) => (
            <Button
                key={language}
                theme={language === activeLanguage ? ButtonTheme.BACKGROUND_INVERTED : ButtonTheme.OUTLINE}
                onClick={() => onSelect(language)}
            >
                {LANGUAGE_LABELS[language]}
            </Button>
        ))}
    </HStack>
);

const TemplateEditor = ({
    activeTemplate,
    activeLanguage,
    setTemplates,
    placeholders,
    isSaving,
    onSaveTemplate,
}: {
    activeTemplate: ReminderTemplate;
    activeLanguage: ReminderLanguage;
    setTemplates: Dispatch<SetStateAction<Record<ReminderLanguage, ReminderTemplate> | undefined>>;
    placeholders: string[];
    isSaving: boolean;
    onSaveTemplate: () => void;
}) => (
    <>
        <Input
            fullWidth
            label="Тема письма"
            type="text"
            value={activeTemplate.subject}
            onChange={(value) => setTemplates((prev) => (prev ? { ...prev, [activeLanguage]: { ...prev[activeLanguage], subject: value ?? '' } } : prev))}
        />
        <RichTextEditor
            value={activeTemplate.bodyHtml}
            onChange={(html) => setTemplates((prev) => (prev ? { ...prev, [activeLanguage]: { ...prev[activeLanguage], bodyHtml: html } } : prev))}
            placeholder="Текст письма..."
        />
        <Text
            size="s"
            className={s.subtitle}
            text={`Доступные плейсхолдеры: ${placeholders.map((placeholder) => `{{${placeholder}}}`).join(', ')} — подставляются автоматически при отправке.`}
        />
        <Text
            size="s"
            className={s.subtitle}
            text="Логотип, ссылка на сайт, email и юридические реквизиты студии добавляются в конец письма автоматически из карточки бренда — редактировать их здесь не нужно."
        />
        <HStack gap="8" wrap="wrap" align="end">
            <Button theme={ButtonTheme.BACKGROUND_INVERTED} disabled={isSaving} onClick={onSaveTemplate} className={s.saveTemplateBtn}>
                {isSaving ? 'Сохранение...' : `Сохранить шаблон (${LANGUAGE_LABELS[activeLanguage]})`}
            </Button>
        </HStack>
    </>
);

const TestSendBlock = ({ testEmail, setTestEmail, isSendingTest, onSendTest }: {
    testEmail: string;
    setTestEmail: (value: string) => void;
    isSendingTest: boolean;
    onSendTest: () => void;
}) => (
    <div className={s.testSendBlock}>
        <Text size="s" title="Проверить письмо" bold />
        <Text size="s" className={s.subtitle} text="Отправит текущий текст (даже несохранённый) с примерными данными на указанный адрес — без создания записи в истории." />
        <HStack gap="8" wrap="wrap" align="end">
            <Input
                fullWidth
                label="Email для теста"
                type="email"
                placeholder="you@example.com"
                value={testEmail}
                onChange={(value) => setTestEmail(value ?? '')}
            />
            <Button theme={ButtonTheme.OUTLINE} disabled={isSendingTest || !testEmail.trim()} onClick={onSendTest}>
                {isSendingTest ? 'Отправка...' : 'Отправить тестовое письмо'}
            </Button>
        </HStack>
    </div>
);

export const PaymentReminderTemplateCard = memo((props: PaymentReminderTemplateCardProps) => {
    const {
        isLoading, activeLanguage, setActiveLanguage, activeTemplate, setTemplates, placeholders,
        isSaving, onSaveTemplate, testEmail, setTestEmail, isSendingTest, onSendTest,
    } = props;

    return (
        <Card padding="24" fullWidth className={s.card}>
            <VStack max gap="16">
                <Text title="Шаблон письма" size="m" bold />
                <TemplateLanguageTabs activeLanguage={activeLanguage} onSelect={setActiveLanguage} />

                {isLoading && <Skeleton width="100%" height={260} border="12px" />}

                {!isLoading && activeTemplate && (
                    <>
                        <TemplateEditor
                            activeTemplate={activeTemplate}
                            activeLanguage={activeLanguage}
                            setTemplates={setTemplates}
                            placeholders={placeholders}
                            isSaving={isSaving}
                            onSaveTemplate={onSaveTemplate}
                        />
                        <TestSendBlock
                            testEmail={testEmail}
                            setTestEmail={setTestEmail}
                            isSendingTest={isSendingTest}
                            onSendTest={onSendTest}
                        />
                    </>
                )}
            </VStack>
        </Card>
    );
});
