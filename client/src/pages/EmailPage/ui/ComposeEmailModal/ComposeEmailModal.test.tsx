import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ComposeEmailModal } from './ComposeEmailModal';
import { EmailAccount } from '@/entities/EmailAccount';

jest.mock('@/entities/EmailMessage', () => ({
    EmailComposer: ({ onSend }: { onSend: (payload: { html: string; files?: File[] }) => void }) => (
        <button type="button" onClick={() => onSend({ html: '<p>Hi</p>' })}>send-composer</button>
    ),
}));

const accounts: EmailAccount[] = [
    { id: 1, label: 'info@ddc.nl', imapHost: 'mail.example.com', username: 'info', lastSyncedAt: null } as EmailAccount,
];

function renderModal(props: Partial<React.ComponentProps<typeof ComposeEmailModal>> = {}) {
    const onSend = jest.fn().mockResolvedValue(true);
    const onClose = jest.fn();
    return {
        onSend,
        onClose,
        ...render(
            <ComposeEmailModal
                isOpen
                accounts={accounts}
                onClose={onClose}
                onSend={onSend}
                {...props}
            />,
        ),
    };
}

describe('ComposeEmailModal', () => {
    test('renders the recipient and subject fields', () => {
        renderModal();

        expect(screen.getByPlaceholderText('client@example.com')).toBeInTheDocument();
    });

    test('shows an error and does not send when recipient or subject are empty', () => {
        const { onSend } = renderModal();

        fireEvent.click(screen.getByText('send-composer'));

        expect(onSend).not.toHaveBeenCalled();
        expect(screen.getByText('Заполните ящик-отправитель, получателя и тему письма')).toBeInTheDocument();
    });

    test('sends the composed email with the selected account, recipients and subject', async () => {
        const { onSend, onClose } = renderModal();

        fireEvent.change(screen.getByPlaceholderText('client@example.com'), { target: { value: 'a@example.com, b@example.com' } });
        fireEvent.change(screen.getAllByRole('textbox')[1], { target: { value: 'Hello' } });
        fireEvent.click(screen.getByText('send-composer'));

        expect(onSend).toHaveBeenCalledWith({
            accountId: 1,
            to: ['a@example.com', 'b@example.com'],
            subject: 'Hello',
            html: '<p>Hi</p>',
        });
        await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    });
});
