import { Provider } from 'react-redux';
import { fireEvent, render, screen } from '@testing-library/react';
import { createReduxStore, ReduxStoreWithManager } from '@/app/providers/StoreProvider';
import { $api } from '@/shared/api/api';
import { TwoFactorForm } from './TwoFactorForm';

jest.mock('@/shared/api/api', () => ({
    $api: { post: jest.fn() },
    $apiPrivate: { get: jest.fn() },
    injectStore: jest.fn(),
    csrfActions: { reset: jest.fn() },
}));

function renderForm(props: Partial<React.ComponentProps<typeof TwoFactorForm>> = {}) {
    const store = createReduxStore() as ReduxStoreWithManager;
    const onSuccess = jest.fn();
    const onBack = jest.fn();
    return {
        onSuccess,
        onBack,
        ...render(
            <Provider store={store}>
                <TwoFactorForm maskedEmail="d***@example.com" onSuccess={onSuccess} onBack={onBack} {...props} />
            </Provider>,
        ),
    };
}

beforeEach(() => {
    jest.clearAllMocks();
});

describe('TwoFactorForm', () => {
    test('shows the masked email', () => {
        // the i18next mock returns the raw, un-interpolated key
        renderForm();
        expect(screen.getByText('Мы отправили код на {{email}}')).toBeInTheDocument();
    });

    test('disables submit until 6 digits are entered', () => {
        renderForm();
        const submit = screen.getByRole('button', { name: 'Подтвердить' });
        expect(submit).toBeDisabled();

        fireEvent.change(screen.getByPlaceholderText('000000'), { target: { value: '123456' } });
        expect(submit).toBeEnabled();
    });

    test('strips non-digit characters and truncates to 6', () => {
        renderForm();
        const input = screen.getByPlaceholderText('000000');

        fireEvent.change(input, { target: { value: 'a1b2c3d4e5f6' } });

        expect(input).toHaveValue('123456');
    });

    test('calls onSuccess after a successful verification', async () => {
        ($api.post as jest.Mock).mockResolvedValue({
            data: { id: '1', username: 'denis', email: 'd@example.com', role: 'ADMIN' },
        });
        const { onSuccess } = renderForm();

        fireEvent.change(screen.getByPlaceholderText('000000'), { target: { value: '123456' } });
        fireEvent.click(screen.getByRole('button', { name: 'Подтвердить' }));

        await screen.findByRole('button', { name: 'Подтвердить' });
        expect(onSuccess).toHaveBeenCalled();
    });

    test('shows an error message when verification fails', async () => {
        const error = new Error('Invalid') as Error & { isAxiosError: boolean; response: { status: number; data: { message: string } } };
        error.isAxiosError = true;
        error.response = { status: 400, data: { message: 'Invalid code' } };
        ($api.post as jest.Mock).mockRejectedValue(error);
        renderForm();

        fireEvent.change(screen.getByPlaceholderText('000000'), { target: { value: '123456' } });
        fireEvent.click(screen.getByRole('button', { name: 'Подтвердить' }));

        expect(await screen.findByText('Invalid code')).toBeInTheDocument();
    });

    test('calls onBack when "Назад" is clicked', () => {
        const { onBack } = renderForm();
        fireEvent.click(screen.getByRole('button', { name: 'Назад' }));
        expect(onBack).toHaveBeenCalledTimes(1);
    });

    test('the resend button starts disabled during the cooldown', () => {
        renderForm();
        expect(screen.getByRole('button', { name: /Отправить код повторно через/ })).toBeDisabled();
    });
});
