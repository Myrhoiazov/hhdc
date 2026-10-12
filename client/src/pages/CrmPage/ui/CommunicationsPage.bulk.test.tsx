import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { createReduxStore, ReduxStoreWithManager } from '@/app/providers/StoreProvider';
import { applyBulkConversationDisposition, Conversation, getConversation, getUnreadByMailbox, listConversations, listPrompts, listProviders, markConversationRead } from '@/entities/crm';
import { CommunicationsPage } from './CommunicationsPage';

jest.mock('@/entities/crm', () => ({
    isClient: () => false,
    listConversations: jest.fn(),
    getConversation: jest.fn(),
    listProviders: jest.fn(),
    applyConversationDisposition: jest.fn(),
    applyBulkConversationDisposition: jest.fn(),
    markConversationRead: jest.fn(),
    listPrompts: jest.fn(),
    getUnreadByMailbox: jest.fn(),
}), { virtual: true });

const mailbox = { id: 'mail-a', name: 'DDC NL', type: 'EMAIL', provider: 'IMAP', status: 'CONNECTED', settings: {} };
const letter = (id: string, subject: string): Conversation => ({
    id, subject, status: 'OPEN', lastMessageAt: '2026-10-07T10:00:00.000Z',
    person: { id: `person-${id}`, firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.test', status: 'ACTIVE', roles: [] },
    messages: [{ id: `message-${id}`, direction: 'INBOUND', sender: 'ada@example.test', recipient: 'info@example.test', bodyText: 'Hello', providerConnectionId: 'mail-a', createdAt: '2026-10-07T10:00:00.000Z' }],
    drafts: [],
});
const letters = [letter('a', 'Ticket question'), letter('b', 'Win a prize'), letter('c', 'Hotel booking')];

const renderPage = () => {
    const store = createReduxStore() as ReduxStoreWithManager;
    return render(<Provider store={store}><MemoryRouter><CommunicationsPage /></MemoryRouter></Provider>);
};
// The test i18n returns keys as they are, so texts with numbers show their placeholders.
const pick = async (subject: string) => fireEvent.click(await screen.findByRole('checkbox', { name: `Select conversation — ${subject}` }));

beforeEach(() => {
    jest.restoreAllMocks();
    jest.mocked(listProviders).mockResolvedValue({ data: [mailbox], total: 1 });
    jest.mocked(listPrompts).mockResolvedValue([]);
    jest.mocked(getUnreadByMailbox).mockResolvedValue({});
    jest.mocked(listConversations).mockReset();
    jest.mocked(listConversations).mockResolvedValue({ data: letters, total: 3 });
    jest.mocked(getConversation).mockResolvedValue(letters[0]);
    jest.mocked(markConversationRead).mockResolvedValue(undefined);
    jest.mocked(applyBulkConversationDisposition).mockReset();
    jest.mocked(applyBulkConversationDisposition).mockResolvedValue({ applied: [], failed: [] });
});

test('the bulk actions appear only while conversations are selected', async () => {
    renderPage();
    await screen.findByText('Ticket question');
    expect(screen.queryByRole('region', { name: 'Actions for selected conversations' })).not.toBeInTheDocument();

    await pick('Ticket question');
    await pick('Win a prize');

    expect(screen.getByRole('region', { name: 'Actions for selected conversations' })).toHaveTextContent('Selected: 2');
    fireEvent.click(screen.getByRole('button', { name: 'Clear selection' }));
    expect(screen.queryByRole('region', { name: 'Actions for selected conversations' })).not.toBeInTheDocument();
});

test('selecting a conversation does not open it', async () => {
    renderPage();

    await pick('Ticket question');

    expect(markConversationRead).not.toHaveBeenCalled();
    expect(getConversation).not.toHaveBeenCalled();
});

test('the selected conversations are moved to spam after confirmation and the list reloads', async () => {
    jest.spyOn(window, 'confirm').mockReturnValue(true);
    jest.mocked(applyBulkConversationDisposition).mockResolvedValue({ applied: ['a', 'b'], failed: [] });
    renderPage();
    await pick('Ticket question');
    await pick('Win a prize');
    jest.mocked(listConversations).mockResolvedValue({ data: [letters[2]], total: 1 });

    fireEvent.click(screen.getByRole('button', { name: 'Move selected to spam' }));

    await waitFor(() => expect(applyBulkConversationDisposition).toHaveBeenCalledWith(['a', 'b'], 'SPAM'));
    expect(window.confirm).toHaveBeenCalledWith('Move selected conversations to spam ({{count}})?');
    await waitFor(() => expect(screen.queryByText('Win a prize')).not.toBeInTheDocument());
    expect(screen.queryByRole('region', { name: 'Actions for selected conversations' })).not.toBeInTheDocument();
});

test('nothing is deleted when the confirmation is declined', async () => {
    jest.spyOn(window, 'confirm').mockReturnValue(false);
    renderPage();
    await pick('Ticket question');

    fireEvent.click(screen.getByRole('button', { name: 'Delete selected' }));

    expect(window.confirm).toHaveBeenCalledWith('Move selected conversations to trash ({{count}})?');
    expect(applyBulkConversationDisposition).not.toHaveBeenCalled();
});

test('select all marks every loaded conversation and deletes them together', async () => {
    jest.spyOn(window, 'confirm').mockReturnValue(true);
    jest.mocked(applyBulkConversationDisposition).mockResolvedValue({ applied: ['a', 'b', 'c'], failed: [] });
    renderPage();
    await screen.findByText('Ticket question');

    fireEvent.click(screen.getByRole('checkbox', { name: 'Select all loaded conversations' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete selected' }));

    await waitFor(() => expect(applyBulkConversationDisposition).toHaveBeenCalledWith(['a', 'b', 'c'], 'TRASH'));
});

test('conversations the mailbox refused stay selected and the failure is reported', async () => {
    jest.spyOn(window, 'confirm').mockReturnValue(true);
    jest.mocked(applyBulkConversationDisposition).mockResolvedValue({ applied: ['a'], failed: [{ id: 'b', code: 'REMOTE_MAILBOX_UPDATE_FAILED' }] });
    renderPage();
    await pick('Ticket question');
    await pick('Win a prize');
    jest.mocked(listConversations).mockResolvedValue({ data: [letters[1], letters[2]], total: 2 });

    fireEvent.click(screen.getByRole('button', { name: 'Delete selected' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not process {{failed}} of {{total}}');
    expect(screen.getByRole('checkbox', { name: 'Select conversation — Win a prize' })).toBeChecked();
    expect(screen.getByRole('region', { name: 'Actions for selected conversations' })).toHaveTextContent('Selected: 1');
});

test('a failed request leaves the selection and shows the reason', async () => {
    jest.spyOn(window, 'confirm').mockReturnValue(true);
    jest.mocked(applyBulkConversationDisposition).mockRejectedValue(new Error('Network down'));
    renderPage();
    await pick('Ticket question');

    fireEvent.click(screen.getByRole('button', { name: 'Move selected to spam' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Network down');
    expect(screen.getByRole('checkbox', { name: 'Select conversation — Ticket question' })).toBeChecked();
});
