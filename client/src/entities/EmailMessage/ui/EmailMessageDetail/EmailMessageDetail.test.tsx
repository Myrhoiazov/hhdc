import { fireEvent, render, screen } from '@testing-library/react';
import { EmailMessageDetail } from './EmailMessageDetail';
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
        bodyText: 'Hi there',
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

test('EmailMessageDetail renders the subject and plain-text body', async () => {
    render(<EmailMessageDetail message={makeMessage()} onReply={jest.fn()} onDelete={jest.fn()} onMarkAsSpam={jest.fn()} />);

    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('Hi there')).toBeInTheDocument();
});

test('EmailMessageDetail falls back to "(пустое письмо)" when there is no body', () => {
    render(<EmailMessageDetail message={makeMessage({ bodyText: null })} onReply={jest.fn()} onDelete={jest.fn()} onMarkAsSpam={jest.fn()} />);
    expect(screen.getByText('(пустое письмо)')).toBeInTheDocument();
});

test('EmailMessageDetail hides the "spam" action for outgoing messages', () => {
    render(<EmailMessageDetail message={makeMessage({ isOutgoing: true })} onReply={jest.fn()} onDelete={jest.fn()} onMarkAsSpam={jest.fn()} />);
    expect(screen.queryByRole('button', { name: 'В спам' })).not.toBeInTheDocument();
});

test('EmailMessageDetail calls onDelete after the user confirms', () => {
    const onDelete = jest.fn();
    jest.spyOn(window, 'confirm').mockReturnValue(true);
    render(<EmailMessageDetail message={makeMessage()} onReply={jest.fn()} onDelete={onDelete} onMarkAsSpam={jest.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Удалить' }));

    expect(onDelete).toHaveBeenCalledTimes(1);
});

test('EmailMessageDetail does not call onDelete when the user cancels the confirmation', () => {
    const onDelete = jest.fn();
    jest.spyOn(window, 'confirm').mockReturnValue(false);
    render(<EmailMessageDetail message={makeMessage()} onReply={jest.fn()} onDelete={onDelete} onMarkAsSpam={jest.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Удалить' }));

    expect(onDelete).not.toHaveBeenCalled();
});

test('EmailMessageDetail calls onMarkAsSpam after the user confirms', () => {
    const onMarkAsSpam = jest.fn();
    jest.spyOn(window, 'confirm').mockReturnValue(true);
    render(<EmailMessageDetail message={makeMessage()} onReply={jest.fn()} onDelete={jest.fn()} onMarkAsSpam={onMarkAsSpam} />);

    fireEvent.click(screen.getByRole('button', { name: 'В спам' }));

    expect(onMarkAsSpam).toHaveBeenCalledTimes(1);
});

test('EmailMessageDetail renders the reply composer', async () => {
    render(<EmailMessageDetail message={makeMessage()} onReply={jest.fn()} onDelete={jest.fn()} onMarkAsSpam={jest.fn()} />);
    expect(await screen.findByRole('button', { name: 'Отправить' })).toBeInTheDocument();
});

test('EmailMessageDetail renders attachment links with formatted size', () => {
    render(
        <EmailMessageDetail
            message={makeMessage({ attachments: [{ id: 1, filename: 'doc.pdf', mimeType: 'application/pdf', sizeBytes: 2048 }] })}
            onReply={jest.fn()}
            onDelete={jest.fn()}
            onMarkAsSpam={jest.fn()}
        />,
    );

    expect(screen.getByText('doc.pdf')).toBeInTheDocument();
    expect(screen.getByText('2.0 КБ')).toBeInTheDocument();
});

test('EmailMessageDetail addresses the reply to the Reply-To of a contact-form email', () => {
    render(<EmailMessageDetail message={makeMessage({ fromAddress: 'wordpress@site.example', replyToAddress: 'parent@example.com' })} onReply={jest.fn()} onDelete={jest.fn()} onMarkAsSpam={jest.fn()} />);
    expect(screen.getByText('Кому: parent@example.com')).toBeInTheDocument();
});

test('EmailMessageDetail addresses the reply to From when there is no Reply-To', () => {
    render(<EmailMessageDetail message={makeMessage({ replyToAddress: null })} onReply={jest.fn()} onDelete={jest.fn()} onMarkAsSpam={jest.fn()} />);
    expect(screen.getByText('Кому: from@example.com')).toBeInTheDocument();
});
