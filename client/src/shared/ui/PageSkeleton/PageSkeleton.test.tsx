import { render } from '@testing-library/react';
import { PageSkeleton } from './PageSkeleton';

describe('PageSkeleton', () => {
    test('renders 2 header skeletons plus a 6-row list skeleton', () => {
        const { container } = render(<PageSkeleton />);
        expect(container.querySelectorAll('.Skeleton')).toHaveLength(8);
    });
});
