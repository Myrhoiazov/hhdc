import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { toast } from 'react-toastify';
import { createReduxStore, ReduxStoreWithManager } from '@/app/providers/StoreProvider';
import { $apiPrivate } from '@/shared/api/api';
import OrganizationBrandsPage from './OrganizationBrandsPage';

jest.mock('@/shared/api/api', () => ({
    $api: { get: jest.fn() },
    $apiPrivate: { get: jest.fn(), put: jest.fn(), post: jest.fn(), delete: jest.fn() },
    injectStore: jest.fn(),
    csrfActions: { reset: jest.fn() },
}));

jest.mock('react-toastify', () => ({
    toast: { success: jest.fn(), error: jest.fn() },
}));

beforeEach(() => {
    jest.clearAllMocks();
    ($apiPrivate.get as jest.Mock).mockImplementation((url: string) => {
        if (url === '/company/organization') return Promise.resolve({ data: { id: 1, legalName: 'DDC' } });
        if (url === '/company/brands') return Promise.resolve({ data: [{ id: 1, name: 'Main Brand', primaryColor: '#000', isDefault: true, isActive: true, organizationId: 1 }] });
        return Promise.resolve({ data: {} });
    });
});

function renderPage() {
    const store = createReduxStore() as ReduxStoreWithManager;
    return render(
        <Provider store={store}>
            <MemoryRouter>
                <OrganizationBrandsPage />
            </MemoryRouter>
        </Provider>,
    );
}

describe('OrganizationBrandsPage', () => {
    test('renders the loaded organization and brand list', async () => {
        renderPage();
        expect(await screen.findByDisplayValue('DDC')).toBeInTheDocument();
        expect(screen.getByText('Main Brand')).toBeInTheDocument();
    });

    test('saves the organization', async () => {
        ($apiPrivate.put as jest.Mock).mockResolvedValue({});
        renderPage();
        await screen.findByDisplayValue('DDC');

        fireEvent.click(screen.getByText('Сохранить реквизиты'));

        await waitFor(() => {
            expect($apiPrivate.put).toHaveBeenCalledWith('/company/organization', expect.objectContaining({ legalName: 'DDC' }));
        });
        expect(toast.success).toHaveBeenCalledWith('Реквизиты организации сохранены');
    });

    test('archives a brand after confirmation', async () => {
        ($apiPrivate.delete as jest.Mock).mockResolvedValue({});
        jest.spyOn(window, 'confirm').mockReturnValue(true);
        renderPage();
        await screen.findByText('Main Brand');

        fireEvent.click(screen.getByText('Архивировать'));

        await waitFor(() => expect($apiPrivate.delete).toHaveBeenCalledWith('/company/brands/1'));
    });

    test('does not save a new brand without a saved organization id', async () => {
        ($apiPrivate.get as jest.Mock).mockImplementation((url: string) => {
            if (url === '/company/organization') return Promise.resolve({ data: null });
            if (url === '/company/brands') return Promise.resolve({ data: [] });
            return Promise.resolve({ data: {} });
        });
        renderPage();
        await screen.findByText('Юридическая организация');

        fireEvent.click(screen.getByText('Сохранить бренд'));

        expect(toast.error).toHaveBeenCalledWith('Сначала сохраните организацию');
        expect($apiPrivate.post).not.toHaveBeenCalledWith('/company/brands', expect.anything());
    });
});
