import { Provider } from 'react-redux';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { toast } from 'react-toastify';
import { configureStore } from '@reduxjs/toolkit';
import { userReducer } from '@/entities/User';
import { RoleKey } from '@/entities/Role';
import {
    deleteEmailMessage,
    fetchEmailMessage,
    fetchEmailMessages,
} from '@/entities/EmailMessage';
import { ClientEmailBlock } from './ClientEmailBlock';

jest.mock('@/entities/EmailMessage', () => ({
    fetchEmailMessages: jest.fn(),
    fetchEmailMessage: jest.fn(),
    replyToEmailMessage: jest.fn(),
    deleteEmailMessage: jest.fn(),
    markEmailMessageAsSpam: jest.fn(),
    EmailMessageList: ({ messages, onSelect }: {
        messages: { id: string; subject: string }[];
        onSelect: (message: { id: string; subject: string }) => void;
    }) => (
        <div>
            {messages.map((message) => (
                <button key={message.id} type="button" onClick={() => onSelect(message)}>
                    {message.subject}
                </button>
            ))}
        </div>
    ),
    EmailMessageDetail: ({ message, onDelete, onMarkAsSpam }: {
        message: { subject: string };
        onDelete: () => void;
        onMarkAsSpam: () => void;
    }) => (
        <div>
            <span>{message.subject}</span>
            <button type="button" onClick={onDelete}>delete</button>
            <button type="button" onClick={onMarkAsSpam}>spam</button>
        </div>
    ),
}));

jest.mock('react-toastify', () => ({
    toast: { success: jest.fn(), error: jest.fn() },
}));

function renderBlock(role: RoleKey = RoleKey.ADMIN) {
    const store = configureStore({
        reducer: { user: userReducer },
        preloadedState: {
            user: { _inited: true, authData: { id: '1', username: 'denis', email: 'd@example.com', role } },
        },
    });
    return render(<Provider store={store}><ClientEmailBlock id="1" /></Provider>);
}

beforeEach(() => {
    jest.clearAllMocks();
    (fetchEmailMessages as jest.Mock).mockResolvedValue({ items: [], total: 0 });
});

describe('ClientEmailBlock', () => {
    test('renders nothing for a non-admin user', () => {
        const { container } = renderBlock(RoleKey.MANAGER);

        expect(container).toBeEmptyDOMElement();
        expect(fetchEmailMessages).not.toHaveBeenCalled();
    });

    test('loads messages for an admin user', async () => {
        renderBlock();

        expect(await screen.findByText('Переписки с этим клиентом пока нет.')).toBeInTheDocument();
        expect(fetchEmailMessages).toHaveBeenCalledWith({ clientId: 1, page: 1, limit: 25 });
    });

    test('selects a message and shows its detail', async () => {
        (fetchEmailMessages as jest.Mock).mockResolvedValue({
            items: [{ id: 'm1', subject: 'Hello' }],
            total: 1,
        });
        (fetchEmailMessage as jest.Mock).mockResolvedValue({ id: 'm1', subject: 'Hello' });

        renderBlock();

        fireEvent.click(await screen.findByText('Hello'));

        expect(await screen.findByText('delete')).toBeInTheDocument();
        expect(fetchEmailMessage).toHaveBeenCalledWith('m1');
    });

    test('deletes the selected message', async () => {
        (fetchEmailMessages as jest.Mock).mockResolvedValue({
            items: [{ id: 'm1', subject: 'Hello' }],
            total: 1,
        });
        (fetchEmailMessage as jest.Mock).mockResolvedValue({ id: 'm1', subject: 'Hello' });
        (deleteEmailMessage as jest.Mock).mockResolvedValue(undefined);

        renderBlock();
        fireEvent.click(await screen.findByText('Hello'));
        fireEvent.click(await screen.findByText('delete'));

        expect(deleteEmailMessage).toHaveBeenCalledWith('m1');
        await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Письмо удалено'));
    });
});
