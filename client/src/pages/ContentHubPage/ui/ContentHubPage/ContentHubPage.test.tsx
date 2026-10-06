import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { createReduxStore, ReduxStoreWithManager } from '@/app/providers/StoreProvider';
import ContentHubPage from './ContentHubPage';

jest.mock('@/shared/api/api', () => ({
    $api: { get: jest.fn() },
    $apiPrivate: { get: jest.fn() },
    injectStore: jest.fn(),
    csrfActions: { reset: jest.fn() },
}));

describe('ContentHubPage', () => {
    test('renders the page heading', () => {
        const store = createReduxStore() as ReduxStoreWithManager;
        render(
            <Provider store={store}>
                <MemoryRouter>
                    <ContentHubPage />
                </MemoryRouter>
            </Provider>,
        );
        expect(screen.getByText('ContentHub')).toBeInTheDocument();
    });
});
