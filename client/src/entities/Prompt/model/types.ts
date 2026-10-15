export const EMAIL_PROMPT_KEYS = ['email_classification', 'email_draft_body'] as const;

export type EmailPromptKey = (typeof EMAIL_PROMPT_KEYS)[number];

export interface PromptVersion {
    id: string;
    key: string;
    version: number;
    purpose: string;
    systemPrompt: string;
    status: string;
    createdAt: string;
}
