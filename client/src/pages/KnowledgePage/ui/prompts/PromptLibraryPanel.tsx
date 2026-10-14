import { memo } from 'react';
import { EMAIL_PROMPT_KEYS, EmailPromptKey, PromptVersion } from '@/entities/Prompt';
import { PromptSlot } from './PromptSlot';

export const PromptLibraryPanel = memo(
    ({
        prompts,
        defaults,
        onChanged,
    }: {
        prompts: PromptVersion[];
        defaults: Record<EmailPromptKey, string>;
        onChanged: () => void;
    }) => (
        <>
            {EMAIL_PROMPT_KEYS.map((key) => (
                <PromptSlot
                    key={`${key}:${prompts.length}`}
                    promptKey={key}
                    defaultContent={defaults[key]}
                    versions={prompts.filter((prompt) => prompt.key === key)}
                    onChanged={onChanged}
                />
            ))}
        </>
    )
);
