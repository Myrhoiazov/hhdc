import { PromptVersion } from '../model/types';
import { listPrompts } from './promptApi';

const REPLY_PROMPT_KEY = 'email_draft_body';

// The saved versions of the prompt that writes replies. They are a testing aid for people who
// manage AI; for everyone else the list is simply empty and the picker is not shown.
export const listReplyPrompts = async (): Promise<PromptVersion[]> => {
    try {
        return (await listPrompts()).filter((prompt) => prompt.key === REPLY_PROMPT_KEY);
    } catch {
        return [];
    }
};
