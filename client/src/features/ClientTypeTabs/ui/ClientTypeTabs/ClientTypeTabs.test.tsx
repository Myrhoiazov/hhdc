import { render, screen } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import { $apiPrivate } from '@/shared/api/api';
import { ClientTypeTabs } from './ClientTypeTabs';

jest.mock('@/shared/api/api', () => ({
    $apiPrivate: { get: jest.fn() },
}));

beforeEach(() => {
    jest.clearAllMocks();
});

describe('ClientTypeTabs', () => {
    test('renders the "Все филиалы" tab before branches load', async () => {
        ($apiPrivate.get as jest.Mock).mockResolvedValue({ data: [] });
        render(<ClientTypeTabs value="all" onChangeType={() => {}} />);

        expect(screen.getByText('Все филиалы')).toBeInTheDocument();
        await screen.findByText('Все филиалы');
    });

    test('renders active branches once loaded, excluding inactive ones', async () => {
        ($apiPrivate.get as jest.Mock).mockResolvedValue({
            data: [
                { id: 1, name: 'Central', isActive: true },
                { id: 2, name: 'Closed', isActive: false },
            ],
        });

        render(<ClientTypeTabs value="all" onChangeType={() => {}} />);

        expect(await screen.findByText('Central')).toBeInTheDocument();
        expect(screen.queryByText('Closed')).not.toBeInTheDocument();
    });

    test('calls onChangeType with the branch id when a branch tab is clicked', async () => {
        ($apiPrivate.get as jest.Mock).mockResolvedValue({ data: [{ id: 1, name: 'Central', isActive: true }] });
        const onChangeType = jest.fn();

        render(<ClientTypeTabs value="all" onChangeType={onChangeType} />);

        fireEvent.click(await screen.findByText('Central'));

        expect(onChangeType).toHaveBeenCalledWith('1');
    });

    test('falls back to an empty branch list when the request fails', async () => {
        ($apiPrivate.get as jest.Mock).mockRejectedValue(new Error('network error'));

        render(<ClientTypeTabs value="all" onChangeType={() => {}} />);

        expect(await screen.findByText('Все филиалы')).toBeInTheDocument();
    });
});
