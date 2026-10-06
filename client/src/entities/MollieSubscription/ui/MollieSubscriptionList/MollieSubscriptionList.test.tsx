import { render, screen } from '@testing-library/react';
import { MollieSubscriptionList } from './MollieSubscriptionList';
import { MollieSubscription } from '../..';

describe('MollieSubscriptionList', () => {
    test('shows an empty state when there are no subscriptions and it is not loading', () => {
        render(<MollieSubscriptionList subscriptions={[]} />);
        expect(screen.getByText('Подписки не найдены')).toBeInTheDocument();
    });

    test('renders a MollieSubscriptionItem for each subscription', () => {
        const subscriptions = [{ id: 'sub_1' }, { id: 'sub_2' }] as MollieSubscription[];
        render(<MollieSubscriptionList subscriptions={subscriptions} />);

        expect(screen.getByText('sub_1')).toBeInTheDocument();
        expect(screen.getByText('sub_2')).toBeInTheDocument();
    });

    test('renders a loading skeleton', () => {
        const { container } = render(<MollieSubscriptionList subscriptions={[]} isLoading />);
        expect(container.querySelectorAll('.Skeleton')).toHaveLength(4);
    });
});
