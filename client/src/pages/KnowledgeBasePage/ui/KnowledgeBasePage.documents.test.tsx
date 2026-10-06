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

test('renders loaded documents with their status', async () => {
    renderPage();
    expect(await screen.findByText('Прайс на занятия')).toBeInTheDocument();
    expect(screen.getByText('Ожидает эмбеддинга')).toBeInTheDocument();
});

test('crawls a URL with the selected category and tags', async () => {
    ($apiPrivate.post as jest.Mock).mockResolvedValue({ data: { id: 'manual:new', status: 'PENDING' } });
    renderPage();
    await screen.findByText('Прайс на занятия');

    fireEvent.change(screen.getByPlaceholderText('https://...'), { target: { value: 'https://example.com/page' } });
    fireEvent.click(screen.getByText('Собрать по ссылке'));

    await waitFor(() => {
        expect($apiPrivate.post).toHaveBeenCalledWith('/knowledge/documents/crawl', expect.objectContaining({
            url: 'https://example.com/page', category: 'OTHER', priority: 0, tags: '',
        }));
    });
    expect(toast.success).toHaveBeenCalledWith('Страница собрана, ожидает эмбеддинга');
});

test('does not crawl without a URL', async () => {
    renderPage();
    await screen.findByText('Прайс на занятия');

    fireEvent.click(screen.getByText('Собрать по ссылке'));

    expect($apiPrivate.post).not.toHaveBeenCalled();
});

test('runs embedding for a pending document', async () => {
    ($apiPrivate.post as jest.Mock).mockResolvedValue({ data: { status: 'ACTIVE', chunks: 3 } });
    renderPage();
    await screen.findByText('Прайс на занятия');

    fireEvent.click(screen.getByText('Запустить эмбеддинг'));

    await waitFor(() => expect($apiPrivate.post).toHaveBeenCalledWith('/knowledge/documents/manual%3Aabc/embed'));
    expect(toast.success).toHaveBeenCalledWith('Эмбеддинг запущен');
});

test('deletes a document after confirmation', async () => {
    ($apiPrivate.delete as jest.Mock).mockResolvedValue({});
    jest.spyOn(window, 'confirm').mockReturnValue(true);
    renderPage();
    await screen.findByText('Прайс на занятия');

    fireEvent.click(screen.getByText('Удалить'));

    await waitFor(() => expect($apiPrivate.delete).toHaveBeenCalledWith('/knowledge/documents/manual%3Aabc'));
});

test('paginates documents 20 per page and requests the next page on click', async () => {
    ($apiPrivate.get as jest.Mock).mockImplementation((url: string, config?: { params?: { _page?: number } }) => {
        if (url === '/ai-email/prompts') return Promise.resolve({ data: [] });
        if (url !== '/knowledge/documents') return Promise.resolve({ data: {} });
        const page = config?.params?._page ?? 1;
        const items = page === 1 ? [pendingDocument] : [{ ...pendingDocument, id: 'manual:def', title: 'Второй документ' }];
        return Promise.resolve({ data: { items, total: 21, page, limit: 20, totalPages: 2, pendingTotal: 1 } });
    });
    renderPage();
    expect(await screen.findByText('Прайс на занятия')).toBeInTheDocument();
    expect(screen.getByText('1–20 из 21')).toBeInTheDocument();
    expect(screen.getByText('1 / 2')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Следующая страница'));

    await waitFor(() => {
        expect($apiPrivate.get).toHaveBeenCalledWith('/knowledge/documents', { params: { _page: 2, _limit: 20 } });
    });
    expect(await screen.findByText('Второй документ')).toBeInTheDocument();
    expect(screen.getByText('21–21 из 21')).toBeInTheDocument();
    expect(screen.getByLabelText('Следующая страница')).toBeDisabled();
});
