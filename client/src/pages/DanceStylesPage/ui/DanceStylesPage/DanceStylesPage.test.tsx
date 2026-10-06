import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { toast } from 'react-toastify';
import { createReduxStore, ReduxStoreWithManager } from '@/app/providers/StoreProvider';
import { $apiPrivate } from '@/shared/api/api';
import DanceStylesPage from './DanceStylesPage';

jest.mock('@/shared/api/api', () => ({
    $api: { get: jest.fn() },
    $apiPrivate: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
    injectStore: jest.fn(),
    csrfActions: { reset: jest.fn() },
}));

jest.mock('react-toastify', () => ({
    toast: { success: jest.fn(), error: jest.fn() },
}));

const styles = [
    { id: 1, name: 'Hip-Hop', description: 'Street style', isActive: true },
];

beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    ($apiPrivate.get as jest.Mock).mockResolvedValue({ data: { items: styles } });
});

afterEach(() => {
    jest.useRealTimers();
});

function renderPage() {
    const store = createReduxStore() as ReduxStoreWithManager;
    return render(
        <Provider store={store}>
            <MemoryRouter>
                <DanceStylesPage />
            </MemoryRouter>
        </Provider>,
    );
}

async function flushDebounce() {
    await act(async () => {
        jest.advanceTimersByTime(250);
    });
}

describe('DanceStylesPage', () => {
    test('loads and renders the style list after the debounce', async () => {
        renderPage();
        await flushDebounce();

        expect(await screen.findByText('Hip-Hop')).toBeInTheDocument();
    });

    test('opens the create modal', async () => {
        renderPage();
        await flushDebounce();
        await screen.findByText('Hip-Hop');

        fireEvent.click(screen.getByText('+ Добавить стиль'));

        expect(screen.getByText('Добавить стиль')).toBeInTheDocument();
    });

    test('rejects saving without a Russian name', async () => {
        renderPage();
        await flushDebounce();
        await screen.findByText('Hip-Hop');

        fireEvent.click(screen.getByText('+ Добавить стиль'));
        fireEvent.click(screen.getByText('Сохранить стиль'));

        expect(toast.error).toHaveBeenCalledWith('Укажите название на русском');
        expect($apiPrivate.post).not.toHaveBeenCalled();
    });

    test('toggles a style active flag', async () => {
        ($apiPrivate.put as jest.Mock).mockResolvedValue({});
        const { container } = renderPage();
        await flushDebounce();
        await screen.findByText('Hip-Hop');

        const toggleButton = container.querySelector('.cardTitle button.switch') as HTMLElement;
        fireEvent.click(toggleButton);

        expect($apiPrivate.put).toHaveBeenCalledWith('/schedule/style-cards/1', { ...styles[0], isActive: false });
    });
});
