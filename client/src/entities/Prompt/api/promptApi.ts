import { postData, readData } from '@/shared/api/request';
import { EmailPromptKey, PromptVersion } from '../model/types';

export const listPrompts = async () => readData<PromptVersion[]>('/ai/prompts');

export const getDefaultEmailPrompts = async () =>
    readData<Record<EmailPromptKey, string>>('/ai/email-prompts/defaults');

export const createPromptVersion = async (input: {
    key: string;
    purpose: string;
    systemPrompt: string;
}) => postData<PromptVersion>('/ai/prompts', input);

export const activatePrompt = async (id: string) =>
    postData<PromptVersion>(`/ai/prompts/${id}/activate`);
