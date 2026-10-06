import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { toast } from 'react-toastify';
import { createReduxStore, ReduxStoreWithManager } from '@/app/providers/StoreProvider';
import { $apiPrivate } from '@/shared/api/api';
import PaymentRemindersPage from './PaymentRemindersPage';

jest.mock('@/shared/api/api', () => ({
    $api: { get: jest.fn() },
    $apiPrivate: { get: jest.fn(), put: jest.fn(), post: jest.fn() },
    injectStore: jest.fn(),
    csrfActions: { reset: jest.fn() },
}));

jest.mock('react-toastify', () => ({
    toast: { success: jest.fn(), error: jest.fn() },
}));

const settings = {
    offsetDays: 3 as const,
    sendHour: 9,
    sendMinute: 0,
    senderEmailAccountId: null,
    enabled: true,
};

const templates = [
    { language: 'RU' as const, subject: 'Напоминание', bodyHtml: '<p>Text</p>' },
    { language: 'EN' as const, subject: 'Reminder', bodyHtml: '<p>Text</p>' },
    { language: 'NL' as const, subject: 'Herinnering', bodyHtml: '<p>Text</p>' },
];

const deliveries = [
    {
        id: 1,
        targetPaymentDate: '2026-01-20T00:00:00.000Z',
        status: 'SENT' as const,
        language: 'RU' as const,
        recipientEmail: 'ivan@example.com',
        createdAt: '2026-01-15T00:00:00.000Z',
    },
];

beforeEach(() => {
    jest.clearAllMocks();
    ($apiPrivate.get as jest.Mock).mockImplementation((url: string) => {
        if (url === '/payment-reminders/settings') return Promise.resolve({ data: settings });
        if (url === '/email/accounts') return Promise.resolve({ data: [{ id: 1, label: 'Main', username: 'main@ddc.com', isActive: true }] });
        if (url === '/payment-reminders/templates') return Promise.resolve({ data: { templates, placeholders: ['firstName'] } });
        if (url === '/payment-reminders/deliveries') return Promise.resolve({ data: deliveries });
        return Promise.resolve({ data: {} });
    });
});

function renderPage() {
    const store = createReduxStore() as ReduxStoreWithManager;
    return render(
        <Provider store={store}>
            <MemoryRouter>
                <PaymentRemindersPage />
            </MemoryRouter>
        </Provider>,
    );
}

describe('PaymentRemindersPage', () => {
    test('renders the loaded settings and delivery history', async () => {
        renderPage();
        expect(await screen.findByText('ivan@example.com')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Сохранить настройки/ })).toBeInTheDocument();
    });

    test('saves the reminder settings', async () => {
        ($apiPrivate.put as jest.Mock).mockResolvedValue({ data: settings });
        renderPage();
        await screen.findByText('ivan@example.com');

        fireEvent.click(screen.getByRole('button', { name: /Сохранить настройки/ }));

        await waitFor(() => {
            expect($apiPrivate.put).toHaveBeenCalledWith('/payment-reminders/settings', expect.objectContaining({ offsetDays: 3 }));
        });
        expect(toast.success).toHaveBeenCalledWith('Настройки рассылки сохранены');
    });

    test('runs the reminder job now after confirmation', async () => {
        ($apiPrivate.post as jest.Mock).mockResolvedValue({ data: { sent: 2, skipped: 1, failed: 0, alreadyQueued: 0 } });
        jest.spyOn(window, 'confirm').mockReturnValue(true);
        renderPage();
        await screen.findByText('ivan@example.com');

        fireEvent.click(screen.getByRole('button', { name: /Запустить сейчас/ }));

        await waitFor(() => expect($apiPrivate.post).toHaveBeenCalledWith('/payment-reminders/run'));
        expect(toast.success).toHaveBeenCalledWith('Готово: отправлено 2, пропущено 1, ошибок 0');
    });

    test('switches the template language tab', async () => {
        renderPage();
        await screen.findByDisplayValue('Напоминание');

        fireEvent.click(screen.getByRole('button', { name: 'English' }));

        expect(await screen.findByDisplayValue('Reminder')).toBeInTheDocument();
    });

    test('disables the test-send button until an email is entered', async () => {
        renderPage();
        await screen.findByDisplayValue('Напоминание');

        expect(screen.getByRole('button', { name: /Отправить тестовое письмо/ })).toBeDisabled();

        fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'test@example.com' } });

        expect(screen.getByRole('button', { name: /Отправить тестовое письмо/ })).toBeEnabled();
    });

    test('re-fetches deliveries when the status filter changes', async () => {
        renderPage();
        await screen.findByText('ivan@example.com');
        ($apiPrivate.get as jest.Mock).mockClear();

        const statusSelect = screen.getByDisplayValue('Все статусы');
        fireEvent.change(statusSelect, { target: { value: 'SENT' } });

        await waitFor(() => {
            expect($apiPrivate.get).toHaveBeenCalledWith('/payment-reminders/deliveries', { params: { status: 'SENT' } });
        });
    });
});
