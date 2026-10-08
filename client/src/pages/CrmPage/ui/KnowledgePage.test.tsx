import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { createReduxStore, ReduxStoreWithManager } from '@/app/providers/StoreProvider';
import {
    activatePrompt, createPromptVersion, deleteKnowledge, EmailSimulation, getDefaultEmailPrompts, listEvents, listKnowledge, listPrompts,
    getSimulationRun, listProviders, listSimulationRuns, simulateEmail, syncKnowledgeV2,
} from '@/entities/crm';
import { KnowledgePage } from './KnowledgePage';

jest.mock('@/entities/crm', () => ({
    EMAIL_PROMPT_KEYS: ['email_classification', 'email_draft_body'],
    listKnowledge: jest.fn(), LIST_PAGE_SIZE: 25,
    listEvents: jest.fn(),
    saveKnowledge: jest.fn(),
    deleteKnowledge: jest.fn(),
    syncKnowledgeV2: jest.fn(),
    listPrompts: jest.fn(),
    getDefaultEmailPrompts: jest.fn(),
    createPromptVersion: jest.fn(),
    activatePrompt: jest.fn(),
    simulateEmail: jest.fn(),
    listProviders: jest.fn(),
    listSimulationRuns: jest.fn(),
    getSimulationRun: jest.fn(),
    SIMULATION_PAGE_SIZE: 10,
}), { virtual: true });

const savedPrompt = { id: 'prompt-2', key: 'email_draft_body', version: 2, purpose: 'Shorter tone', systemPrompt: 'Answer briefly.', status: 'DRAFT', createdAt: '2026-10-07T10:00:00.000Z' };
const ollama = { id: 'ai-1', name: 'Ollama (local)', type: 'AI', provider: 'OLLAMA', status: 'CONNECTED', settings: { model: 'qwen3:1.7b' } };
const simulation: EmailSimulation = {
    id: 'run-1', createdAt: '2026-10-07T20:00:00.000Z', status: 'DRAFTED', durationMs: 8541, totalTokens: 2273, provider: 'OLLAMA',
    metrics: [
        { stage: 'CLASSIFICATION', provider: 'OLLAMA', model: 'qwen3:1.7b', calls: 1, durationMs: 5972, promptTokens: 263, completionTokens: 341 },
        { stage: 'DRAFT', provider: 'OLLAMA', model: 'qwen3:1.7b', calls: 2, durationMs: 2569, promptTokens: 1604, completionTokens: 65 },
    ],
    classification: { spam: false, needsReply: true, replyLanguage: 'ru', intent: 'venue', secondaryIntents: [], needsCRM: false, needsHumanAction: false, urgency: 'normal', confidence: 0.9 },
    model: 'qwen3:1.7b', promptVersion: 'email_draft_body@default',
    draft: { subject: 'Re: Question', body: 'Здравствуйте! HHDC 2027 пройдёт в Apollohal, Amsterdam.', confidence: 0.6, needsStaffReview: true },
    trace: {
        intent: 'venue', secondaryIntents: ['event'], language: 'ru', eventYear: 2027, answerability: 'HUMAN_REQUIRED', needsCRM: true, crmFound: false,
        needsHumanAction: true, confidence: 'low', needsStaffReview: true, warnings: ['no_current_facts'], attempts: 2, retrievalDurationMs: 12, generationDurationMs: 900,
    },
    knowledge: [{ layer: 'facts', chunkId: 'event_2027_venue#main', documentId: 'event_2027_venue', sourcePath: 'hhdc-knowledge-v1/02_event_2027/venue.md', score: 1.42, content: 'Venue: Apollohal, Amsterdam' }],
};

const renderPage = () => {
    const store = createReduxStore() as ReduxStoreWithManager;
    return render(<Provider store={store}><MemoryRouter><KnowledgePage /></MemoryRouter></Provider>);
};

