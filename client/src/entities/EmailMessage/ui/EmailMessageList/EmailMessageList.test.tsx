import { fireEvent, render, screen } from '@testing-library/react';
import { EmailMessageList } from './EmailMessageList';
import { EmailMessage } from '../../model/types/emailMessage';

function makeMessage(overrides: Partial<EmailMessage> = {}): EmailMessage {
    return {
        id: 1,
        mailboxId: 1,
        imapUid: null,
        messageId: null,
        inReplyToMessageId: null,
        isOutgoing: false,
        fromAddress: 'from@example.com',
        fromName: 'Ivan',
        toAddresses: [{ address: 'to@example.com' }],
        ccAddresses: null,
        subject: 'Hello',
        bodyText: 'Hi',
        bodyHtml: null,
        receivedAt: '2026-01-15T10:00:00.000Z',
        isRead: true,
        clientId: null,
        client: null,
        attachments: [],
        createdAt: '2026-01-15T10:00:00.000Z',
        ...overrides,
    };
}

describe('EmailMessageList', () => {
    test('shows a loading message', () => {
        render(<EmailMessageList messages={[]} isLoading onSelect={() => {}} />);
        expect(screen.getByText('Загрузка писем...')).toBeInTheDocument();
    });

    test('shows an empty state when there are no messages', () => {
        render(<EmailMessageList messages={[]} onSelect={() => {}} />);
        expect(screen.getByText('Писем пока нет. Нажмите Sync, чтобы получить входящие.')).toBeInTheDocument();
    });

    test('shows the sender name for incoming messages', () => {
        render(<EmailMessageList messages={[makeMessage()]} onSelect={() => {}} />);
        expect(screen.getByText('Ivan')).toBeInTheDocument();
    });

    test('shows "Вам: <recipient>" for outgoing messages', () => {
        render(<EmailMessageList messages={[makeMessage({ isOutgoing: true })]} onSelect={() => {}} />);
        expect(screen.getByText('Вам: to@example.com')).toBeInTheDocument();
    });

    test('falls back to "(без темы)" when there is no subject', () => {
        render(<EmailMessageList messages={[makeMessage({ subject: null })]} onSelect={() => {}} />);
        expect(screen.getByText('(без темы)')).toBeInTheDocument();
    });

    test('calls onSelect with the clicked message', () => {
        const onSelect = jest.fn();
        const message = makeMessage();
        render(<EmailMessageList messages={[message]} onSelect={onSelect} />);

        fireEvent.click(screen.getByText('Hello'));

        expect(onSelect).toHaveBeenCalledWith(message);
    });

    test('renders the linked client name as a badge', () => {
        render(
            <EmailMessageList
                messages={[makeMessage({ client: { id: 1, firstName: 'Petr', lastName: 'Ivanov', email: null } })]}
                onSelect={() => {}}
            />,
        );
        expect(screen.getByText('Petr Ivanov')).toBeInTheDocument();
    });
});
