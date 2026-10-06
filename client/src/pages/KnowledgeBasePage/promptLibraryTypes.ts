export type AiPromptSlot = 'DRAFT_BODY' | 'CLASSIFICATION';

export interface AiPrompt {
    id: number;
    slot: AiPromptSlot;
    name: string;
    content: string;
    tags: string[];
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export const PROMPT_SLOT_LABELS: Record<AiPromptSlot, string> = {
    DRAFT_BODY: 'Черновик ответа',
    CLASSIFICATION: 'Классификация',
};

export interface PromptForm {
    slot: AiPromptSlot;
    name: string;
    content: string;
    tags: string;
}

export const emptyPromptForm = (slot: AiPromptSlot = 'DRAFT_BODY'): PromptForm => ({ slot, name: '', content: '', tags: '' });
