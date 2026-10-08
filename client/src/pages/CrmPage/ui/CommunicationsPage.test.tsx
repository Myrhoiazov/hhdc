import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { createReduxStore, ReduxStoreWithManager } from '@/app/providers/StoreProvider';
import { applyConversationDisposition, approveDraft, composeEmail, Conversation, rejectDraft, replyToConversation, generateDraft, getConversation, listConversations, listPrompts, listProviders, markConversationRead } from '@/entities/crm';
import { CommunicationsPage } from './CommunicationsPage';

jest.mock('@/entities/crm', () => ({
    isClient: (person?: { _count?: { orders: number } } | null) => (person?._count?.orders ?? 0) > 0,
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
    listPrompts: jest.fn(),
}), { virtual: true });

const mailboxA = { id: 'mail-a', name: 'DDC NL', type: 'EMAIL', provider: 'IMAP', status: 'CONNECTED', settings: {} };
const aiProvider = { id: 'ai-1', name: 'Ollama (local)', type: 'AI', provider: 'OLLAMA', status: 'CONNECTED', settings: { model: 'qwen3:1.7b' } };
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
    jest.mocked(listPrompts).mockResolvedValue([]);
    jest.mocked(listConversations).mockResolvedValue({ data: [conversation], total: 1 });
    jest.mocked(getConversation).mockResolvedValue(conversation);
    jest.mocked(generateDraft).mockResolvedValue({ id: 'draft-a', content: 'AI answer', status: 'GENERATED' });
    jest.mocked(generateDraft).mockClear();
    jest.mocked(approveDraft).mockReset();
    jest.mocked(approveDraft).mockResolvedValue({} as never);
    jest.mocked(rejectDraft).mockReset();
    jest.mocked(rejectDraft).mockResolvedValue({} as never);
    jest.mocked(replyToConversation).mockReset();
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

test('an AI draft lands in the reply field and sending it approves the edited text', async () => {
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: /Ticket question/ }));
    await waitFor(() => expect(screen.getAllByText('Can I join?').length).toBeGreaterThan(1));
    fireEvent.click(screen.getByRole('button', { name: 'Generate AI draft' }));

    const reply = await screen.findByLabelText('Reply message');
    await waitFor(() => expect(reply).toHaveValue('AI answer'));
    expect(generateDraft).toHaveBeenCalledWith('conversation-a', {});
    fireEvent.change(reply, { target: { value: 'AI answer, edited' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send reply' }));

    await waitFor(() => expect(approveDraft).toHaveBeenCalledWith('draft-a', 'AI answer, edited', []));
    expect(replyToConversation).not.toHaveBeenCalled();
});

test('a draft can be generated on a chosen provider and model, and discarded', async () => {
    jest.mocked(listProviders).mockResolvedValue({ data: [mailboxA, mailboxB, aiProvider], total: 3 });
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: /Ticket question/ }));
    fireEvent.change(await screen.findByLabelText('AI model for this reply (testing)'), { target: { value: 'ai-1' } });
    expect(screen.getByLabelText('Model')).toHaveAttribute('placeholder', 'qwen3:1.7b');
    fireEvent.change(screen.getByLabelText('Model'), { target: { value: 'gpt-4o-mini' } });
    fireEvent.click(screen.getByRole('button', { name: 'Generate AI draft' }));

    await waitFor(() => expect(generateDraft).toHaveBeenCalledWith('conversation-a', { providerConnectionId: 'ai-1', model: 'gpt-4o-mini' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Discard AI draft' }));
    await waitFor(() => expect(rejectDraft).toHaveBeenCalledWith('draft-a'));
    await waitFor(() => expect(screen.getByLabelText('Reply message')).toHaveValue(''));
});

test('without a connected AI provider there is no model picker', async () => {
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: /Ticket question/ }));
    await screen.findByLabelText('Reply message');
    expect(screen.queryByLabelText('AI model for this reply (testing)')).not.toBeInTheDocument();
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

test('the inbox reloads when a letter has been sent from the header', async () => {
    renderPage();
    await screen.findByText('Ticket question');
    expect(screen.queryByRole('button', { name: 'New email' })).not.toBeInTheDocument();

    window.dispatchEvent(new Event('crm:email-sent'));

    await waitFor(() => expect(listConversations).toHaveBeenCalledTimes(2));
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

test('an AI draft says when a person has to check it', async () => {
    jest.mocked(getConversation).mockResolvedValue({ ...conversation, drafts: [{
        id: 'draft-r', content: 'Draft text', status: 'GENERATED', confidence: 0.3,
        contextSnapshot: { needsStaffReview: true, warnings: ['no_current_facts'] },
    }] });
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: /Ticket question/ }));

    expect(await screen.findByText('Needs staff review')).toBeInTheDocument();
    expect(screen.getByText('Confidence: 30%')).toBeInTheDocument();
    expect(screen.getByText('no_current_facts')).toBeInTheDocument();
});

test('a draft can be written with a saved reply prompt that is not active yet', async () => {
    jest.mocked(listProviders).mockResolvedValue({ data: [mailboxA, mailboxB, aiProvider], total: 3 });
    jest.mocked(listPrompts).mockResolvedValue([
        { id: 'prompt-2', key: 'email_draft_body', version: 2, purpose: 'Shorter tone', systemPrompt: 'Answer briefly.', status: 'DRAFT', createdAt: '2026-10-07T10:00:00.000Z' },
        { id: 'prompt-c', key: 'email_classification', version: 1, purpose: 'Classifier', systemPrompt: 'Classify.', status: 'ACTIVE', createdAt: '2026-10-07T10:00:00.000Z' },
    ]);
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: /Ticket question/ }));
    const prompt = await screen.findByLabelText('Reply prompt');
    expect(screen.getByRole('option', { name: 'v2 · Shorter tone (DRAFT)' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Classifier/ })).not.toBeInTheDocument();
    fireEvent.change(prompt, { target: { value: 'prompt-2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Generate AI draft' }));

    await waitFor(() => expect(generateDraft).toHaveBeenCalledWith('conversation-a', { draftPromptId: 'prompt-2' }));
});

test('people who cannot read prompt versions still get the reply form', async () => {
    jest.mocked(listProviders).mockResolvedValue({ data: [mailboxA, mailboxB, aiProvider], total: 3 });
    jest.mocked(listPrompts).mockRejectedValue(new Error('Permission required'));
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: /Ticket question/ }));
    await screen.findByLabelText('AI model for this reply (testing)');
    expect(screen.queryByLabelText('Reply prompt')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

test('a letter from a person with purchases is labelled as a client in the list and in the thread', async () => {
    const buyer = { ...conversation.person!, _count: { orders: 2 } };
    jest.mocked(listConversations).mockResolvedValue({ data: [{ ...conversation, person: buyer }], total: 1 });
    jest.mocked(getConversation).mockResolvedValue({ ...conversation, person: buyer });
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: /Ticket question/ }));
    await waitFor(() => expect(screen.getAllByText('Client')).toHaveLength(2));
    expect(screen.getByRole('link', { name: 'Open contact card' })).toHaveAttribute('href', '/people/person-a');
});

test('a letter from someone without purchases has no client label', async () => {
    renderPage();

    await screen.findByText('Ticket question');
    expect(screen.queryByText('Client')).not.toBeInTheDocument();
});
