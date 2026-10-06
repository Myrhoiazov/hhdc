import { render, screen } from '@testing-library/react';
import { $apiPrivate } from '@/shared/api/api';
import { MollieMain } from './MollieMain';

jest.mock('@/shared/api/api', () => ({
    $api: { get: jest.fn() },
    $apiPrivate: { get: jest.fn() },
    injectStore: jest.fn(),
    csrfActions: { reset: jest.fn() },
}));

const organization = {
    id: 'org_1',
    businessCategory: 'OTHER',
    categoryCode: 1234,
    countriesOfActivity: ['NL'],
    createdAt: '2026-01-01T00:00:00Z',
    description: 'Танцевальная школа',
    email: 'info@ddc.nl',
    mode: 'live' as const,
    name: 'Talent Center DDC',
    phone: '+31000000',
    status: 'verified',
};

beforeEach(() => {
    jest.clearAllMocks();
});

describe('MollieMain', () => {
    test('renders the organization profile once loaded', async () => {
        ($apiPrivate.get as jest.Mock).mockResolvedValue({ data: organization });

        render(<MollieMain />);

        expect(await screen.findByText('Talent Center DDC')).toBeInTheDocument();
        expect(screen.getByText('verified')).toBeInTheDocument();
        expect($apiPrivate.get).toHaveBeenCalledWith('/mollie/organizations');
    });

    test('shows an error state when the request fails', async () => {
        ($apiPrivate.get as jest.Mock).mockRejectedValue(new Error('network error'));

        render(<MollieMain />);

        expect(await screen.findByText('Не удалось загрузить компанию')).toBeInTheDocument();
    });
});
