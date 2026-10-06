import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { createReduxStore, ReduxStoreWithManager } from '@/app/providers/StoreProvider';
import LoginPage from './LoginPage';

jest.mock('@/shared/api/api', () => ({
    $api: { get: jest.fn(() => Promise.resolve({ data: { telegram: false } })), post: jest.fn() },
    $apiPrivate: { get: jest.fn() },
    injectStore: jest.fn(),
    csrfActions: { reset: jest.fn() },
}));

describe('LoginPage', () => {
    test('renders the brand copy and the login form', async () => {
        const store = createReduxStore() as ReduxStoreWithManager;
        render(
            <Provider store={store}>
                <MemoryRouter>
                    <LoginPage />
                </MemoryRouter>
            </Provider>,
        );

        // LoginForm is imported as its lazy/Suspense variant here (no Suspense
        // boundary wraps it in LoginPage itself — that's provided upstream by the
        // route), so the tree renders nothing until the dynamic import resolves.
        expect(await screen.findByText('Ритм школы под вашим контролем')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('name@company.com')).toBeInTheDocument();
    });
});
