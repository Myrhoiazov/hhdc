import { getDefaultEmailPrompts, listPrompts } from '@/entities/Prompt';
import { listProviders } from '@/entities/Provider';

export const loadAssistantSettings = async () => {
    const [prompts, defaults, providers] = await Promise.all([
        listPrompts(),
        getDefaultEmailPrompts(),
        listProviders(),
    ]);
    return {
        prompts,
        defaults,
        providers: providers.data.filter(
            (provider) => provider.type === 'AI' && provider.status === 'CONNECTED'
        ),
    };
};
