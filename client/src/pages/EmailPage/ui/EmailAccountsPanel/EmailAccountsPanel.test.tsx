import { fireEvent, render, screen } from '@testing-library/react';
import { EmailAccountsPanel } from './EmailAccountsPanel';
import { EmailAccount } from '@/entities/EmailAccount';

const accounts: EmailAccount[] = [
    {
        id: 1, label: 'info@ddc.nl', imapHost: 'mail.example.com', username: 'info', lastSyncedAt: null,
    } as EmailAccount,
];

function renderPanel(props: Partial<React.ComponentProps<typeof EmailAccountsPanel>> = {}) {
    const onSync = jest.fn();
    const onDelete = jest.fn();
    const onCreate = jest.fn().mockResolvedValue(undefined);
    return {
        onSync,
        onDelete,
        onCreate,
        ...render(
            <EmailAccountsPanel
                accounts={[]}
                onSync={onSync}
                onDelete={onDelete}
                onCreate={onCreate}
                {...props}
            />,
        ),
    };
}

describe('EmailAccountsPanel', () => {
    test('shows the empty state when there are no accounts', () => {
        renderPanel();

        expect(screen.getByText('Ящиков пока нет — добавьте первый выше.')).toBeInTheDocument();
    });

    test('renders connected accounts with their host and last sync info', () => {
        renderPanel({ accounts });

        expect(screen.getByText('info@ddc.nl')).toBeInTheDocument();
        expect(screen.getByText('mail.example.com')).toBeInTheDocument();
        expect(screen.getByText('ещё не синхронизировано')).toBeInTheDocument();
    });

    test('syncs an account when Sync is clicked', () => {
        const { onSync } = renderPanel({ accounts });

        fireEvent.click(screen.getByRole('button', { name: 'Sync' }));

        expect(onSync).toHaveBeenCalledWith(1);
    });

    test('deletes an account when the remove button is clicked', () => {
        const { onDelete } = renderPanel({ accounts });

        fireEvent.click(screen.getByRole('button', { name: 'Отключить ящик' }));

        expect(onDelete).toHaveBeenCalledWith(1);
    });

    test('shows the syncing state for the account currently syncing', () => {
        renderPanel({ accounts, syncingAccountId: 1 });

        expect(screen.getByRole('button', { name: 'Синхронизация...' })).toBeDisabled();
    });

    test('submits the new-account form and resets it on success', async () => {
        const { onCreate } = renderPanel();

        fireEvent.change(screen.getByPlaceholderText('info@ddc.nl'), { target: { value: 'Support' } });
        fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'support@ddc.nl' } });
        fireEvent.click(screen.getByRole('button', { name: 'Добавить аккаунт' }));

        expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({
            label: 'Support',
            username: 'support@ddc.nl',
        }));
        expect(await screen.findByPlaceholderText('info@ddc.nl')).toHaveValue('');
    });

    test('shows the returned error message when account creation fails', async () => {
        const onCreate = jest.fn().mockResolvedValue('IMAP unreachable');
        renderPanel({ onCreate });

        fireEvent.click(screen.getByRole('button', { name: 'Добавить аккаунт' }));

        expect(await screen.findByText('IMAP unreachable')).toBeInTheDocument();
    });
});