beforeEach(() => {
    jest.mocked(listKnowledge).mockResolvedValue({ data: [], total: 0 });
    jest.mocked(listEvents).mockResolvedValue({ data: [], total: 0 });
    jest.mocked(listPrompts).mockResolvedValue([savedPrompt]);
    jest.mocked(getDefaultEmailPrompts).mockResolvedValue({ email_classification: 'Classify the email.', email_draft_body: 'You answer for the studio.' });
    jest.mocked(simulateEmail).mockReset();
    jest.mocked(simulateEmail).mockResolvedValue(simulation);
    jest.mocked(listProviders).mockResolvedValue({ data: [ollama, { ...ollama, id: 'mail-1', type: 'EMAIL' }], total: 2 });
    jest.mocked(listSimulationRuns).mockResolvedValue({ data: [], total: 0 });
    jest.mocked(createPromptVersion).mockReset();
    jest.mocked(createPromptVersion).mockResolvedValue(savedPrompt);
    jest.mocked(activatePrompt).mockReset();
    jest.mocked(activatePrompt).mockResolvedValue({ ...savedPrompt, status: 'ACTIVE' });
});

test('the ready-made knowledge base is loaded on request and the outcome is reported', async () => {
    jest.mocked(syncKnowledgeV2).mockResolvedValue({ created: 48, updated: 0, embedded: 48, unchanged: 0, editedInCrm: 2, failed: [] });
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Load knowledge base' }));

    await waitFor(() => expect(syncKnowledgeV2).toHaveBeenCalledWith(false));
    expect(await screen.findByText(/Added: 48/)).toHaveTextContent('Edited in CRM, kept: 2');
    await waitFor(() => expect(listKnowledge).toHaveBeenCalledTimes(2));
});

test('a simulated email shows the decision, the draft, its warnings and the knowledge used', async () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Email simulation' }));
    fireEvent.change(await screen.findByLabelText('Customer email'), { target: { value: 'Где будет проходить HHDC 2027?' } });
    fireEvent.change(screen.getByLabelText('Reply prompt'), { target: { value: 'prompt-2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Run simulation' }));

    await waitFor(() => expect(simulateEmail).toHaveBeenCalledWith({
        subject: '', body: 'Где будет проходить HHDC 2027?', classificationPromptId: undefined, draftPromptId: 'prompt-2',
        providerConnectionId: undefined, model: undefined,
    }));
    const result = await screen.findByRole('region', { name: 'Simulation result' });
    expect(result).toHaveTextContent('Здравствуйте! HHDC 2027 пройдёт в Apollohal, Amsterdam.');
    expect(result).toHaveTextContent('Intent: venue + event');
    expect(result).toHaveTextContent('Event year: 2027');
    expect(result).toHaveTextContent('CRM record needed');
    expect(result).toHaveTextContent('Staff action required');
    expect(result).toHaveTextContent('HUMAN_REQUIRED');
    expect(result).toHaveTextContent('Needs staff review');
    expect(result).toHaveTextContent('no_current_facts');
    expect(result).toHaveTextContent('event_2027_venue#main');
    expect(result).toHaveTextContent('DRAFT · OLLAMA/qwen3:1.7b · 2569 ms · 1604→65 tokens · Calls: 2');
});

