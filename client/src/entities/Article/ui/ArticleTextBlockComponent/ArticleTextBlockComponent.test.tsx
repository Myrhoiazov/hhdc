import { render, screen } from '@testing-library/react';
import { ArticleTextBlockComponent } from './ArticleTextBlockComponent';
import { ArticleBlockType, ArticleTextBlock } from '../../model/types/article';

describe('ArticleTextBlockComponent', () => {
    test('renders the title and paragraphs', () => {
        const block: ArticleTextBlock = {
            id: '1',
            type: ArticleBlockType.TEXT,
            title: 'Block title',
            paragraphs: ['First paragraph', 'Second paragraph'],
        };
        render(<ArticleTextBlockComponent block={block} />);

        expect(screen.getByText('Block title')).toBeInTheDocument();
        expect(screen.getByText('First paragraph')).toBeInTheDocument();
        expect(screen.getByText('Second paragraph')).toBeInTheDocument();
    });

    test('renders without a title when none is given', () => {
        const block: ArticleTextBlock = { id: '1', type: ArticleBlockType.TEXT, paragraphs: ['Text'] };
        render(<ArticleTextBlockComponent block={block} />);

        expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    });
});
