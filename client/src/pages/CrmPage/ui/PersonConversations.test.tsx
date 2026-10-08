import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Conversation, listConversations, markConversationRead, Person } from '@/entities/crm';
import { PersonConversations } from './PersonConversations';

jest.mock('@/entities/crm', () => ({
    listConversations: jest.fn(), markConversationRead: jest.fn(), listPrompts: jest.fn(() => Promise.resolve([])),
    listProviders: jest.fn(() => Promise.resolve({ data: [{ id: 'm1', name: 'Info', type: 'EMAIL', provider: 'IMAP', status: 'CONNECTED', settings: {} }], total: 1 })),
}));
jest.mock('@/features/composeEmail', () => ({
    ComposeEmailModal: ({ isOpen, recipient }: { isOpen: boolean; recipient?: string }) => (isOpen ? <div role="dialog">{`New email to ${recipient}`}</div> : null),
    onEmailSent: jest.fn(() => () => undefined),
}));
jest.mock('./email/ConversationDetail', () => ({
    ConversationDetail: ({ id, providers }: { id: string; providers: { name: string }[] }) => <div data-testid="thread">{`${id} via ${providers.map(provider => provider.name).join(',')}`}</div>,
}));

const person: Person = { id: 'person-1', firstName: 'Anna', lastName: 'Berg', email: 'anna@example.test', status: 'ACTIVE', roles: [] };
const thread = (id: string, overrides: Partial<Conversation> = {}): Conversation => ({
    id, subject: `Subject ${id}`, status: 'OPEN', lastMessageAt: '2026-10-05T10:00:00Z', unreadCount: 0,
    messages: [{ id: `m-${id}`, direction: 'INBOUND', sender: 'anna@example.test', recipient: 'info@example.test', bodyText: `Preview ${id}`, createdAt: '2026-10-05T10:00:00Z' }], ...overrides,
});

beforeEach(() => {
    jest.mocked(listConversations).mockReset();
    jest.mocked(markConversationRead).mockReset().mockResolvedValue(undefined);
});

test('the correspondence of the person is listed, and only theirs is asked for', async () => {
    jest.mocked(listConversations).mockResolvedValue({ data: [thread('c1', { unreadCount: 2 }), thread('c2')], total: 2 });
    render(<PersonConversations person={person} />);

    expect(await screen.findByRole('button', { name: /Subject c1/ })).toHaveTextContent('Preview c1');
    expect(screen.getByRole('button', { name: /Subject c2/ })).toBeInTheDocument();
    expect(listConversations).toHaveBeenCalledWith({ personId: 'person-1' }, 1, 50);
    expect(screen.queryByTestId('thread')).not.toBeInTheDocument();
});

test('a conversation opens in place with the mailboxes to answer from, is marked read, and closes again', async () => {
    jest.mocked(listConversations).mockResolvedValue({ data: [thread('c1', { unreadCount: 1 })], total: 1 });
    render(<PersonConversations person={person} />);

    fireEvent.click(await screen.findByRole('button', { name: /Subject c1/ }));
    await waitFor(() => expect(screen.getByTestId('thread')).toHaveTextContent('c1 via Info'));
    expect(markConversationRead).toHaveBeenCalledWith('c1');
    await waitFor(() => expect(listConversations).toHaveBeenCalledTimes(2));

    fireEvent.click(screen.getByRole('button', { name: 'Close the conversation' }));
    expect(screen.queryByTestId('thread')).not.toBeInTheDocument();
});

test('a new email starts with the address of the person filled in', async () => {
    jest.mocked(listConversations).mockResolvedValue({ data: [], total: 0 });
    render(<PersonConversations person={person} />);

    expect(await screen.findByText('No correspondence with this person yet')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Write an email' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('New email to anna@example.test');
});

test('a person without an address cannot be written to', async () => {
    jest.mocked(listConversations).mockResolvedValue({ data: [], total: 0 });
    render(<PersonConversations person={{ ...person, email: null }} />);

    expect(await screen.findByText('This person has no email address, so there is nobody to write to')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Write an email' })).toBeDisabled();
});
