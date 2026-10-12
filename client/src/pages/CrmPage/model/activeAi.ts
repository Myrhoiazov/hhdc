import { ProviderConnection } from '@/entities/crm';

const AI_PROVIDERS = ['OPENAI', 'OLLAMA'];

// The AI providers that can write answers right now, in the order the server lists them (oldest first).
export const generationCandidates = (providers: ProviderConnection[]) =>
    providers.filter(item => item.type === 'AI' && item.status === 'CONNECTED' && AI_PROVIDERS.includes(item.provider));

// Mirrors the server: the chosen provider answers; without a choice the oldest connected one does.
export const activeAiProvider = (providers: ProviderConnection[]) => {
    const candidates = generationCandidates(providers);
    return candidates.find(item => item.activeForGeneration) ?? candidates[0];
};
