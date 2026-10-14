import { getDefaultEmailPrompts, listPrompts } from '@/entities/Prompt';
import { listProviders, ProviderConnection } from '@/entities/Provider';
import { loadAssistantSettings } from './loadAssistantSettings';

jest.mock('@/entities/Prompt', () => ({ listPrompts: jest.fn(), getDefaultEmailPrompts: jest.fn() }));
jest.mock('@/entities/Provider', () => ({ listProviders: jest.fn() }));

const provider = (id: string, change: Partial<ProviderConnection> = {}): ProviderConnection => ({
    id, name: id, type: 'AI', provider: 'OPENAI', status: 'CONNECTED', settings: {}, ...change,
});

test('the simulation offers only the AI providers that are connected', async () => {
    jest.mocked(listPrompts).mockResolvedValue([]);
    jest.mocked(getDefaultEmailPrompts).mockResolvedValue({ email_classification: 'c', email_draft_body: 'd' });
    jest.mocked(listProviders).mockResolvedValue({
        data: [provider('ai'), provider('off', { status: 'DISABLED' }), provider('mail', { type: 'EMAIL', provider: 'IMAP' })],
        total: 3,
    });

    const settings = await loadAssistantSettings();

    expect(settings.providers.map(item => item.id)).toEqual(['ai']);
    expect(settings.defaults.email_draft_body).toBe('d');
});
