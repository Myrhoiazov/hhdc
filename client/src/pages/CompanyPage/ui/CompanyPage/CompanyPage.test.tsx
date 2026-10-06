import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { createReduxStore, ReduxStoreWithManager } from '@/app/providers/StoreProvider';
import CompanyPage from './CompanyPage';

jest.mock('@/shared/api/api', () => ({
    $api: { get: jest.fn() },
    $apiPrivate: { get: jest.fn() },
    injectStore: jest.fn(),
    csrfActions: { reset: jest.fn() },
}));

function renderPage(initialPath = '/company') {
    const store = createReduxStore() as ReduxStoreWithManager;
    return render(
        <Provider store={store}>
            <MemoryRouter initialEntries={[initialPath]}>
                <Routes>
                    <Route path="/company" element={<CompanyPage />}>
                        <Route index element={<div>Главная содержимое</div>} />
                        <Route path="customers" element={<div>Клиенты содержимое</div>} />
                    </Route>
                </Routes>
            </MemoryRouter>
        </Provider>,
    );
}

describe('CompanyPage', () => {
    test('renders the section title and nav links', () => {
        renderPage();

        expect(screen.getByText('Компания')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Главная' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Клиенты' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Платежи' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Матрица оплат' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Инциденты' })).toBeInTheDocument();
    });

    test('marks the active nav link based on the current route', () => {
        renderPage('/company');

        expect(screen.getByRole('link', { name: 'Главная' })).toHaveClass('active');
        expect(screen.getByRole('link', { name: 'Клиенты' })).not.toHaveClass('active');
    });

    test('renders the matched child route inside the outlet', async () => {
        renderPage('/company/customers');

        expect(await screen.findByText('Клиенты содержимое')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Клиенты' })).toHaveClass('active');
    });
});
