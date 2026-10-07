import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { createReduxStore, ReduxStoreWithManager } from '@/app/providers/StoreProvider';
import { applyConversationDisposition, composeEmail, Conversation, replyToConversation, generateDraft, getConversation, listConversations, listProviders, markConversationRead } from '@/entities/crm';
import { CommunicationsPage } from './CommunicationsPage';

jest.mock('@/entities/crm', () => ({
    listConversations: jest.fn(),
    getConversation: jest.fn(),
    listProviders: jest.fn(),
    replyToConversation: jest.fn(),
    generateDraft: jest.fn(),
    approveDraft: jest.fn(),
    rejectDraft: jest.fn(),
    applyConversationDisposition: jest.fn(),
    markConversationRead: jest.fn(),
    composeEmail: jest.fn(),
}), { virtual: true });

const mailboxA = { id: 'mail-a', name: 'DDC NL', type: 'EMAIL', provider: 'IMAP', status: 'CONNECTED', settings: {} };
const mailboxB = { id: 'mail-b', name: 'Camp EU', type: 'EMAIL', provider: 'GMAIL', status: 'CONNECTED', settings: {} };
const conversation: Conversation = {
    id: 'conversation-a', subject: 'Ticket question', status: 'OPEN', lastMessageAt: '2026-10-07T10:00:00.000Z',
    person: { id: 'person-a', firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.test', status: 'ACTIVE', roles: [] },
    messages: [{ id: 'message-a', direction: 'INBOUND', sender: 'ada@example.test', recipient: 'info@example.test', bodyText: 'Can I join?', providerConnectionId: 'mail-a', createdAt: '2026-10-07T10:00:00.000Z' }],
    drafts: [],
};

const renderPage = () => {
    const store = createReduxStore() as ReduxStoreWithManager;
    return render(<Provider store={store}><MemoryRouter><CommunicationsPage /></MemoryRouter></Provider>);
};

beforeEach(() => {
    jest.mocked(listProviders).mockResolvedValue({ data: [mailboxA, mailboxB], total: 2 });
    jest.mocked(listConversations).mockResolvedValue({ data: [conversation], total: 1 });
    jest.mocked(getConversation).mockResolvedValue(conversation);
    jest.mocked(generateDraft).mockResolvedValue({ id: 'draft-a', content: 'AI answer', status: 'GENERATED' });
    jest.mocked(markConversationRead).mockReset();
    jest.mocked(markConversationRead).mockResolvedValue(undefined);
    jest.mocked(composeEmail).mockReset();
    jest.mocked(composeEmail).mockResolvedValue(undefined);
});

test('email workspace filters conversations by connected account', async () => {
    renderPage();

    expect(await screen.findByText('Ticket question')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'All inboxes' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Camp EU' }));

    await waitFor(() => expect(listConversations).toHaveBeenLastCalledWith({ providerConnectionId: 'mail-b' }, 1, 25));
});

test('email workspace opens a thread and places an AI draft in the reply editor', async () => {
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: /Ticket question/ }));
    await waitFor(() => expect(screen.getAllByText('Can I join?').length).toBeGreaterThan(1));
    fireEvent.click(screen.getByRole('button', { name: 'Generate AI draft' }));

    expect(await screen.findByDisplayValue('AI answer')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Approve and send' })).toBeInTheDocument();
});

test('email workspace confirms and moves a conversation to spam', async () => {
    jest.spyOn(window, 'confirm').mockReturnValue(true);
    jest.mocked(applyConversationDisposition).mockResolvedValue(undefined);
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: /Ticket question/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Move to spam' }));

    await waitFor(() => expect(applyConversationDisposition).toHaveBeenCalledWith('conversation-a', 'SPAM'));
    expect(window.confirm).toHaveBeenCalledWith('Move this conversation to spam?');
});

test('an unread conversation is announced on the list and read when opened', async () => {
    jest.mocked(listConversations).mockResolvedValue({ data: [{ ...conversation, unreadCount: 1 }], total: 1 });
    renderPage();

    const item = await screen.findByRole('button', { name: 'Unread — ada@example.test — Ticket question' });
    expect(item).toBeInTheDocument();
    expect(markConversationRead).not.toHaveBeenCalled();

    fireEvent.click(item);

    await waitFor(() => expect(markConversationRead).toHaveBeenCalledWith('conversation-a'));
    expect(await screen.findByRole('button', { name: 'Ticket question' })).toBeInTheDocument();
    expect(listConversations).toHaveBeenCalledTimes(1);
});

