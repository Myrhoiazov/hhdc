import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createReduxStore, ReduxStoreWithManager } from '@/app/providers/StoreProvider';
import { $api } from '@/shared/api/api';
import LoginForm from './LoginForm';

jest.mock('@/shared/api/api', () => ({
    $api: { post: jest.fn(), get: jest.fn(() => Promise.resolve({ data: { telegram: false } })) },
    $apiPrivate: { get: jest.fn() },
    injectStore: jest.fn(),
    csrfActions: { reset: jest.fn() },
}));

function renderLoginForm(onSuccess = jest.fn()) {
    const store = createReduxStore() as ReduxStoreWithManager;
    return {
        onSuccess,
        ...render(
            <Provider store={store}>
                <MemoryRouter>
                    <LoginForm onSuccess={onSuccess} />
                </MemoryRouter>
            </Provider>,
        ),
    };
}

beforeEach(() => {
    jest.clearAllMocks();
    window.turnstile = undefined;
    window.history.pushState({}, '', '/login');
});

describe('LoginForm', () => {
    test('renders the email and password fields', () => {
        renderLoginForm();
        expect(screen.getByPlaceholderText('name@company.com')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Введите пароль')).toBeInTheDocument();
    });

    test('calls onSuccess after a successful login', async () => {
        ($api.post as jest.Mock).mockResolvedValue({
            data: { id: '1', username: 'denis', email: 'd@example.com', role: 'ADMIN' },
        });
        const { onSuccess } = renderLoginForm();

        fireEvent.change(screen.getByPlaceholderText('name@company.com'), { target: { value: 'd@example.com' } });
        fireEvent.change(screen.getByPlaceholderText('Введите пароль'), { target: { value: 'secret' } });
        fireEvent.click(screen.getByRole('button', { name: 'Войти' }));

        await screen.findByRole('button', { name: 'Войти' });
        expect(onSuccess).toHaveBeenCalled();
    });

    test('switches to the two-factor step when a challenge is required', async () => {
        ($api.post as jest.Mock).mockResolvedValue({
            data: { requiresTwoFactor: true, maskedEmail: 'd***@example.com' },
        });
        renderLoginForm();

        fireEvent.change(screen.getByPlaceholderText('name@company.com'), { target: { value: 'd@example.com' } });
        fireEvent.change(screen.getByPlaceholderText('Введите пароль'), { target: { value: 'secret' } });
        fireEvent.click(screen.getByRole('button', { name: 'Войти' }));

        expect(await screen.findByText('Введите код подтверждения')).toBeInTheDocument();
    });

    test('surfaces a Telegram callback error from the ?telegramError query param', async () => {
        window.history.pushState({}, '', '/login?telegramError=TELEGRAM_NOT_LINKED');
        renderLoginForm();

        expect(await screen.findByText(/не подключён к HHDC Admin/)).toBeInTheDocument();
        // The query string is consumed once, not left for a refresh to re-trigger.
        expect(window.location.search).toBe('');
    });

    test('surfaces a distinct message for ?telegramError=USER_NOT_AUTHORIZED, not the generic fallback', async () => {
        window.history.pushState({}, '', '/login?telegramError=USER_NOT_AUTHORIZED');
        renderLoginForm();

        expect(await screen.findByText(/не может войти через Telegram/)).toBeInTheDocument();
    });

    test('switches to the two-factor step from a ?telegramStatus=two_factor redirect', async () => {
        window.history.pushState({}, '', '/login?telegramStatus=two_factor&maskedEmail=a%2A%2A%2A%40example.com');
        renderLoginForm();

        // Same assertion 'switches to the two-factor step when a challenge is
        // required' uses above — i18n interpolation isn't wired in this test
        // environment (see e.g. the unresolved "{{seconds}}" in the resend
        // button), so the masked email itself isn't independently assertable here.
        expect(await screen.findByText('Введите код подтверждения')).toBeInTheDocument();
    });

    test('shows an invalid-credentials message on a 401 response', async () => {
        const error = new Error('Unauthorized') as Error & { isAxiosError: boolean; response: { status: number } };
        error.isAxiosError = true;
        error.response = { status: 401 };
        ($api.post as jest.Mock).mockRejectedValue(error);
        renderLoginForm();

        fireEvent.change(screen.getByPlaceholderText('name@company.com'), { target: { value: 'd@example.com' } });
        fireEvent.change(screen.getByPlaceholderText('Введите пароль'), { target: { value: 'wrong' } });
        fireEvent.click(screen.getByRole('button', { name: 'Войти' }));

        expect(await screen.findByText('Вы ввели неверный логин или пароль')).toBeInTheDocument();
    });

    test('shows the captcha widget after a CAPTCHA_REQUIRED response and submits the token on retry', async () => {
        const renderMock = jest.fn().mockImplementation((_container, options) => {
            options.callback('captcha-token-abc');
            return 'widget-id';
        });
        window.turnstile = { render: renderMock, remove: jest.fn() };

        const error = new Error('captcha') as Error & { isAxiosError: boolean; response: { status: number; data: unknown } };
        error.isAxiosError = true;
        error.response = {
            status: 400,
            data: { code: 'CAPTCHA_REQUIRED', message: 'Подтвердите, что вы не робот', siteKey: 'site-key-xyz' },
        };
        ($api.post as jest.Mock).mockRejectedValueOnce(error);
        renderLoginForm();

        fireEvent.change(screen.getByPlaceholderText('name@company.com'), { target: { value: 'd@example.com' } });
        fireEvent.change(screen.getByPlaceholderText('Введите пароль'), { target: { value: 'wrong' } });
        fireEvent.click(screen.getByRole('button', { name: 'Войти' }));

        await waitFor(() => expect(renderMock).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
            sitekey: 'site-key-xyz',
        })));

        ($api.post as jest.Mock).mockResolvedValueOnce({
            data: { id: '1', username: 'denis', email: 'd@example.com', role: 'ADMIN' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Войти' }));

        await waitFor(() => expect($api.post).toHaveBeenLastCalledWith('/auth/login', expect.objectContaining({
            captchaToken: 'captcha-token-abc',
        })));
    });

    test('does not retry login without a fresh captcha token after Turnstile expires', async () => {
        let expiredCallback: (() => void) | undefined;
        const renderMock = jest.fn().mockImplementation((_container, options) => {
            options.callback('captcha-token-abc');
            expiredCallback = options['expired-callback'];
            return 'widget-id';
        });
        window.turnstile = { render: renderMock, remove: jest.fn() };

        const error = new Error('captcha') as Error & { isAxiosError: boolean; response: { status: number; data: unknown } };
        error.isAxiosError = true;
        error.response = {
            status: 400,
            data: { code: 'CAPTCHA_REQUIRED', message: 'Подтвердите, что вы не робот', siteKey: 'site-key-xyz' },
        };
        ($api.post as jest.Mock).mockRejectedValueOnce(error);
        renderLoginForm();

        fireEvent.change(screen.getByPlaceholderText('name@company.com'), { target: { value: 'd@example.com' } });
        fireEvent.change(screen.getByPlaceholderText('Введите пароль'), { target: { value: 'wrong' } });
        fireEvent.click(screen.getByRole('button', { name: 'Войти' }));

        await waitFor(() => expect(renderMock).toHaveBeenCalled());
        expiredCallback?.();
        fireEvent.click(screen.getByRole('button', { name: 'Войти' }));

        expect($api.post).toHaveBeenCalledTimes(1);
    });
});
