import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { userReducer } from '@/entities/User';
import { uiReducer } from '@/features/UI';
import { RoleKey } from '@/entities/Role';
import { fetchEmailAccounts } from '@/entities/EmailAccount';
import { fetchEmailMessage, fetchEmailMessages } from '@/entities/EmailMessage';
import EmailPage from './EmailPage';

jest.mock('@/entities/EmailAccount', () => ({
    fetchEmailAccounts: jest.fn(),
    createEmailAccount: jest.fn(),
    deleteEmailAccount: jest.fn(),
    syncEmailAccount: jest.fn(),
}));

jest.mock('@/entities/EmailMessage', () => ({
    fetchEmailMessages: jest.fn(),
    fetchEmailMessage: jest.fn(),
    replyToEmailMessage: jest.fn(),
    deleteEmailMessage: jest.fn(),
    markEmailMessageAsSpam: jest.fn(),
    sendEmailMessage: jest.fn(),
    EmailMessageList: ({ messages, onSelect }: {
        messages: { id: string; subject: string }[];
        onSelect: (message: { id: string; subject: string }) => void;
    }) => (
        <div>
            {messages.map((message) => (
                <button key={message.id} type="button" onClick={() => onSelect(message)}>{message.subject}</button>
            ))}
        </div>
    ),
    EmailMessageDetail: () => <div>message-detail</div>,
    EmailComposer: () => <div>composer</div>,
}));

function renderPage(role: RoleKey = RoleKey.ADMIN) {
    const store = configureStore({
        reducer: { user: userReducer, ui: uiReducer },
        preloadedState: {
            user: { _inited: true, authData: { id: '1', username: 'denis', email: 'd@example.com', role } },
            ui: { scroll: {} },
        },
    });
    return render(
        <Provider store={store}>
            <MemoryRouter>
                <EmailPage />
            </MemoryRouter>
        </Provider>,
    );
}

beforeEach(() => {
    jest.clearAllMocks();
    (fetchEmailAccounts as jest.Mock).mockResolvedValue([]);
    (fetchEmailMessages as jest.Mock).mockResolvedValue({ items: [], total: 0 });
});

describe('EmailPage', () => {
    test('shows an access-denied message for a non-admin user', () => {
        renderPage(RoleKey.MANAGER);

        expect(screen.getByText('Доступ запрещён')).toBeInTheDocument();
        expect(fetchEmailAccounts).not.toHaveBeenCalled();
    });

    test('loads accounts and messages for an admin user', async () => {
        renderPage();

        await waitFor(() => expect(fetchEmailAccounts).toHaveBeenCalled());
        await waitFor(() => expect(fetchEmailMessages).toHaveBeenCalledWith({
            mailboxId: undefined, search: undefined, page: 1, limit: 25,
        }));
    });

    test('switches to the accounts tab', async () => {
        (fetchEmailAccounts as jest.Mock).mockResolvedValue([
            { id: 1, label: 'info@ddc.nl', imapHost: 'mail.example.com', username: 'info', lastSyncedAt: null },
        ]);
        renderPage();
        await waitFor(() => expect(fetchEmailAccounts).toHaveBeenCalled());

        fireEvent.click(screen.getByRole('tab', { name: 'Аккаунты' }));

        expect(await screen.findByText('Подключённые аккаунты')).toBeInTheDocument();
    });

    test('the compose button is disabled without any connected accounts', async () => {
        renderPage();
        await waitFor(() => expect(fetchEmailAccounts).toHaveBeenCalled());

        expect(screen.getByRole('button', { name: 'Написать письмо' })).toBeDisabled();
    });

    test('selecting a message shows its detail', async () => {
        (fetchEmailMessages as jest.Mock).mockResolvedValue({
            items: [{ id: 'm1', subject: 'Hello' }],
            total: 1,
        });
        (fetchEmailMessage as jest.Mock).mockResolvedValue({ id: 'm1', subject: 'Hello' });
        renderPage();

        fireEvent.click(await screen.findByText('Hello'));

        expect(await screen.findByText('message-detail')).toBeInTheDocument();
    });
});
