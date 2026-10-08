import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { composeEmail, listProviders } from '@/entities/crm';
import { onEmailSent } from '../../model/emailSent';
import { ComposeEmailModal } from './ComposeEmailModal';

jest.mock('@/entities/crm', () => ({ composeEmail: jest.fn(), listProviders: jest.fn() }));

const mailboxA = { id: 'mail-a', name: 'DDC NL', type: 'EMAIL', provider: 'IMAP', status: 'CONNECTED', settings: {} };
const mailboxB = { id: 'mail-b', name: 'Camp EU', type: 'EMAIL', provider: 'GMAIL', status: 'CONNECTED', settings: {} };
const disabled = { id: 'mail-c', name: 'Old box', type: 'EMAIL', provider: 'IMAP', status: 'DISABLED', settings: {} };
const aiProvider = { id: 'ai-1', name: 'Ollama', type: 'AI', provider: 'OLLAMA', status: 'CONNECTED', settings: {} };

const onClose = jest.fn();
const renderModal = () => render(<ComposeEmailModal isOpen onClose={onClose} />);

beforeEach(() => {
    onClose.mockReset();
    jest.mocked(listProviders).mockResolvedValue({ data: [mailboxA, mailboxB, disabled, aiProvider], total: 4 } as never);
    jest.mocked(composeEmail).mockReset();
    jest.mocked(composeEmail).mockResolvedValue(undefined);
});

const fillLetter = async (recipient: string) => {
    await screen.findByRole('option', { name: 'DDC NL' });
    fireEvent.change(screen.getByLabelText('To'), { target: { value: recipient } });
    fireEvent.change(screen.getByLabelText('Subject'), { target: { value: 'Camp details' } });
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Hello Anna' } });
};

test('only usable mailboxes are offered as the sender', async () => {
    renderModal();
    await screen.findByRole('option', { name: 'DDC NL' });
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['DDC NL', 'Camp EU']);
});

test('a new email is sent from the chosen mailbox, announced to listeners, and the modal closes', async () => {
    const listener = jest.fn();
    const stop = onEmailSent(listener);
    renderModal();

    await fillLetter(' anna@example.test ');
    fireEvent.change(screen.getByLabelText('Send from'), { target: { value: 'mail-b' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => expect(composeEmail).toHaveBeenCalledWith({
        providerConnectionId: 'mail-b', recipient: 'anna@example.test', subject: 'Camp details', content: 'Hello Anna',
    }, []));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(listener).toHaveBeenCalledTimes(1);
    stop();
});

test('a new email with an invalid recipient is not sent', async () => {
    renderModal();

    await fillLetter('anna');
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Enter a valid email address');
    expect(composeEmail).not.toHaveBeenCalled();
});

test('a failed delivery keeps the letter in the form and shows the reason', async () => {
    jest.mocked(composeEmail).mockRejectedValue(new Error('Provider did not confirm delivery'));
    renderModal();

    await fillLetter('anna@example.test');
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Provider did not confirm delivery');
    expect(screen.getByLabelText('Message')).toHaveValue('Hello Anna');
    expect(onClose).not.toHaveBeenCalled();
});

test('a new email carries the attached file, and a removed file is not sent', async () => {
    const price = new File(['pdf'], 'price.pdf', { type: 'application/pdf' });
    const draft = new File(['doc'], 'draft.docx');
    renderModal();

    await fillLetter('anna@example.test');
    fireEvent.change(screen.getByLabelText('Attach file'), { target: { files: [price, draft] } });
    fireEvent.click(await screen.findByRole('button', { name: 'Remove draft.docx' }));
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => expect(composeEmail).toHaveBeenCalledWith(expect.objectContaining({ recipient: 'anna@example.test' }), [price]));
});

test('without a connected mailbox the form says so and cannot send', async () => {
    jest.mocked(listProviders).mockResolvedValue({ data: [aiProvider], total: 1 } as never);
    renderModal();

    expect(await screen.findByText('Connect a mailbox in Settings to send email.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
});
