import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { createReduxStore, ReduxStoreWithManager } from '@/app/providers/StoreProvider';
import { MollieClientAction } from './MollieClientAction';

jest.mock('@/shared/api/api', () => ({
    $api: { get: jest.fn() },
    $apiPrivate: { get: jest.fn(), post: jest.fn() },
    injectStore: jest.fn(),
    csrfActions: { reset: jest.fn() },
}));

function renderAction() {
    const store = createReduxStore() as ReduxStoreWithManager;
    return render(
        <Provider store={store}>
            <MemoryRouter>
                <MollieClientAction />
            </MemoryRouter>
        </Provider>,
    );
}

describe('MollieClientAction', () => {
    test('renders the add-client button', () => {
        renderAction();
        expect(screen.getByRole('button', { name: /Добавить клиента/ })).toBeInTheDocument();
    });

    test('opens the add-client modal when the button is clicked', async () => {
        renderAction();
        fireEvent.click(screen.getByRole('button', { name: /Добавить клиента/ }));

        expect(await screen.findByText('Добавление нового клиента')).toBeInTheDocument();
    });
});
