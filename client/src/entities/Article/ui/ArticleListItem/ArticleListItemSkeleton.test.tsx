import { render } from '@testing-library/react';
import { ArticleListItemSkeleton } from './ArticleListItemSkeleton';
import { ArticleView } from '../../model/types/article';

describe('ArticleListItemSkeleton', () => {
    test('renders the BIG view skeleton with a header, title, image, and footer', () => {
        const { container } = render(<ArticleListItemSkeleton view={ArticleView.BIG} />);
        expect(container.querySelectorAll('.Skeleton')).toHaveLength(6);
    });

    test('renders the SMALL view skeleton', () => {
        const { container } = render(<ArticleListItemSkeleton view={ArticleView.SMALL} />);
        expect(container.querySelectorAll('.Skeleton')).toHaveLength(3);
    });
});
