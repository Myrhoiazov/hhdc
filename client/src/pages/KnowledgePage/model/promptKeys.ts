import { EmailPromptKey } from '@/entities/Prompt';

export const KEY_TITLES: Record<EmailPromptKey, string> = {
    email_classification: 'Classification prompt',
    email_draft_body: 'Reply prompt',
};

// Substituted per email by the server; listed so that an edited prompt keeps using them.
export const PLACEHOLDERS: Record<EmailPromptKey, string> = {
    email_classification: '',
    email_draft_body:
        '{{current_date}} · {{replyLanguage}} · {{email}} · {{emailThread}} · {{crmContext}} · {{knowledge}}',
};
