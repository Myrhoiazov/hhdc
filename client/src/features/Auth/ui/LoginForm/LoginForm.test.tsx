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
