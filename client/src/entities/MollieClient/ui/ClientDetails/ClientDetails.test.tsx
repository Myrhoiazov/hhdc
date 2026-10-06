import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { createReduxStore, ReduxStoreWithManager } from '@/app/providers/StoreProvider';
import { $apiPrivate } from '@/shared/api/api';
import { ClientDetails } from './ClientDetails';

jest.mock('@/shared/api/api', () => ({
    $api: { get: jest.fn() },
    $apiPrivate: { get: jest.fn() },
    injectStore: jest.fn(),
    csrfActions: { reset: jest.fn() },
}));

function renderClientDetails(id = '1') {
    const store = createReduxStore() as ReduxStoreWithManager;
    return render(
        <Provider store={store}>
            <MemoryRouter>
                <ClientDetails id={id} />
            </MemoryRouter>
        </Provider>,
    );
}

beforeEach(() => {
    jest.clearAllMocks();
});

describe('MollieClient ClientDetails', () => {
    test('renders the payer name once loaded', async () => {
        ($apiPrivate.get as jest.Mock).mockResolvedValue({
            data: { id: '1', givenName: 'Ivan', familyName: 'Petrov' },
        });

        renderClientDetails('1');

        expect(await screen.findByText('Ivan Petrov')).toBeInTheDocument();
        expect($apiPrivate.get).toHaveBeenCalledWith('/mollie/customers/1');
    });

    test('shows "Не привязан" when there are no linked students', async () => {
        ($apiPrivate.get as jest.Mock).mockResolvedValue({ data: { id: '1', givenName: 'Ivan' } });

        renderClientDetails('1');

        expect(await screen.findByText('Не привязан')).toBeInTheDocument();
    });

    test('shows an error message when loading fails', async () => {
        ($apiPrivate.get as jest.Mock).mockRejectedValue(new Error('network error'));

        renderClientDetails('1');

        expect(await screen.findByText('Клиента не существует')).toBeInTheDocument();
    });
});