test('email workspace loads and appends another conversation page', async () => {
    const secondConversation = { ...conversation, id: 'conversation-b', subject: 'Second question' };
    jest.mocked(listConversations).mockImplementation(async (_filters, page) => (
        page === 2 ? { data: [secondConversation], total: 2 } : { data: [conversation], total: 2 }
    ));
    renderPage();

    expect(await screen.findByText('Ticket question')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Load more' }));

    expect(await screen.findByText('Second question')).toBeInTheDocument();
    expect(screen.getByText('Ticket question')).toBeInTheDocument();
    expect(listConversations).toHaveBeenLastCalledWith({}, 2, 25);
    expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument();
});

test('email workspace keeps loaded pages when a conversation is opened', async () => {
    const secondConversation = { ...conversation, id: 'conversation-b', subject: 'Second question', unreadCount: 1 };
    jest.mocked(listConversations).mockImplementation(async (_filters, page) => (
        page === 2 ? { data: [secondConversation], total: 2 } : { data: [conversation], total: 2 }
    ));
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Load more' }));
    fireEvent.click(await screen.findByRole('button', { name: /Second question/ }));

    await waitFor(() => expect(markConversationRead).toHaveBeenCalledWith('conversation-b'));
    expect(await screen.findByRole('button', { name: 'Second question' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ticket question' })).toBeInTheDocument();
    expect(listConversations).toHaveBeenCalledTimes(2);
});

test('email workspace returns to the first page when the mailbox changes', async () => {
    const secondConversation = { ...conversation, id: 'conversation-b', subject: 'Second question' };
    const filtered = { ...conversation, id: 'conversation-c', subject: 'Camp EU question' };
    jest.mocked(listConversations).mockImplementation(async (filters, page) => {
        if (filters?.providerConnectionId) return { data: [filtered], total: 1 };
        return page === 2 ? { data: [secondConversation], total: 2 } : { data: [conversation], total: 2 };
    });
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Load more' }));
    expect(await screen.findByText('Second question')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Camp EU' }));

    expect(await screen.findByText('Camp EU question')).toBeInTheDocument();
    expect(screen.queryByText('Ticket question')).not.toBeInTheDocument();
    expect(screen.queryByText('Second question')).not.toBeInTheDocument();
    expect(listConversations).not.toHaveBeenCalledWith({ providerConnectionId: 'mail-b' }, 2, 25);
});

const fillLetter = async (recipient: string) => {
    fireEvent.click(await screen.findByRole('button', { name: 'New email' }));
    fireEvent.change(await screen.findByLabelText('To'), { target: { value: recipient } });
    fireEvent.change(screen.getByLabelText('Subject'), { target: { value: 'Camp details' } });
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Hello Anna' } });
};

test('a new email is sent from the chosen mailbox and the inbox is reloaded', async () => {
    renderPage();
    await screen.findByText('Ticket question');

    await fillLetter(' anna@example.test ');
    fireEvent.change(screen.getByLabelText('Send from'), { target: { value: 'mail-b' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => expect(composeEmail).toHaveBeenCalledWith({
        providerConnectionId: 'mail-b', recipient: 'anna@example.test', subject: 'Camp details', content: 'Hello Anna',
    }, []));
    await waitFor(() => expect(listConversations).toHaveBeenCalledTimes(2));
});

test('a new email with an invalid recipient is not sent', async () => {
    renderPage();
    await screen.findByText('Ticket question');

    await fillLetter('anna');
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Enter a valid email address');
    expect(composeEmail).not.toHaveBeenCalled();
});

test('a failed delivery keeps the letter in the form and shows the reason', async () => {
    jest.mocked(composeEmail).mockRejectedValue(new Error('Provider did not confirm delivery'));
    renderPage();
    await screen.findByText('Ticket question');

    await fillLetter('anna@example.test');
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Provider did not confirm delivery');
    expect(screen.getByLabelText('Message')).toHaveValue('Hello Anna');
});

test('a new email carries the attached file, and a removed file is not sent', async () => {
    const price = new File(['pdf'], 'price.pdf', { type: 'application/pdf' });
    const draft = new File(['doc'], 'draft.docx');
    renderPage();
    await screen.findByText('Ticket question');

    await fillLetter('anna@example.test');
    fireEvent.change(screen.getByLabelText('Attach file'), { target: { files: [price, draft] } });
    fireEvent.click(await screen.findByRole('button', { name: 'Remove draft.docx' }));
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => expect(composeEmail).toHaveBeenCalledWith(expect.objectContaining({ recipient: 'anna@example.test' }), [price]));
});

test('a reply carries the attached file', async () => {
    const price = new File(['pdf'], 'price.pdf', { type: 'application/pdf' });
    jest.mocked(replyToConversation).mockResolvedValue({} as never);
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: /Ticket question/ }));
    fireEvent.change(await screen.findByLabelText('Reply message'), { target: { value: 'Here is the price list' } });
    fireEvent.change(screen.getByLabelText('Attach file'), { target: { files: [price] } });
    fireEvent.click(screen.getByRole('button', { name: 'Send reply' }));

    await waitFor(() => expect(replyToConversation).toHaveBeenCalledWith('conversation-a', 'Here is the price list', 'mail-a', [price]));
});

test('files sent with a message are listed in the thread', async () => {
    jest.mocked(getConversation).mockResolvedValue({ ...conversation, messages: [{
        ...conversation.messages![0], direction: 'OUTBOUND', rawData: { attachments: [{ filename: 'price.pdf', contentType: 'application/pdf', size: 20480 }] },
    }] });
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: /Ticket question/ }));

    expect(await screen.findByText('price.pdf')).toBeInTheDocument();
    expect(screen.getByText('20 KB')).toBeInTheDocument();
});

test('the list tells sent, new and opened letters apart', async () => {
    const sent = { ...conversation, id: 'conversation-s', subject: 'Our offer', messages: [{ ...conversation.messages![0], id: 'message-s', direction: 'OUTBOUND' }] };
    const fresh = { ...conversation, id: 'conversation-n', subject: 'Fresh question', unreadCount: 1 };
    jest.mocked(listConversations).mockResolvedValue({ data: [sent, fresh, conversation], total: 3 });
    renderPage();

    const sentItem = await screen.findByRole('button', { name: 'Sent — Our offer' });
    expect(sentItem).toHaveTextContent('To: ada@example.test');
    expect(sentItem).not.toHaveTextContent('Incoming');
    const freshItem = screen.getByRole('button', { name: 'Unread — ada@example.test — Fresh question' });
    expect(freshItem).toHaveTextContent('Incoming');
    expect(freshItem).toHaveTextContent('New');
    expect(screen.getByRole('button', { name: 'Ticket question' })).toHaveTextContent('Opened');
});
