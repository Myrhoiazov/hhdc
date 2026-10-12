import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createReduxStore } from '@/app/providers/StoreProvider';
import { $api } from '@/shared/api/api';
import LoginForm from './LoginForm';

jest.mock('@/shared/api/api', () => ({ $api: {post: jest.fn()}, $apiPrivate: {}, injectStore: jest.fn(), csrfActions: {set: jest.fn(), reset: jest.fn()} }));
test('email login establishes the session and calls onSuccess', async () => {
    const onSuccess = jest.fn();
    ($api.post as jest.Mock).mockResolvedValue({data: {data: {user: {id: '1', name: 'Team', email: 'team@example.test', roles: ['OWNER'], permissions: []}, csrfToken: 'test-csrf'}}});
    const store = createReduxStore();
    render(<Provider store={store}><MemoryRouter><LoginForm onSuccess={onSuccess} /></MemoryRouter></Provider>);
    fireEvent.change(screen.getByPlaceholderText('name@company.com'), {target: {value: 'team@example.test'}});
    fireEvent.change(screen.getByPlaceholderText('Введите пароль'), {target: {value: 'test-password'}});
    fireEvent.click(screen.getByRole('button', {name: 'Войти'}));
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(store.getState().user.authData?.roles).toEqual(['OWNER']);
});

const renderLoginForm = () => render(<Provider store={createReduxStore()}><MemoryRouter><LoginForm /></MemoryRouter></Provider>);
const submitCredentials = (password: string) => {
    fireEvent.change(screen.getByPlaceholderText('name@company.com'), {target: {value: 'team@example.test'}});
    fireEvent.change(screen.getByPlaceholderText('Введите пароль'), {target: {value: password}});
    fireEvent.click(screen.getByRole('button', {name: 'Войти'}));
};
const captchaRefusal = () => Object.assign(new Error('captcha'), { isAxiosError: true, response: { status: 400, data: { error: { code: 'CAPTCHA_REQUIRED', message: 'Confirm that you are not a robot', siteKey: 'site-key-xyz' } } } });

test('switches to the two-factor step when a challenge is required', async () => {
    ($api.post as jest.Mock).mockResolvedValue({data: {data: {requiresTwoFactor: true, maskedEmail: 't***@example.test'}}});
    renderLoginForm();
    submitCredentials('test-password');
    expect(await screen.findByText('Введите код подтверждения')).toBeInTheDocument();
});

test('shows the captcha widget after a CAPTCHA_REQUIRED response and submits the token on retry', async () => {
    const renderMock = jest.fn().mockImplementation((_container, options) => {
        options.callback('captcha-token-abc');
        return 'widget-id';
    });
    window.turnstile = { render: renderMock, remove: jest.fn() };
    ($api.post as jest.Mock).mockReset().mockRejectedValueOnce(captchaRefusal());
    renderLoginForm();
    submitCredentials('wrong');

    await waitFor(() => expect(renderMock).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ sitekey: 'site-key-xyz' })));

    ($api.post as jest.Mock).mockResolvedValueOnce({data: {data: {requiresTwoFactor: true, maskedEmail: 't***@example.test'}}});
    fireEvent.click(screen.getByRole('button', {name: 'Войти'}));

    await waitFor(() => expect($api.post).toHaveBeenLastCalledWith('/auth/login', expect.objectContaining({ captchaToken: 'captcha-token-abc' })));
});

test('does not retry login without a fresh captcha token after Turnstile expires', async () => {
    let expiredCallback: (() => void) | undefined;
    const renderMock = jest.fn().mockImplementation((_container, options) => {
        options.callback('captcha-token-abc');
        expiredCallback = options['expired-callback'];
        return 'widget-id';
    });
    window.turnstile = { render: renderMock, remove: jest.fn() };
    ($api.post as jest.Mock).mockReset().mockRejectedValueOnce(captchaRefusal());
    renderLoginForm();
    submitCredentials('wrong');

    await waitFor(() => expect(renderMock).toHaveBeenCalled());
    expiredCallback?.();
    fireEvent.click(screen.getByRole('button', {name: 'Войти'}));

    expect($api.post).toHaveBeenCalledTimes(1);
});
