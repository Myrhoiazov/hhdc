import { activeAiProvider, generationCandidates } from './activeAi';
import { ProviderConnection } from './types';

const connection = (id: string, change: Partial<ProviderConnection> = {}): ProviderConnection => ({
    id,
    name: id,
    type: 'AI',
    provider: 'OPENAI',
    status: 'CONNECTED',
    settings: {},
    ...change,
});

test('only connected AI providers that can write answers are candidates, in the order given', () => {
    const providers = [
        connection('ollama', { provider: 'OLLAMA' }),
        connection('mail', { type: 'EMAIL', provider: 'IMAP' }),
        connection('broken', { status: 'ERROR' }),
        connection('other-ai', { provider: 'GEMINI' }),
        connection('openai'),
    ];

    expect(generationCandidates(providers).map((item) => item.id)).toEqual(['ollama', 'openai']);
});

test('the chosen provider answers', () => {
    const providers = [connection('old'), connection('chosen', { activeForGeneration: true })];

    expect(activeAiProvider(providers)?.id).toBe('chosen');
});

test('without a choice the oldest connected provider answers', () => {
    expect(activeAiProvider([connection('old'), connection('new')])?.id).toBe('old');
});

test('nobody answers when no AI provider is connected', () => {
    expect(activeAiProvider([connection('off', { status: 'DISABLED' })])).toBeUndefined();
});
