import { fireEvent, screen, waitFor } from '@testing-library/react';
import { toast } from 'react-toastify';
import { $apiPrivate } from '@/shared/api/api';
import { pendingDocument, renderPage } from './KnowledgeBasePage.testHelpers';

jest.mock('@/shared/api/api', () => ({
    $api: { get: jest.fn() },
    $apiPrivate: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
    injectStore: jest.fn(),
    csrfActions: { reset: jest.fn() },
}));

jest.mock('react-toastify', () => ({
    toast: { success: jest.fn(), error: jest.fn() },
}));

beforeEach(() => {
    jest.clearAllMocks();
    ($apiPrivate.get as jest.Mock).mockImplementation((url: string) => {
        if (url === '/knowledge/documents') {
            return Promise.resolve({ data: { items: [pendingDocument], total: 1, page: 1, limit: 20, totalPages: 1, pendingTotal: 1 } });
        }
        if (url === '/ai-email/prompts') return Promise.resolve({ data: [] });
        if (url === '/ai-email/simulation-runs') return Promise.resolve({ data: { items: [], total: 0, page: 1, limit: 20, totalPages: 1 } });
        return Promise.resolve({ data: {} });
    });
});

const historyRunSummary = {
    id: 9, fromAddress: 'test@example.com', subject: 'Вопрос про цены',
    classificationPromptName: null, draftBodyPromptName: null,
    draftProvider: 'OPENAI', draftModel: 'gpt-4o-mini',
    classificationSpam: false, classificationConfidence: 0.9,
    deterministicSpamReason: null, draftSkippedReason: null,
    createdAt: '2026-09-25T10:00:00.000Z',
    metrics: [{ stage: 'DRAFT', provider: 'OPENAI', model: 'gpt-4o-mini', callCount: 1, durationMs: 980, promptTokens: 512, completionTokens: 96, totalTokens: 608 }],
};

// Shared "documents/prompts/simulation-runs list" stub for the history tests below — only the
// `/ai-email/simulation-runs/:id` detail route varies per test, and is layered on top by the
// caller before falling back to this.
const mockHistoryList = (url: string) => {
    if (url === '/knowledge/documents') return Promise.resolve({ data: { items: [pendingDocument], total: 1, page: 1, limit: 20, totalPages: 1, pendingTotal: 1 } });
    if (url === '/ai-email/prompts') return Promise.resolve({ data: [] });
    if (url === '/ai-email/simulation-runs') return Promise.resolve({ data: { items: [historyRunSummary], total: 1, page: 1, limit: 20, totalPages: 1 } });
    return Promise.resolve({ data: {} });
};

test('lists saved simulation runs with their summed tokens and duration', async () => {
    ($apiPrivate.get as jest.Mock).mockImplementation((url: string) => {
        if (url === '/ai-email/simulation-runs') {
            return Promise.resolve({
                data: {
                    items: [{ ...historyRunSummary, draftBodyPromptName: 'v2 — strict grounded reply' }],
                    total: 1, page: 1, limit: 20, totalPages: 1,
                },
            });
        }
        return mockHistoryList(url);
    });
    renderPage();
    expect(await screen.findByText('Вопрос про цены')).toBeInTheDocument();
    expect(screen.getByText('v2 — strict grounded reply')).toBeInTheDocument();
    expect(screen.getByText('608')).toBeInTheDocument();
});

test('shows an empty state when no simulations have been saved yet', async () => {
    renderPage();
    expect(await screen.findByText('Симуляции ещё не запускались')).toBeInTheDocument();
});

test('filters simulation history by provider', async () => {
    renderPage();
    await screen.findByText('Симуляции ещё не запускались');
    fireEvent.change(screen.getByLabelText('История симуляций — провайдер'), { target: { value: 'OPENAI' } });
    await waitFor(() => {
        expect($apiPrivate.get).toHaveBeenCalledWith('/ai-email/simulation-runs', {
            params: { _page: 1, _limit: 20, provider: 'OPENAI' },
        });
    });
});

