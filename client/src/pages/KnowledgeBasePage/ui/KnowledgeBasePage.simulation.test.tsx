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

test('runs an email simulation and renders the classification, retrieved knowledge, and draft', async () => {
    ($apiPrivate.post as jest.Mock).mockResolvedValue({
        data: {
            normalized: { fromAddress: 'test@example.com', subject: 'Вопрос про цены', normalizedBody: 'Сколько стоит абонемент?' },
            deterministicSpamReason: null,
            classification: { spam: false, needsReply: true, language: 'ru', intent: 'pricing', confidence: 0.9, reason: '' },
            knowledge: [{ id: 'k1', sourceUrl: 'https://ddc.example/pricing', content: 'Абонемент стоит 100 евро в месяц', score: 0.82 }],
            crmContact: null,
            draft: { replyLanguage: 'ru', subject: 'Re: Вопрос про цены', body: 'Здравствуйте! Абонемент стоит 100 евро в месяц.', confidence: 0.85, needsManualAnswer: false, usedKnowledgeIds: ['k1'] },
            draftSkippedReason: null,
            runId: null, metrics: [],
        },
    });
    renderPage();
    await screen.findByText('Прайс на занятия');

    fireEvent.change(screen.getByLabelText('Тема письма *'), { target: { value: 'Вопрос про цены' } });
    fireEvent.change(screen.getByLabelText('Текст письма *'), { target: { value: 'Сколько стоит абонемент?' } });
    fireEvent.click(screen.getByText('Запустить симуляцию'));

    await waitFor(() => {
        expect($apiPrivate.post).toHaveBeenCalledWith('/ai-email/simulate', expect.objectContaining({
            subject: 'Вопрос про цены', body: 'Сколько стоит абонемент?', noKnowledge: false, forceDraft: false,
        }));
    });
    expect(await screen.findByText('Здравствуйте! Абонемент стоит 100 евро в месяц.')).toBeInTheDocument();
    expect(screen.getByText('Абонемент стоит 100 евро в месяц')).toBeInTheDocument();
});

test('renders per-stage metrics (model, duration, tokens) after a simulation run', async () => {
    ($apiPrivate.post as jest.Mock).mockResolvedValue({
        data: {
            normalized: { fromAddress: 'test@example.com', subject: 'Вопрос про цены', normalizedBody: 'Сколько стоит абонемент?' },
            deterministicSpamReason: null,
            classification: { spam: false, needsReply: true, language: 'ru', intent: 'pricing', confidence: 0.9, reason: '' },
            knowledge: [],
            crmContact: null,
            draft: { replyLanguage: 'ru', subject: 'Re: Вопрос про цены', body: 'Здравствуйте!', confidence: 0.85, needsManualAnswer: false, usedKnowledgeIds: [] },
            draftSkippedReason: null,
            runId: 7,
            metrics: [
                { stage: 'CLASSIFICATION', provider: 'OLLAMA', model: 'qwen3:0.6b', callCount: 1, durationMs: 214, promptTokens: 120, completionTokens: 30, totalTokens: 150 },
                { stage: 'DRAFT', provider: 'OPENAI', model: 'gpt-4o-mini', callCount: 1, durationMs: 980, promptTokens: 512, completionTokens: 96, totalTokens: 608 },
            ],
        },
    });
    renderPage();
    await screen.findByText('Прайс на занятия');

    fireEvent.change(screen.getByLabelText('Тема письма *'), { target: { value: 'Вопрос про цены' } });
    fireEvent.change(screen.getByLabelText('Текст письма *'), { target: { value: 'Сколько стоит абонемент?' } });
    fireEvent.click(screen.getByText('Запустить симуляцию'));

    expect(await screen.findByText(/qwen3:0.6b/)).toBeInTheDocument();
    expect(screen.getByText(/120→30 токенов/)).toBeInTheDocument();
    expect(screen.getByText(/gpt-4o-mini/)).toBeInTheDocument();
    expect(screen.getByText(/512→96 токенов/)).toBeInTheDocument();
});

test('displays the query expansion result and can disable expansion/rerank per run', async () => {
    ($apiPrivate.post as jest.Mock).mockResolvedValue({
        data: {
            normalized: { fromAddress: 'test@example.com', subject: 'Вопрос про цены', normalizedBody: 'Сколько стоит абонемент?' },
            deterministicSpamReason: null,
            classification: { spam: false, needsReply: true, language: 'ru', intent: 'pricing', confidence: 0.9, reason: '' },
            knowledge: [{ id: 'k1', sourceUrl: 'https://ddc.example/pricing', content: 'Абонемент стоит 100 евро в месяц', score: 0.82 }],
            queryExpansion: { cleanQuery: 'цена абонемента', keywords: ['цена', 'абонемент'] },
            crmContact: null,
            draft: null,
            draftSkippedReason: 'classification_gate',
            runId: null, metrics: [],
        },
    });
    renderPage();
    await screen.findByText('Прайс на занятия');

    fireEvent.change(screen.getByLabelText('Тема письма *'), { target: { value: 'Вопрос про цены' } });
    fireEvent.change(screen.getByLabelText('Текст письма *'), { target: { value: 'Сколько стоит абонемент?' } });
    fireEvent.click(screen.getByLabelText('Без расширения запроса'));
    fireEvent.click(screen.getByLabelText('Без реранкинга'));
    fireEvent.click(screen.getByText('Запустить симуляцию'));

    await waitFor(() => {
        expect($apiPrivate.post).toHaveBeenCalledWith('/ai-email/simulate', expect.objectContaining({
            noQueryExpansion: true, noRerank: true,
        }));
    });
    expect(await screen.findByText(/цена абонемента/)).toBeInTheDocument();
    expect(screen.getByText(/цена, абонемент/)).toBeInTheDocument();
});

test('does not run a simulation without subject and body', async () => {
    renderPage();
    await screen.findByText('Прайс на занятия');

    fireEvent.click(screen.getByText('Запустить симуляцию'));

    expect($apiPrivate.post).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith('Укажите тему и текст письма');
});

test('shows the deterministic spam reason instead of running classification/draft', async () => {
    ($apiPrivate.post as jest.Mock).mockResolvedValue({
        data: {
            normalized: { fromAddress: 'test@example.com', subject: 'Выиграйте деньги', normalizedBody: 'you won the lottery' },
            deterministicSpamReason: 'obvious_spam_keyword',
            classification: null,
            knowledge: [],
            crmContact: null,
            draft: null,
            draftSkippedReason: 'deterministic_spam',
            runId: null, metrics: [],
        },
    });
    renderPage();
    await screen.findByText('Прайс на занятия');

    fireEvent.change(screen.getByLabelText('Тема письма *'), { target: { value: 'Выиграйте деньги' } });
    fireEvent.change(screen.getByLabelText('Текст письма *'), { target: { value: 'you won the lottery' } });
    fireEvent.click(screen.getByText('Запустить симуляцию'));

    expect(await screen.findByText(/obvious_spam_keyword/)).toBeInTheDocument();
});
