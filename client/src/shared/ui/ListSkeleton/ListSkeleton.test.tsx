import { render } from '@testing-library/react';
import { ListSkeleton } from './ListSkeleton';

describe('ListSkeleton', () => {
    test('renders 4 rows by default', () => {
        const { container } = render(<ListSkeleton />);
        expect(container.querySelectorAll('.Skeleton')).toHaveLength(4);
    });

    test('renders the given number of rows', () => {
        const { container } = render(<ListSkeleton rows={7} />);
        expect(container.querySelectorAll('.Skeleton')).toHaveLength(7);
    });
});