test('refreshes the simulation history right after running a new simulation, without a page reload', async () => {
    ($apiPrivate.post as jest.Mock).mockResolvedValue({
        data: {
            normalized: { fromAddress: 'test@example.com', subject: 'Вопрос про цены', normalizedBody: 'Сколько стоит абонемент?' },
            deterministicSpamReason: null,
            classification: { spam: false, needsReply: true, language: 'ru', intent: 'pricing', confidence: 0.9, reason: '' },
            knowledge: [], crmContact: null, draft: null, draftSkippedReason: 'classification_gate',
            runId: 5, metrics: [],
        },
    });
    renderPage();
    await screen.findByText('Симуляции ещё не запускались');
    ($apiPrivate.get as jest.Mock).mockClear();

    fireEvent.change(screen.getByLabelText('Тема письма *'), { target: { value: 'Вопрос про цены' } });
    fireEvent.change(screen.getByLabelText('Текст письма *'), { target: { value: 'Сколько стоит абонемент?' } });
    fireEvent.click(screen.getByText('Запустить симуляцию'));

    await waitFor(() => {
        expect($apiPrivate.get).toHaveBeenCalledWith('/ai-email/simulation-runs', { params: { _page: 1, _limit: 20, provider: undefined } });
    });
});

test('clicking a history row opens its detail view, and Закрыть hides it again', async () => {
    const historyRunDetail = {
        ...historyRunSummary,
        body: 'Сколько стоит абонемент?',
        classification: { spam: false, needsReply: true, language: 'ru', intent: 'pricing', confidence: 0.9, reason: '' },
        knowledge: [{ id: 'k1', sourceUrl: 'https://ddc.example/pricing', content: 'Абонемент стоит 100 евро', score: 0.8 }],
        draft: { replyLanguage: 'ru', subject: 'Re: Вопрос про цены', body: 'Здравствуйте! Абонемент стоит 100 евро.', confidence: 0.85, needsManualAnswer: false, usedKnowledgeIds: ['k1'] },
    };
    ($apiPrivate.get as jest.Mock).mockImplementation((url: string) => {
        if (url === '/ai-email/simulation-runs/9') return Promise.resolve({ data: historyRunDetail });
        return mockHistoryList(url);
    });
    renderPage();
    const row = await screen.findByText('Вопрос про цены');
    fireEvent.click(row);

    expect(await screen.findByText('Здравствуйте! Абонемент стоит 100 евро.')).toBeInTheDocument();
    expect(screen.getByText('Абонемент стоит 100 евро')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Закрыть'));
    await waitFor(() => {
        expect(screen.queryByText('Здравствуйте! Абонемент стоит 100 евро.')).not.toBeInTheDocument();
    });
});

test('shows an error toast, without crashing, when loading simulation history fails', async () => {
    ($apiPrivate.get as jest.Mock).mockImplementation((url: string) => {
        if (url === '/knowledge/documents') return Promise.resolve({ data: { items: [pendingDocument], total: 1, page: 1, limit: 20, totalPages: 1, pendingTotal: 1 } });
        if (url === '/ai-email/prompts') return Promise.resolve({ data: [] });
        if (url === '/ai-email/simulation-runs') return Promise.reject(new Error('network down'));
        return Promise.resolve({ data: {} });
    });
    renderPage();
    await screen.findByText('Прайс на занятия');
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
});

test('shows an error toast when loading a history row detail fails', async () => {
    ($apiPrivate.get as jest.Mock).mockImplementation((url: string) => {
        if (url === '/ai-email/simulation-runs/9') return Promise.reject(new Error('down'));
        return mockHistoryList(url);
    });
    renderPage();
    const row = await screen.findByText('Вопрос про цены');
    fireEvent.click(row);
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
});
