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

const draftPrompt = {
    id: 1, slot: 'DRAFT_BODY', name: 'v2 — короче', content: 'Отвечай короче.', tags: ['эксперимент'],
    isActive: false, createdAt: '2026-01-01', updatedAt: '2026-01-01',
};
const classificationPrompt = {
    id: 2, slot: 'CLASSIFICATION', name: 'base', content: 'Classify.', tags: [],
    isActive: true, createdAt: '2026-01-01', updatedAt: '2026-01-01',
};

test('lists saved prompts grouped by slot with an active badge', async () => {
    ($apiPrivate.get as jest.Mock).mockImplementation((url: string) => {
        if (url === '/ai-email/prompts') return Promise.resolve({ data: [draftPrompt, classificationPrompt] });
        if (url === '/knowledge/documents') {
            return Promise.resolve({ data: { items: [pendingDocument], total: 1, page: 1, limit: 20, totalPages: 1, pendingTotal: 1 } });
        }
        return Promise.resolve({ data: {} });
    });
    renderPage();

    expect((await screen.findAllByText('v2 — короче')).length).toBeGreaterThan(0);
    expect(screen.getByText('base')).toBeInTheDocument();
    expect(screen.getByText('Активен')).toBeInTheDocument();
    expect(screen.getByText('Неактивен')).toBeInTheDocument();
});

test('creates a new prompt', async () => {
    ($apiPrivate.get as jest.Mock).mockImplementation((url: string) => {
        if (url === '/ai-email/prompts') return Promise.resolve({ data: [] });
        if (url === '/knowledge/documents') {
            return Promise.resolve({ data: { items: [pendingDocument], total: 1, page: 1, limit: 20, totalPages: 1, pendingTotal: 1 } });
        }
        return Promise.resolve({ data: {} });
    });
    ($apiPrivate.post as jest.Mock).mockResolvedValue({ data: draftPrompt });
    renderPage();
    await screen.findByText('Прайс на занятия');

    fireEvent.change(screen.getByPlaceholderText('v2 — короче'), { target: { value: 'v2 — короче' } });
    fireEvent.change(screen.getByLabelText('Текст промпта'), { target: { value: 'Отвечай короче.' } });
    fireEvent.click(screen.getByText('Создать'));

    await waitFor(() => {
        expect($apiPrivate.post).toHaveBeenCalledWith('/ai-email/prompts', expect.objectContaining({
            slot: 'DRAFT_BODY', name: 'v2 — короче', content: 'Отвечай короче.',
        }));
    });
    expect(toast.success).toHaveBeenCalledWith('Промпт создан');
});

test('activates a prompt', async () => {
    ($apiPrivate.get as jest.Mock).mockImplementation((url: string) => {
        if (url === '/ai-email/prompts') return Promise.resolve({ data: [draftPrompt] });
        if (url === '/knowledge/documents') {
            return Promise.resolve({ data: { items: [pendingDocument], total: 1, page: 1, limit: 20, totalPages: 1, pendingTotal: 1 } });
        }
        return Promise.resolve({ data: {} });
    });
    ($apiPrivate.post as jest.Mock).mockResolvedValue({ data: { ...draftPrompt, isActive: true } });
    renderPage();
    await screen.findByText('Активировать');

    fireEvent.click(screen.getByText('Активировать'));

    await waitFor(() => expect($apiPrivate.post).toHaveBeenCalledWith('/ai-email/prompts/1/activate'));
    expect(toast.success).toHaveBeenCalledWith('Промпт активирован — теперь используется и в реальных письмах');
});

test('sends the selected prompt id when running a simulation with a specific draft prompt', async () => {
    ($apiPrivate.get as jest.Mock).mockImplementation((url: string) => {
        if (url === '/ai-email/prompts') return Promise.resolve({ data: [draftPrompt] });
        if (url === '/knowledge/documents') {
            return Promise.resolve({ data: { items: [pendingDocument], total: 1, page: 1, limit: 20, totalPages: 1, pendingTotal: 1 } });
        }
        return Promise.resolve({ data: {} });
    });
    ($apiPrivate.post as jest.Mock).mockResolvedValue({
        data: {
            normalized: { fromAddress: 'test@example.com', subject: 's', normalizedBody: 'b' },
            deterministicSpamReason: null,
            classification: { spam: false, needsReply: true, language: 'ru', intent: 'other', confidence: 0.5, reason: '' },
            knowledge: [], crmContact: null, draft: null, draftSkippedReason: 'classification_gate',
            runId: null, metrics: [],
        },
    });
    renderPage();
    await screen.findByText('Активировать');

    fireEvent.change(screen.getByLabelText('Тема письма *'), { target: { value: 's' } });
    fireEvent.change(screen.getByLabelText('Текст письма *'), { target: { value: 'b' } });
    fireEvent.change(screen.getByLabelText('Промпт черновика'), { target: { value: '1' } });
    fireEvent.click(screen.getByText('Запустить симуляцию'));

    await waitFor(() => {
        expect($apiPrivate.post).toHaveBeenCalledWith('/ai-email/simulate', expect.objectContaining({ draftBodyPromptId: 1 }));
    });
});
