import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { createReduxStore, ReduxStoreWithManager } from '@/app/providers/StoreProvider';
import AboutPage from './AboutPage';

jest.mock('@/shared/api/api', () => ({
    $api: { get: jest.fn() },
    $apiPrivate: { get: jest.fn() },
    injectStore: jest.fn(),
    csrfActions: { reset: jest.fn() },
}));

describe('AboutPage', () => {
    test('renders the page heading', () => {
        const store = createReduxStore() as ReduxStoreWithManager;
        render(
            <Provider store={store}>
                <MemoryRouter>
                    <AboutPage />
                </MemoryRouter>
            </Provider>,
        );
        expect(screen.getByText('About Page')).toBeInTheDocument();
    });
});
