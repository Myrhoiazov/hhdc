import { render, screen } from '@testing-library/react';
import MollieSubscriptionItem from './MollieSubscriptionItem';
import { MollieSubscription } from '../../model/types/MollieSubscription';

describe('MollieSubscriptionItem', () => {
    test('renders the id, description, amount, and interval', () => {
        const item = {
            id: 'sub_1',
            description: 'Monthly fee',
            amount: { value: '25.00', currency: 'EUR' },
            interval: '1 month',
        } as MollieSubscription;

        render(<MollieSubscriptionItem item={item} />);

        expect(screen.getByText('sub_1')).toBeInTheDocument();
        expect(screen.getByText('Monthly fee · 25.00 EUR · 1 month')).toBeInTheDocument();
    });

    test('shows "unknown" when there is no status', () => {
        render(<MollieSubscriptionItem item={{ id: 'sub_1' } as MollieSubscription} />);
        expect(screen.getByText('unknown')).toBeInTheDocument();
    });

    test('shows the given status', () => {
        render(<MollieSubscriptionItem item={{ id: 'sub_1', status: 'active' } as MollieSubscription} />);
        expect(screen.getByText('active')).toBeInTheDocument();
    });
});