test('a prompt is saved as a new version and a saved version can be activated', async () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Prompts' }));
    const reply = await screen.findByRole('region', { name: 'Reply prompt' });
    expect(reply).toHaveTextContent('The built-in text is in use until a saved version is activated.');
    expect(reply).toHaveTextContent('Placeholders filled in for every email: {{current_date}} · {{replyLanguage}} · {{email}}');
    const [, replyText] = screen.getAllByLabelText('Prompt text');
    expect(replyText).toHaveValue('You answer for the studio.');
    const [, replyNote] = screen.getAllByLabelText('Version note');
    fireEvent.change(replyText, { target: { value: 'Answer warmly.' } });
    fireEvent.change(replyNote, { target: { value: 'Warmer tone' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Save as new version' })[1]);

    await waitFor(() => expect(createPromptVersion).toHaveBeenCalledWith({ key: 'email_draft_body', purpose: 'Warmer tone', systemPrompt: 'Answer warmly.' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Activate' }));
    await waitFor(() => expect(activatePrompt).toHaveBeenCalledWith('prompt-2'));
});

test('a simulation can be sent to a chosen provider and model', async () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Email simulation' }));
    fireEvent.change(await screen.findByLabelText('Customer email'), { target: { value: 'Is Jojo Gomez coming in 2027?' } });
    expect(screen.getByLabelText('Model')).toHaveAttribute('placeholder', 'qwen3:1.7b');
    expect(screen.queryByRole('option', { name: /mail-1/ })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('AI provider'), { target: { value: 'ai-1' } });
    fireEvent.change(screen.getByLabelText('Model'), { target: { value: 'qwen3:4b' } });
    fireEvent.click(screen.getByRole('button', { name: 'Run simulation' }));

    await waitFor(() => expect(simulateEmail).toHaveBeenCalledWith(expect.objectContaining({ providerConnectionId: 'ai-1', model: 'qwen3:4b' })));
});

test('past simulations are listed and a run opens with its email, draft and metrics', async () => {
    jest.mocked(listSimulationRuns).mockResolvedValue({ total: 1, data: [{
        id: 'run-1', createdAt: '2026-10-07T20:00:00.000Z', subject: 'Venue', preview: 'Где будет проходить', status: 'DRAFTED', provider: 'OLLAMA',
        model: 'qwen3:1.7b', promptVersion: 'email_draft_body@default', totalTokens: 2273, durationMs: 8541, error: null,
    }] });
    jest.mocked(getSimulationRun).mockResolvedValue({
        id: 'run-1', createdAt: '2026-10-07T20:00:00.000Z', subject: 'Venue', status: 'DRAFTED', provider: 'OLLAMA', model: 'qwen3:1.7b',
        promptVersion: 'email_draft_body@default', totalTokens: 2273, durationMs: 8541, error: null,
        fromAddress: 'customer@example.test', body: 'Где будет проходить HHDC 2027?', result: simulation,
    });
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Email simulation' }));
    const history = await screen.findByRole('region', { name: 'Simulation history' });
    fireEvent.click(await screen.findByRole('button', { name: 'Venue' }));
    expect(history).toHaveTextContent('OLLAMA/qwen3:1.7b');
    expect(history).toHaveTextContent('2273');

    const run = await screen.findByRole('region', { name: 'Simulation run' });
    expect(run).toHaveTextContent('customer@example.test — Venue');
    expect(run).toHaveTextContent('Где будет проходить HHDC 2027?');
    expect(run).toHaveTextContent('Здравствуйте! HHDC 2027 пройдёт в Apollohal, Amsterdam.');
    expect(run).toHaveTextContent('CLASSIFICATION · OLLAMA/qwen3:1.7b · 5972 ms · 263→341 tokens');
});

const knowledgeDocument = (id: string, title: string) => ({ id, title, scope: 'GLOBAL', content: 'Be warm and short.', status: 'ACTIVE', sourceType: 'KB_V2', updatedAt: '2026-10-08T10:00:00Z' });
const NO_KNOWLEDGE_FILTERS = { q: '', scope: '', status: '' };

test('knowledge documents are a table with filters and pages; a title opens the editor', async () => {
    jest.mocked(listKnowledge).mockResolvedValue({ data: [knowledgeDocument('k1', 'HHDC tone of voice')], total: 48 });
    renderPage();

    const list = await screen.findByRole('region', { name: 'Knowledge documents' });
    fireEvent.click(await within(list).findByRole('button', { name: 'HHDC tone of voice' }));
    expect(within(screen.getByRole('form', { name: 'Edit document' })).getByLabelText('Content')).toHaveValue('Be warm and short.');

    fireEvent.click(within(list).getByRole('button', { name: 'Next page' }));
    await waitFor(() => expect(listKnowledge).toHaveBeenLastCalledWith(NO_KNOWLEDGE_FILTERS, 2));
    fireEvent.change(screen.getByLabelText('Status', { selector: 'select:not([name])' }), { target: { value: 'DRAFT' } });
    await waitFor(() => expect(listKnowledge).toHaveBeenLastCalledWith({ ...NO_KNOWLEDGE_FILTERS, status: 'DRAFT' }, 1));
});

test('a knowledge document is deleted only after a second press', async () => {
    jest.mocked(listKnowledge).mockResolvedValue({ data: [knowledgeDocument('k1', 'HHDC tone of voice')], total: 1 });
    jest.mocked(deleteKnowledge).mockResolvedValue({} as never);
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: /^Delete document/ }));
    expect(deleteKnowledge).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Delete for good' }));
    await waitFor(() => expect(deleteKnowledge).toHaveBeenCalledWith('k1'));
});
