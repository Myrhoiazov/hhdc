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

describe('ClientDetails', () => {
    test('renders the client name once loaded', async () => {
        ($apiPrivate.get as jest.Mock).mockResolvedValue({
            data: { id: '1', firstName: 'Ivan', lastName: 'Petrov' },
        });

        renderClientDetails('1');

        expect(await screen.findByText('Имя и Фамилия:')).toBeInTheDocument();
        expect(await screen.findByText('Ivan Petrov')).toBeInTheDocument();
        expect($apiPrivate.get).toHaveBeenCalledWith('/clients/1');
    });

    test('shows an error message when loading fails', async () => {
        ($apiPrivate.get as jest.Mock).mockRejectedValue(new Error('network error'));

        renderClientDetails('1');

        expect(await screen.findByText('Клиента не существует')).toBeInTheDocument();
    });
});
