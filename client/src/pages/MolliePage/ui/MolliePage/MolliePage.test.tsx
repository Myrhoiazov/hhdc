import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { createReduxStore, ReduxStoreWithManager } from '@/app/providers/StoreProvider';
import MolliePage from './MolliePage';

jest.mock('@/shared/api/api', () => ({
    $api: { get: jest.fn() },
    $apiPrivate: { get: jest.fn() },
    injectStore: jest.fn(),
    csrfActions: { reset: jest.fn() },
}));

function renderPage(initialPath = '/mollie') {
    const store = createReduxStore() as ReduxStoreWithManager;
    return render(
        <Provider store={store}>
            <MemoryRouter initialEntries={[initialPath]}>
                <Routes>
                    <Route path="/mollie" element={<MolliePage />}>
                        <Route index element={<div>Main содержимое</div>} />
                        <Route path="customers" element={<div>Clients содержимое</div>} />
                    </Route>
                </Routes>
            </MemoryRouter>
        </Provider>,
    );
}

describe('MolliePage', () => {
    test('renders the dashboard title and tabs', () => {
        renderPage();

        expect(screen.getByText('Mollie Dashboard')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Main' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Clients' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Payments' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Матрица оплат' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Incidents' })).toBeInTheDocument();
    });

    test('renders the matched child route inside the outlet', async () => {
        renderPage('/mollie/customers');

        expect(await screen.findByText('Clients содержимое')).toBeInTheDocument();
    });
});
